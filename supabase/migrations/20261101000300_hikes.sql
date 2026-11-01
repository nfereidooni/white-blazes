-- Hikes and the stretches of main trail each one covered.
--
-- Two tables, because a hike and its coverage are different things:
--   hikes          what you did: date, name, distance walked, where it came from
--   hike_segments  which kilometres of white-blazed main trail it covered
--
-- Progress ("69.6 of 122.5 km") is never stored. It's computed from
-- hike_segments by merging overlapping ranges (stage 5), so hiking the same
-- stretch twice never counts twice.

create type public.hike_source as enum ('strava', 'gpx', 'manual', 'club_export');

-- 'main' = white blazes, counts toward end to ends. 'side' = blue blazes.
create type public.trail_type as enum ('main', 'side');

create table public.hikes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  hiked_on      date not null,
  name          text not null check (char_length(name) between 1 and 200),

  -- The section the hike is filed under. Null means "needs placing":
  -- e.g. a club export row with no location data yet.
  section_id    smallint references public.sections (id),

  is_club_hike  boolean not null default false,
  trail         public.trail_type not null default 'main',

  -- Full track distance. Null when unknown (many club export rows).
  walked_km     numeric(6, 2) check (walked_km >= 0),

  source        public.hike_source not null,
  -- The id the source gave this hike (Strava activity id, club export id,
  -- GPX file hash). Lets a re-upload skip hikes we already have.
  external_id   text,

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Idempotency: the same Strava activity can't be imported twice for one person.
  -- Rows with a null external_id (manual hikes) never collide, because
  -- Postgres treats nulls as distinct in unique constraints.
  constraint hikes_unique_source_id unique (user_id, source, external_id)
);

comment on table public.hikes is 'One row per hike a person logs.';
comment on column public.hikes.section_id is 'Null = needs placing.';

-- Most screens ask "this person's hikes, newest first".
create index hikes_user_date_idx on public.hikes (user_id, hiked_on desc);

create trigger hikes_set_updated_at
  before update on public.hikes
  for each row execute function public.set_updated_at();


create table public.hike_segments (
  id          bigint generated always as identity primary key,
  hike_id     uuid not null references public.hikes (id) on delete cascade,
  section_id  smallint not null references public.sections (id),

  -- Kilometres along the section, measured from its south end.
  -- '[15.1,27.6)' = from km 15.1 up to km 27.6 of that section.
  km          numrange not null check (not isempty(km) and lower(km) >= 0)
);

comment on table public.hike_segments is
  'Stretches of main trail a hike covered, as km ranges within a section.';

create index hike_segments_hike_idx on public.hike_segments (hike_id);
create index hike_segments_section_idx on public.hike_segments (section_id);

-- A segment can't run past the end of its section. A check constraint can't
-- look at another table, so a trigger does it.
create function public.check_segment_within_section()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  section_length numeric;
begin
  select length_km into section_length
  from public.sections where id = new.section_id;

  if upper(new.km) > section_length then
    raise exception 'Segment % runs past the end of section % (% km)',
      new.km, new.section_id, section_length;
  end if;
  return new;
end;
$$;

create trigger hike_segments_within_section
  before insert or update on public.hike_segments
  for each row execute function public.check_segment_within_section();

alter table public.hikes enable row level security;
alter table public.hike_segments enable row level security;
