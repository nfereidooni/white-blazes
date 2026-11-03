-- The stretches someone has covered, for the map on their share page.
--
-- Like shared_progress, it's security definer so a signed-out visitor can
-- call it without reading any table, and it returns nothing unless the
-- owner's share link is on. It gives back merged km ranges per section (with
-- the owner's gap rule applied), which is what the map draws: no hikes,
-- dates, routes or start points.
create function public.shared_covered(slug text)
returns table (section_id smallint, covered nummultirange)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select p.id, p.gap_fill_m
    from public.profiles p
    where p.share_slug = slug and p.share_enabled
  )
  select g.section_id,
         public.close_gaps(range_agg(g.km), (select gap_fill_m from owner) / 1000.0)
  from public.hike_segments g
  join public.hikes h on h.id = g.hike_id
  where h.user_id = (select id from owner)
  group by g.section_id
  order by g.section_id;
$$;

grant execute on function public.shared_covered(text) to anon, authenticated;
