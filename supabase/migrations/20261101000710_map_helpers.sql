-- Helpers for the map picker.

-- The whole trail as GeoJSON for drawing on a map: one feature per section,
-- simplified to points no closer than about 10 m (7,400 points, ~150 KB),
-- which looks the same at any zoom a phone can show.
create function public.trail_geojson()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'properties', jsonb_build_object('section_id', s.id, 'name', s.name, 'length_km', s.length_km),
        'geometry', extensions.st_asgeojson(
          extensions.st_transform(extensions.st_simplify(l.geom_m, 10), 4326), 5
        )::jsonb
      )
      order by s.id
    )
  )
  from public.section_lines l
  join public.sections s on s.id = l.section_id;
$$;

grant execute on function public.trail_geojson() to anon, authenticated;

-- Like locate_on_trail, plus the spot on the trail itself, so the map can
-- drop the marker on the line instead of where the finger landed.
create function public.snap_to_trail(lat double precision, lon double precision)
returns table (section_id smallint, km numeric, distance_m numeric, snap_lat double precision, snap_lon double precision)
language sql
stable
set search_path = ''
as $$
  with pt as (
    select extensions.st_transform(extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326), 32617) as g
  ),
  near as (
    select l.section_id, l.geom_m, s.length_km
    from public.section_lines l
    join public.sections s on s.id = l.section_id, pt
    order by l.geom_m operator(extensions.<->) pt.g
    limit 1
  )
  select
    near.section_id,
    round((extensions.st_linelocatepoint(near.geom_m, pt.g) * near.length_km)::numeric, 2),
    round(extensions.st_distance(near.geom_m, pt.g)::numeric, 0),
    extensions.st_y(snapped),
    extensions.st_x(snapped)
  from near, pt,
    lateral (select extensions.st_transform(extensions.st_closestpoint(near.geom_m, pt.g), 4326) as snapped) s;
$$;

grant execute on function public.snap_to_trail(double precision, double precision) to authenticated;
