-- Stage 4b: turn a GPS track into km ranges, and import it in one transaction.
--
-- The track itself is never stored. The browser reads the GPX file, sends
-- the points here, and only the hike and its km ranges are kept.

-- 1. Metres, not degrees ---------------------------------------------------------
--
-- Latitude/longitude (SRID 4326) is great for storing locations but awkward
-- for measuring: a degree of longitude is shorter than a degree of latitude.
-- UTM zone 17N (SRID 32617) is a flat projection in metres that covers the
-- whole Bruce Trail, so distances and "how far along" come out true.
-- A generated column keeps a metre copy of each line in sync automatically.
alter table public.section_lines
  add column geom_m extensions.geometry(LineString, 32617)
    generated always as (extensions.st_transform(geom, 32617)) stored;

create index section_lines_geom_m_idx on public.section_lines using gist (geom_m);

-- locate_on_trail now measures in metres too, so its km match match_track's.
create or replace function public.locate_on_trail(lat double precision, lon double precision)
returns table (section_id smallint, km numeric, distance_m numeric)
language sql
stable
set search_path = ''
as $$
  with pt as (
    select extensions.st_transform(extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326), 32617) as g
  )
  select
    l.section_id,
    round((extensions.st_linelocatepoint(l.geom_m, pt.g) * s.length_km)::numeric, 2),
    round(extensions.st_distance(l.geom_m, pt.g)::numeric, 0)
  from public.section_lines l
  join public.sections s on s.id = l.section_id
  cross join pt
  order by l.geom_m operator(extensions.<->) pt.g
  limit 1;
$$;


-- 2. Match a track to the trail -----------------------------------------------------
--
-- Walk along each section line in 25 m steps and ask, for every step:
-- did the track pass within 50 m of here? Unbroken runs of "yes" become km
-- ranges. Working from the trail's side (not the track's) means a trail
-- that bends back close to itself can't confuse which stretch was hiked.
--
-- Points more than 1 km apart (a paused recording, a drive between
-- trailheads) aren't joined, so the track never "jumps" across the trail.
create function public.match_track(lats double precision[], lons double precision[])
returns table (section_id smallint, km_from numeric, km_to numeric)
language sql
stable
set search_path = ''
as $$
  with pts as (
    select t.ord,
           extensions.st_transform(extensions.st_setsrid(extensions.st_makepoint(t.lon, t.lat), 4326), 32617) as g
    from unnest(lats, lons) with ordinality as t(lat, lon, ord)
  ),
  jumps as (
    select ord, g,
           case when extensions.st_distance(g, lag(g) over (order by ord)) > 1000 then 1 else 0 end as jump
    from pts
  ),
  parts as (
    select ord, g, sum(jump) over (order by ord) as part from jumps
  ),
  track as (
    -- One line per unbroken part, collected into a single geometry.
    select extensions.st_collect(line) as g
    from (
      select extensions.st_makeline(array_agg(g order by ord)) as line
      from parts group by part having count(*) > 1
    ) x
  ),
  steps as (
    -- Only sections the track comes near, sampled every 25 m.
    select l.section_id, s.length_km, l.geom_m,
           greatest(1, ceil(extensions.st_length(l.geom_m) / 25))::int as n
    from public.section_lines l
    join public.sections s on s.id = l.section_id
    cross join track
    where extensions.st_dwithin(l.geom_m, track.g, 50)
  ),
  samples as (
    select st.section_id, st.length_km, st.n, i,
           extensions.st_lineinterpolatepoint(st.geom_m, i::double precision / st.n) as p
    from steps st, generate_series(0, st.n) as i
  ),
  covered as (
    select sm.section_id, sm.length_km, sm.n, sm.i
    from samples sm, track
    where sm.p operator(extensions.&&) extensions.st_expand(track.g, 50)  -- cheap box check first
      and extensions.st_dwithin(sm.p, track.g, 50)
  ),
  runs as (
    -- Consecutive step numbers share the same (i - row_number), which groups each run.
    select *, i - row_number() over (partition by section_id order by i) as grp
    from covered
  )
  select section_id::smallint,
         round(min(i)::numeric / max(n) * max(length_km), 2),
         round(max(i)::numeric / max(n) * max(length_km), 2)
  from runs
  group by section_id, grp
  having max(i) - min(i) >= 3   -- at least 75 m: crossing the trail isn't hiking it
  order by 1, 2;
$$;

grant execute on function public.match_track(double precision[], double precision[]) to authenticated;


-- 3. Import a track ----------------------------------------------------------------
--
-- Everything inside a function runs in one transaction: if any insert
-- fails, every change in the call is rolled back. Unlike Stage 3's form,
-- which needed a manual undo, there's no half-saved hike.
--
-- It runs as the caller (no security definer), so RLS applies to every
-- insert and delete: you can only add hikes for yourself and only replace
-- your own.
create function public.import_track(
  p_name          text,
  p_hiked_on      date,
  p_walked_km     numeric,
  p_is_club_hike  boolean,
  p_source        public.hike_source,
  p_external_id   text,
  lats            double precision[],
  lons            double precision[],
  p_replace_hike  uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_hike_id   uuid;
  v_section   smallint;
  v_matched   jsonb;
  v_has_main  boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to import hikes.';
  end if;

  -- Match once and keep the result in a variable for the steps below.
  select coalesce(jsonb_agg(m), '[]'::jsonb) into v_matched
  from public.match_track(lats, lons) m;

  v_has_main := jsonb_array_length(v_matched) > 0;

  -- File the hike under its first main-trail section, or else the section
  -- nearest its first point.
  select coalesce(
    (v_matched -> 0 ->> 'section_id')::smallint,
    (select section_id from public.locate_on_trail(lats[1], lons[1]))
  ) into v_section;

  if p_replace_hike is not null then
    delete from public.hikes where id = p_replace_hike;  -- RLS: only your own
    if not found then
      raise exception 'The hike to replace was not found.';
    end if;
  end if;

  insert into public.hikes (user_id, hiked_on, name, section_id, is_club_hike, trail, walked_km, source, external_id)
  values ((select auth.uid()), p_hiked_on, p_name, v_section, p_is_club_hike,
          case when v_has_main then 'main' else 'side' end::public.trail_type,
          p_walked_km, p_source, p_external_id)
  returning id into v_hike_id;

  insert into public.hike_segments (hike_id, section_id, km)
  select v_hike_id, m.section_id, numrange(m.km_from, m.km_to)
  from jsonb_to_recordset(v_matched) as m(section_id smallint, km_from numeric, km_to numeric);

  return v_hike_id;
end;
$$;

grant execute on function public.import_track(text, date, numeric, boolean, public.hike_source, text, double precision[], double precision[], uuid) to authenticated;
