-- The share page's covered stretches. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}');
update profiles set share_enabled = true, share_slug = 'alice-hikes', gap_fill_m = 300
  where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into hikes (id, user_id, hiked_on, name, section_id, source) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-01', 'One', 2, 'manual'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-08', 'Two', 2, 'manual');
insert into hike_segments (hike_id, section_id, km) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 2, numrange(0, 10)),
  ('aaaaaaaa-1111-0000-0000-000000000002', 2, numrange(10.2, 20));

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select is((select count(*) from shared_covered('alice-hikes'))::int, 1, 'A visitor gets one row per section hiked');
select is((select covered from shared_covered('alice-hikes')), '{[0,20)}'::nummultirange,
  'Stretches are merged, with the owner''s gap rule closing the 200 m break');
select is((select count(*) from shared_covered('nobody'))::int, 0, 'An unknown link returns nothing');
select is((select count(*) from hike_segments)::int, 0, 'A visitor still sees no rows in the hike tables');

reset role;
update profiles set share_enabled = false where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role anon;
select is((select count(*) from shared_covered('alice-hikes'))::int, 0, 'Turning the link off hides the map');

select * from finish();
rollback;
