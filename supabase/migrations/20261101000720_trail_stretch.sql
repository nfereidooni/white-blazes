-- The stretch of trail between two points, for drawing a picked hike on the map.
-- The points can be in different sections: every section in between is
-- included whole. Returns a GeoJSON MultiLineString in lat/lon.
create function public.trail_stretch(
  from_section smallint, from_km numeric,
  to_section   smallint, to_km   numeric
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select extensions.st_asgeojson(
    extensions.st_transform(
      extensions.st_simplify(
        extensions.st_collect(
          extensions.st_linesubstring(
            l.geom_m,
            case when s.id = from_section then least(greatest(from_km / s.length_km, 0), 1) else 0 end,
            case when s.id = to_section   then least(greatest(to_km   / s.length_km, 0), 1) else 1 end
          )
          order by s.id
        ),
        5
      ),
      4326
    ),
    5
  )::jsonb
  from public.section_lines l
  join public.sections s on s.id = l.section_id
  where s.id between from_section and to_section;
$$;

grant execute on function public.trail_stretch(smallint, numeric, smallint, numeric) to authenticated;
