-- Facts about each section, for the Map tab and share pages.
--
-- Start and end towns are from the Bruce Trail's club section list. The
-- "sights" are a few well-known places along each section, written in our
-- own words; check them against the Bruce Trail Reference before launch.
-- They're columns on sections (not a separate table) because each section
-- has exactly one of each: a one-to-one fact belongs on the row itself.
alter table public.sections
  add column start_name text,
  add column end_name   text,
  add column sights     text;

update public.sections s set start_name = v.start_name, end_name = v.end_name, sights = v.sights
from (values
  ('niagara',   'Queenston',    'Grimsby',     'Brock''s Monument at the southern terminus, Ball''s Falls'),
  ('iroquoia',  'Grimsby',      'Kelso',       'Hamilton''s waterfalls, the Dundas Valley, Mount Nemo'),
  ('toronto',   'Kelso',        'Cheltenham',  'The old lime kilns at Limehouse, Terra Cotta'),
  ('caledon',   'Cheltenham',   'Mono Centre', 'The Cheltenham Badlands nearby, the Forks of the Credit'),
  ('dufferin',  'Mono Centre',  'Lavender',    'Mono Cliffs and the Boyne Valley'),
  ('blue',      'Lavender',     'Craigleith',  'Pretty River Valley, views over Georgian Bay'),
  ('beaver',    'Craigleith',   'Blantyre',    'Old Baldy, Eugenia Falls'),
  ('sydenham',  'Blantyre',     'Wiarton',     'Inglis Falls, Bruce''s Caves'),
  ('peninsula', 'Wiarton',      'Tobermory',   'Lion''s Head, Bruce Peninsula National Park, the northern cairn at Tobermory')
) as v(slug, start_name, end_name, sights)
where s.slug = v.slug;

-- Every section has to have them from here on.
alter table public.sections
  alter column start_name set not null,
  alter column end_name   set not null;
