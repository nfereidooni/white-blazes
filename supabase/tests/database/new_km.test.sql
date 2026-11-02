-- New km per hike. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');

-- Alice: three hikes in Iroquoia (section 2), plus one she hasn't placed.
insert into hikes (id, user_id, hiked_on, name, section_id, source) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-01', 'First',  2, 'manual'),
  ('aaaaaaaa-1111-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-08', 'Second', 2, 'manual'),
  ('aaaaaaaa-1111-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-15', 'Repeat', 2, 'manual'),
  ('aaaaaaaa-1111-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '2026-05-22', 'Unplaced', null, 'manual');
insert into hike_segments (hike_id, section_id, km) values
  ('aaaaaaaa-1111-0000-0000-000000000001', 2, numrange(0, 15)),
  ('aaaaaaaa-1111-0000-0000-000000000002', 2, numrange(10, 25)),
  ('aaaaaaaa-1111-0000-0000-000000000003', 2, numrange(5, 20));

-- Bob hiked the same stretch first. It must not reduce Alice's new km.
insert into hikes (id, user_id, hiked_on, name, section_id, source) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-01-01', 'Bob first', 2, 'manual');
insert into hike_segments (hike_id, section_id, km) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 2, numrange(0, 30));

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select is((select new_km from hike_new_km where hike_id = 'aaaaaaaa-1111-0000-0000-000000000001'), 15.0, 'The first hike is all new');
select is((select new_km from hike_new_km where hike_id = 'aaaaaaaa-1111-0000-0000-000000000002'), 10.0, 'The second hike only counts km 15 to 25');
select is((select new_km from hike_new_km where hike_id = 'aaaaaaaa-1111-0000-0000-000000000003'), 0.0, 'A repeat of hiked trail adds nothing');
select is((select new_km from hike_new_km where hike_id = 'aaaaaaaa-1111-0000-0000-000000000004'), 0::numeric, 'An unplaced hike adds nothing');
select is((select count(*) from hike_new_km)::int, 4, 'Alice sees only her own hikes');

-- Deleting the first hike makes the second one all new.
reset role;
delete from hikes where id = 'aaaaaaaa-1111-0000-0000-000000000001';
set local role authenticated;
select is((select new_km from hike_new_km where hike_id = 'aaaaaaaa-1111-0000-0000-000000000002'), 15.0, 'New km follows edits to earlier hikes');

select * from finish();
rollback;
