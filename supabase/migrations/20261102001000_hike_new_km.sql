-- New km per hike: how much main trail each hike covered for the first time.
--
-- Hikes are taken in date order (then by when you logged them, then by id,
-- so the order is always the same). For each stretch a hike covered, we
-- subtract everything your earlier hikes had already covered in that
-- section, and add up what's left:
--
--   this stretch      [10 ─────────── 25)
--   already hiked  [0 ──── 15)    [20 ── 30)
--   new                    [15 ─ 20)          → 5 km new
--
-- That subtraction is one operator on range types: nummultirange - nummultirange.
--
-- It's a view, not a stored column, so it's always right: edit or delete an
-- old hike and every later hike's new km changes with it. The view runs as
-- the caller (security_invoker), so RLS limits it to your own hikes.
-- The gap rule isn't applied here: new km counts exactly what was hiked.
create view public.hike_new_km
with (security_invoker = true)
as
select
  h.id as hike_id,
  coalesce(round(sum(n.km), 1), 0) as new_km
from public.hikes h
left join public.hike_segments g on g.hike_id = h.id
left join lateral (
  select sum(upper(r) - lower(r)) as km
  from unnest(
    nummultirange(g.km) - coalesce(
      (
        select range_agg(p.km)
        from public.hike_segments p
        join public.hikes ph on ph.id = p.hike_id
        where ph.user_id = h.user_id
          and p.section_id = g.section_id
          and (ph.hiked_on, ph.created_at, ph.id) < (h.hiked_on, h.created_at, h.id)
      ),
      '{}'::nummultirange
    )
  ) as r
) as n on true
group by h.id;

grant select on public.hike_new_km to authenticated;
