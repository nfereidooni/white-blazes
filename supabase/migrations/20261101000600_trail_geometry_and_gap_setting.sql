-- Stage 4a: the trail itself, and a per-person rule for small gaps.

-- 1. PostGIS -----------------------------------------------------------------------
--
-- PostGIS adds geometry types and spatial functions to Postgres. Supabase
-- installs extensions into the `extensions` schema, so names are written
-- extensions.st_... below.
create extension if not exists postgis with schema extensions;


-- 2. One line per section ---------------------------------------------------------
--
-- The trail comes from OpenStreetMap (route relation 5583286), split into the
-- nine club sections. The actual coordinates are loaded by the next migration.
-- OSM data is ODbL licensed: the app must credit "© OpenStreetMap contributors".
create table public.section_lines (
  section_id smallint primary key references public.sections (id),
  geom       extensions.geometry(LineString, 4326) not null
);

comment on table public.section_lines is
  'Bruce Trail main route per section, south to north. © OpenStreetMap contributors, ODbL.';

-- A spatial index lets "which line is nearest this point?" skip most of the trail.
create index section_lines_geom_idx on public.section_lines using gist (geom);

alter table public.section_lines enable row level security;
create policy "Trail lines are readable by everyone"
  on public.section_lines for select
  to anon, authenticated
  using (true);


-- 3. Point to km ------------------------------------------------------------------
--
-- Given a latitude and longitude, find the nearest section line and how far
-- along it the point is. st_linelocatepoint returns a fraction from 0 (south
-- end) to 1 (north end); multiplying by the section's official length turns
-- it into guidebook-style km. distance_m says how far off the trail the point
-- was, so the app can reject a typo that lands in Lake Huron.
create function public.locate_on_trail(lat double precision, lon double precision)
returns table (section_id smallint, km numeric, distance_m numeric)
language sql
stable
set search_path = ''
as $$
  with pt as (
    select extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326) as g
  )
  select
    l.section_id,
    round((extensions.st_linelocatepoint(l.geom, pt.g) * s.length_km)::numeric, 2),
    round(extensions.st_distance(l.geom::extensions.geography, pt.g::extensions.geography)::numeric, 0)
  from public.section_lines l
  join public.sections s on s.id = l.section_id
  cross join pt
  order by l.geom operator(extensions.<->) pt.g
  limit 1;
$$;

grant execute on function public.locate_on_trail(double precision, double precision) to anon, authenticated;


-- 4. Gap setting ------------------------------------------------------------------
--
-- GPS tracks drop out, and people step around fallen trees. Each person picks
-- how big a break between two covered stretches still counts as hiked.
-- Segments always store exactly what was hiked; the rule is applied only when
-- progress is calculated, so changing it recalculates everything instantly.
alter table public.profiles
  add column gap_fill_m smallint not null default 300
    check (gap_fill_m in (0, 100, 300));

-- Close gaps of up to gap_km between ranges. The trick: stretch every range's
-- end by gap_km, let range_agg merge whatever now touches, then pull each
-- merged range's end back by the same amount.
create function public.close_gaps(covered nummultirange, gap_km numeric)
returns nummultirange
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select range_agg(numrange(lower(m), upper(m) - gap_km))
     from unnest(
       (select range_agg(numrange(lower(r), upper(r) + gap_km)) from unnest(covered) as r)
     ) as m),
    '{}'::nummultirange
  );
$$;

-- Progress now applies each person's own gap rule.
create or replace view public.section_progress
with (security_invoker = true)
as
with merged as (
  select h.user_id, g.section_id, range_agg(g.km) as covered
  from public.hike_segments g
  join public.hikes h on h.id = g.hike_id
  group by h.user_id, g.section_id
),
closed as (
  select m.user_id, m.section_id, public.close_gaps(m.covered, p.gap_fill_m / 1000.0) as covered
  from merged m
  join public.profiles p on p.id = m.user_id
)
select
  c.user_id,
  c.section_id,
  c.covered,
  (select round(sum(upper(r) - lower(r)), 1) from unnest(c.covered) as r) as done_km
from closed c;

-- Share pages follow the owner's gap rule too.
create or replace function public.shared_progress(slug text)
returns table (
  display_name text,
  section_id   smallint,
  section_name text,
  length_km    numeric,
  done_km      numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select p.id, p.display_name, p.gap_fill_m
    from public.profiles p
    where p.share_slug = slug and p.share_enabled
  ),
  merged as (
    select g.section_id,
           public.close_gaps(range_agg(g.km), (select gap_fill_m from owner) / 1000.0) as covered
    from public.hike_segments g
    join public.hikes h on h.id = g.hike_id
    where h.user_id = (select id from owner)
    group by g.section_id
  )
  select
    o.display_name,
    s.id,
    s.name,
    s.length_km,
    coalesce((select round(sum(upper(r) - lower(r)), 1) from unnest(m.covered) as r), 0)
  from owner o
  cross join public.sections s
  left join merged m on m.section_id = s.id
  order by s.id;
$$;
