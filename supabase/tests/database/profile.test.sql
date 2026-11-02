-- Profile stage tests: home clubs, photos, share page profile, deleting an account.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');

insert into public.hikes (id, user_id, hiked_on, name, section_id, source) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-01', 'Alice hike', 3, 'manual');
insert into public.hike_segments (hike_id, section_id, km) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 3, numrange(0, 10));

insert into public.profile_clubs (profile_id, section_id) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 5);

-- Bob's photo, and a share page that shows it.
insert into storage.objects (bucket_id, name) values
  ('avatars', 'bbbbbbbb-0000-0000-0000-000000000002/photo.webp'),
  ('avatars', 'aaaaaaaa-0000-0000-0000-000000000001/photo.webp');
update public.profiles
  set avatar_path = 'bbbbbbbb-0000-0000-0000-000000000002/photo.webp',
      goal = 'Finish by 2028', share_enabled = true, share_slug = 'bob-hikes', share_profile = true
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';

-- As Alice ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok($$ select set_home_clubs(array[2, 3]::smallint[]) $$, 'Alice can set two home clubs');
select is((select array_agg(section_id order by section_id) from profile_clubs), array[2, 3]::smallint[],
  'Alice sees her two clubs and not Bob''s');
select lives_ok($$ select set_home_clubs(array[7]::smallint[]) $$, 'Alice can change her clubs');
select is((select array_agg(section_id) from profile_clubs), array[7]::smallint[], 'The old clubs are replaced');
select throws_ok(
  $$ insert into profile_clubs (profile_id, section_id) values ('bbbbbbbb-0000-0000-0000-000000000002', 1) $$,
  '42501', null, 'Alice cannot add a club for Bob');

select lives_ok($$ update profiles set goal = 'All nine sections' $$, 'Alice can set a goal');
select throws_ok(
  $$ update profiles set avatar_path = 'bbbbbbbb-0000-0000-0000-000000000002/photo.webp' $$,
  '23514', null, 'Alice cannot point her photo at Bob''s file');

select is((select count(*) from storage.objects where name like 'aaaaaaaa%')::int, 1, 'Alice sees her own photo');
select is((select count(*) from storage.objects where name like 'bbbbbbbb%')::int, 1, 'Alice sees Bob''s shared photo');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('avatars', 'bbbbbbbb-0000-0000-0000-000000000002/evil.webp') $$,
  '42501', null, 'Alice cannot upload into Bob''s folder');

-- As a signed-out visitor --------------------------------------------------------
reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select goal from shared_profile('bob-hikes')), 'Finish by 2028', 'A share page shows the goal when allowed');
select is((select count(*) from storage.objects)::int, 1, 'A visitor sees only the shared photo');

reset role;
update public.profiles set share_profile = false where id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role anon;
select is((select goal from shared_profile('bob-hikes')), null, 'Turning it off hides the goal');

-- Deleting an account -------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok($$ select delete_my_account() $$, 'Alice can delete her account');

reset role;
select is(
  (select count(*) from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001')
  + (select count(*) from hikes where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  + (select count(*) from hike_segments where hike_id = 'aaaaaaaa-1111-0000-0000-000000000001')
  + (select count(*) from profile_clubs where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  + (select count(*) from auth.users where id = 'bbbbbbbb-0000-0000-0000-000000000002') - 1,
  0::bigint, 'Her login, hikes, segments and clubs are gone; Bob is untouched');

select * from finish();
rollback;
