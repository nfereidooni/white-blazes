-- Trail geometry and gap rule tests. Run with: npm run db:test
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

-- The trail is loaded
select is((select count(*) from section_lines)::int, 9, 'All nine sections have a trail line');

-- Points to km. The southern terminus cairn at Queenston Heights:
select is((select section_id from locate_on_trail(43.1583, -79.0522))::int, 1, 'Queenston is in Niagara');
select ok((select km from locate_on_trail(43.1583, -79.0522)) < 0.2, 'Queenston is at the start of Niagara');
select ok((select distance_m from locate_on_trail(43.1583, -79.0522)) < 50, 'Queenston is right on the trail');

-- The northern terminus at Tobermory:
select is((select section_id from locate_on_trail(45.2552, -81.6630))::int, 9, 'Tobermory is in Peninsula');
select ok((select km from locate_on_trail(45.2552, -81.6630)) > 159.5, 'Tobermory is at the end of Peninsula');

-- A point well off the trail reports how far away it is.
select ok((select distance_m from locate_on_trail(43.6532, -79.3832)) > 20000, 'Downtown Toronto is far from the trail');

-- Closing gaps
select is(close_gaps('{[0,5),[5.2,9)}'::nummultirange, 0.3), '{[0,9)}'::nummultirange, 'A 200 m gap closes under a 300 m rule');
select is(close_gaps('{[0,5),[5.2,9)}'::nummultirange, 0.1), '{[0,5),[5.2,9)}'::nummultirange, 'A 200 m gap stays open under a 100 m rule');
select is(close_gaps('{[0,5),[5.2,9)}'::nummultirange, 0), '{[0,5),[5.2,9)}'::nummultirange, 'No gaps close when the rule is off');

select * from finish();
rollback;
