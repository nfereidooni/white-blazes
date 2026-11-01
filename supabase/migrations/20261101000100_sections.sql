-- Sections: the nine club sections of the Bruce Trail, Queenston to Tobermory.
--
-- This is reference data. The app can't work without it, so the rows live
-- in the migration itself, not in seed.sql (seed.sql only runs locally).

create table public.sections (
  id             smallint primary key,            -- trail order, 1 (Niagara) to 9 (Peninsula)
  slug           text not null unique,            -- stable key used by the frontend, e.g. 'iroquoia'
  name           text not null,
  length_km      numeric(5, 1) not null check (length_km > 0),
  badge_subject  text not null,                   -- what the app's original badge illustration shows
  club_badge_url text not null                    -- where badges are actually ordered
);

comment on table public.sections is
  'The nine Bruce Trail club sections, south to north. Reference data, seeded by migration.';

insert into public.sections (id, slug, name, length_km, badge_subject, club_badge_url) values
  (1, 'niagara',   'Niagara',          83.0,  'Monument tower', 'https://niagara.brucetrail.org/badges-and-more/'),
  (2, 'iroquoia',  'Iroquoia',         122.5, 'Red fox',        'https://iroquoia.on.ca/hiking/badges'),
  (3, 'toronto',   'Toronto',          50.3,  'Lime kiln',      'https://torontobrucetrailclub.org/the-trail/badges/'),
  (4, 'caledon',   'Caledon Hills',    72.4,  'Redside dace',   'https://caledonbrucetrail.ca/hiking/club-badges/'),
  (5, 'dufferin',  'Dufferin Hi-Land', 56.3,  'Pink rose',      'https://dufferinbrucetrailclub.org/dufferin-bruce-trail-club-badges/'),
  (6, 'blue',      'Blue Mountains',   70.0,  'Hiking boot',    'https://bmbtc.org/badges-and-hike-logs/'),
  (7, 'beaver',    'Beaver Valley',    120.0, 'Apple tree',     'https://beavervalleybrucetrail.org/earning-badges/'),
  (8, 'sydenham',  'Sydenham',         170.0, 'Backpack',       'https://sydenhambrucetrail.ca/badges/'),
  (9, 'peninsula', 'Peninsula',        160.0, 'Flowerpot rock', 'https://peninsula.brucetrail.org/badges/');

-- Row Level Security. Supabase exposes every table in `public` through its
-- API, so RLS goes on the moment a table exists. With RLS on and no policy,
-- nobody can read anything through the API.
alter table public.sections enable row level security;

-- Sections are public facts, so anyone (signed in or not) may read them.
-- Nobody gets an insert/update/delete policy: changes happen only through
-- migrations. Stage 3 covers policies properly.
create policy "Sections are readable by everyone"
  on public.sections for select
  to anon, authenticated
  using (true);
