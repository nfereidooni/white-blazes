-- Demo data for local development. Runs on `supabase db reset`, never in production.
-- Everything here is made up. Log in locally as demo@example.com / password123.
--
-- Personal seed files go in supabase/seeds/ (git-ignored) and run after this one.

-- 1. A local Auth user. In real life Supabase Auth creates this row on sign-up.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@example.com"}',
  'email', now(), now(), now()
);

-- 2. Their profile. (From stage 2 on, a trigger creates this automatically.)
insert into public.profiles (id, display_name)
values ('11111111-1111-1111-1111-111111111111', 'Demo Hiker');

-- 3. Hikes, plus the main-trail km each covered.
-- A CTE lets us insert a hike and use its generated id in the same statement.
with h as (
  insert into public.hikes (user_id, hiked_on, name, section_id, is_club_hike, trail, walked_km, source, external_id)
  values
    ('11111111-1111-1111-1111-111111111111', '2025-05-17', 'Queenston to St. Davids',    1, true,  'main', 11.2, 'gpx',    'demo-1'),
    ('11111111-1111-1111-1111-111111111111', '2025-06-14', 'Kelso loop',                 3, false, 'main',  9.8, 'strava', 'demo-2'),
    ('11111111-1111-1111-1111-111111111111', '2025-09-20', 'Kelso to Rattlesnake Point', 3, true,  'main', 14.5, 'strava', 'demo-3'),
    ('11111111-1111-1111-1111-111111111111', '2025-10-04', 'Rattlesnake Point repeat',   3, false, 'main', 10.0, 'strava', 'demo-4'),
    ('11111111-1111-1111-1111-111111111111', '2026-05-09', 'Lion''s Head lookout',      9, false, 'main', 12.6, 'manual', null),
    ('11111111-1111-1111-1111-111111111111', '2026-06-21', 'Side trail ramble',          2, true,  'side',  8.0, 'gpx',    'demo-6'),
    ('11111111-1111-1111-1111-111111111111', '2026-07-11', 'Club hike, location TBD',    null, true, 'main', null, 'club_export', 'demo-7')
  returning id, external_id, name
)
insert into public.hike_segments (hike_id, section_id, km)
select h.id, s.section_id, s.km
from h
join (values
  ('demo-1', 1, numrange(0.0, 10.8)),
  ('demo-2', 3, numrange(0.0, 4.5)),
  ('demo-3', 3, numrange(0.0, 13.9)),     -- overlaps demo-2: those 4.5 km count once
  ('demo-4', 3, numrange(9.0, 14.0)),     -- mostly repeat, 0.1 km new
  ('Lion''s Head lookout', 9, numrange(60.0, 71.5))
) as s(match_key, section_id, km)
  on s.match_key = coalesce(h.external_id, h.name);
-- 'Side trail ramble' has no segments: side trails don't count toward main-trail km.
-- 'Club hike, location TBD' has no section and no segments: it "needs placing".
