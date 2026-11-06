-- Badges you've received. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');
update profiles set share_enabled = true, share_slug = 'alice-hikes' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into badge_awards (profile_id, section_id, received_on) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 3, '2026-06-01');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into badge_awards (profile_id, section_id, received_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, '2026-08-15') $$,
  'Alice can record a badge');
select is((select count(*) from badge_awards)::int, 1, 'Alice sees only her own badges');
select throws_ok(
  $$ insert into badge_awards (profile_id, section_id, received_on) values ('bbbbbbbb-0000-0000-0000-000000000002', 2, '2026-08-15') $$,
  '42501', null, 'Alice cannot record a badge for Bob');
select throws_ok(
  $$ insert into badge_awards (profile_id, section_id, received_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 1, '2026-09-01') $$,
  '23505', null, 'One badge per section');
select throws_ok(
  $$ insert into badge_awards (profile_id, section_id, received_on) values ('aaaaaaaa-0000-0000-0000-000000000001', 2, current_date + 30) $$,
  '23514', null, 'A badge can''t be received in the future');

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select is((select received_on from shared_badges('alice-hikes')), '2026-08-15'::date, 'A share page shows badges');

reset role;
update profiles set share_enabled = false where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role anon;
select is((select count(*) from shared_badges('alice-hikes'))::int, 0, 'Turning the link off hides them');

reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is((select count(*) from badge_awards where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 0,
  'Deleting an account removes its badges');

select * from finish();
rollback;
