-- "Tell me when Strava sync is ready". Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');
update profiles set share_enabled = true, share_slug = 'alice-hikes' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is((select wants_strava_sync from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), false,
  'Nobody is on the list by default');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

update profiles set wants_strava_sync = true where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select wants_strava_sync from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), true,
  'Alice can join the list');

-- RLS hides Bob's row, so the update matches nothing rather than erroring.
update profiles set wants_strava_sync = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';
reset role;
select is((select wants_strava_sync from profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002'), false,
  'Alice cannot put Bob on the list');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select count(*) from profiles where wants_strava_sync)::int, 0, 'Visitors cannot see who is on the list');
select ok(
  pg_get_function_result('public.shared_profile(text)'::regprocedure) not ilike '%strava%',
  'Share pages never get the list flag');

select * from finish();
rollback;
