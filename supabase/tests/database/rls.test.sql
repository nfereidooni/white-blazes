-- Row Level Security tests. Run with: npx supabase test db
--
-- Everything happens inside a transaction that's rolled back at the end,
-- so the test users and hikes never touch your real local data.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

-- Two people. The sign-up trigger gives each a profile.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');

insert into public.hikes (id, user_id, hiked_on, name, section_id, source) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-01', 'Alice hike', 3, 'manual'),
  ('bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-05-02', 'Bob hike',   3, 'manual');

insert into public.hike_segments (hike_id, section_id, km) values
  ('bbbbbbbb-1111-0000-0000-000000000002', 3, numrange(0, 10));

-- Act as Alice: the same thing Supabase does when a request arrives with her JWT.
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Reading
select is((select count(*) from hikes)::int, 1, 'Alice sees only her own hike');
select is((select count(*) from hike_segments)::int, 0, 'Alice cannot see Bob''s segments');
select is((select count(*) from profiles)::int, 1, 'Alice sees only her own profile');

-- Adding
select lives_ok(
  $$ insert into hikes (user_id, hiked_on, name, source)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-06-01', 'New hike', 'manual') $$,
  'Alice can add a hike for herself');

select throws_ok(
  $$ insert into hikes (user_id, hiked_on, name, source)
     values ('bbbbbbbb-0000-0000-0000-000000000002', '2026-06-01', 'Sneaky', 'manual') $$,
  '42501', null,
  'Alice cannot add a hike as Bob');

select throws_ok(
  $$ insert into hike_segments (hike_id, section_id, km)
     values ('bbbbbbbb-1111-0000-0000-000000000002', 3, numrange(20, 30)) $$,
  '42501', null,
  'Alice cannot add a segment to Bob''s hike');

-- Editing. Rows you can't see are skipped silently: no error, 0 rows changed.
select is_empty(
  $$ update hikes set name = 'Hacked' where id = 'bbbbbbbb-1111-0000-0000-000000000002' returning id $$,
  'Alice''s update to Bob''s hike changes nothing');

select throws_ok(
  $$ update hikes set user_id = 'bbbbbbbb-0000-0000-0000-000000000002'
     where id = 'aaaaaaaa-1111-0000-0000-000000000001' $$,
  '42501', null,
  'Alice cannot hand her hike to Bob (with check)');

select is_empty(
  $$ update profiles set share_enabled = true
     where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning id $$,
  'Alice cannot turn on Bob''s share link');

-- Deleting
select is_empty(
  $$ delete from hikes where id = 'bbbbbbbb-1111-0000-0000-000000000002' returning id $$,
  'Alice''s delete of Bob''s hike removes nothing');

select isnt_empty(
  $$ delete from hikes where id = 'aaaaaaaa-1111-0000-0000-000000000001' returning id $$,
  'Alice can delete her own hike');

-- Signed out
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*) from hikes)::int, 0, 'Signed-out visitors see no hikes');
select is((select count(*) from profiles)::int, 0, 'Signed-out visitors see no profiles');

-- Share links
reset role;
-- Note Bob's slug while we're still the admin role; anon can't read profiles.
create temp table bob_link as
  select share_slug as slug from profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002';
grant select on bob_link to anon;

select is(
  (select count(*) from shared_progress((select slug from bob_link)))::int,
  0, 'A share link shows nothing while sharing is off');

update profiles set share_enabled = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role anon;

select is(
  (select done_km from shared_progress((select slug from bob_link)) where section_id = 3),
  10.0, 'Once on, anyone with the link sees Bob''s Toronto km');

select is(
  (select count(*) from shared_progress('not-a-real-slug'))::int,
  0, 'A made-up slug shows nothing');

select * from finish();
rollback;
