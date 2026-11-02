-- Track matching and import tests. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

-- Fake GPS tracks cut from the trail line itself.
-- Toronto (50.3 km) from km 5 to km 10:
create temp table toronto_5_10 as
  select array_agg(st_y(d.geom) order by d.path) as lats, array_agg(st_x(d.geom) order by d.path) as lons
  from section_lines l, st_dumppoints(st_transform(st_linesubstring(l.geom_m, 5 / 50.3, 10 / 50.3), 4326)) d
  where l.section_id = 3;

-- The end of Toronto (km 45) into the start of Caledon Hills (km 5):
create temp table across_boundary as
  select array_agg(lat order by sec, ord) as lats, array_agg(lon order by sec, ord) as lons
  from (
    select l.section_id as sec, d.path[1] as ord, st_y(d.geom) as lat, st_x(d.geom) as lon
    from section_lines l, st_dumppoints(st_transform(st_linesubstring(l.geom_m, 45 / 50.3, 1), 4326)) d where l.section_id = 3
    union all
    select l.section_id, d.path[1], st_y(d.geom), st_x(d.geom)
    from section_lines l, st_dumppoints(st_transform(st_linesubstring(l.geom_m, 0, 5 / 72.4), 4326)) d where l.section_id = 4
  ) t;

grant select on toronto_5_10, across_boundary to authenticated;

-- Matching
select is((select count(*) from match_track((select lats from toronto_5_10), (select lons from toronto_5_10)))::int,
  1, 'A track along the trail gives one range');
select ok((select abs(km_from - 5) < 0.15 and abs(km_to - 10) < 0.15
           from match_track((select lats from toronto_5_10), (select lons from toronto_5_10))),
  'and it runs from km 5 to km 10 of Toronto');

-- ~30 m east of the trail: GPS wobble, still counts.
select is((select count(*) from match_track((select lats from toronto_5_10),
           (select array_agg(x + 0.00037) from unnest((select lons from toronto_5_10)) x)))::int,
  1, 'A track 30 m off the trail still matches');

-- ~2 km east: a different path entirely.
select is((select count(*) from match_track((select lats from toronto_5_10),
           (select array_agg(x + 0.025) from unnest((select lons from toronto_5_10)) x)))::int,
  0, 'A track 2 km away matches nothing');

select results_eq(
  $$ select section_id::int from match_track((select lats from across_boundary), (select lons from across_boundary)) $$,
  $$ values (3), (4) $$,
  'A track across a section boundary is split into Toronto and Caledon Hills');

-- Importing, as Alice
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.local', '{}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.local', '{}');
insert into hikes (id, user_id, hiked_on, name, section_id, source)
values ('bbbbbbbb-1111-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '2026-05-02', 'Bob hike', 3, 'manual');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ select import_track('Kelso to Rattlesnake', '2026-06-01', 5.3, true, 'gpx', 'hash-1',
       (select lats from toronto_5_10), (select lons from toronto_5_10)) $$,
  'Alice can import a track');

select is((select count(*) from hike_segments g join hikes h on h.id = g.hike_id where h.external_id = 'hash-1')::int,
  1, 'The import saved the hike and its segment together');

select throws_ok(
  $$ select import_track('Same file again', '2026-06-01', 5.3, true, 'gpx', 'hash-1',
       (select lats from toronto_5_10), (select lons from toronto_5_10)) $$,
  '23505', null,
  'Importing the same file twice is refused');

select is((select count(*) from hikes where name = 'Same file again')::int, 0,
  'and the refused import left nothing behind');

select lives_ok(
  $$ select import_track('Replacement', '2026-06-01', 5.3, true, 'gpx', 'hash-2',
       (select lats from toronto_5_10), (select lons from toronto_5_10),
       (select id from hikes where external_id = 'hash-1')) $$,
  'Alice can replace her own hike with a track');

select throws_ok(
  $$ select import_track('Sneaky', '2026-06-01', 5.3, true, 'gpx', 'hash-3',
       (select lats from toronto_5_10), (select lons from toronto_5_10),
       'bbbbbbbb-1111-0000-0000-000000000002') $$,
  'P0001', 'The hike to replace was not found.',
  'Alice cannot replace Bob''s hike');

select lives_ok(
  $$ select import_track('Off trail', '2026-06-02', 4, false, 'gpx', 'hash-4',
       (select lats from toronto_5_10), (select array_agg(x + 0.025) from unnest((select lons from toronto_5_10)) x)) $$,
  'A track off the main trail can still be imported');

select is((select trail::text from hikes where external_id = 'hash-4'), 'side',
  'A track that never touches the main trail is saved as a side trail hike');

select * from finish();
rollback;
