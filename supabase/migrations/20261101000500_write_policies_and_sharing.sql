-- Stage 3: people can change their own data, and share a read-only
-- progress page by link.

-- 1. Write policies ---------------------------------------------------------------
--
-- A policy has two halves:
--   using (...)       which existing rows you can touch (read, update, delete)
--   with check (...)  what a new or changed row must look like (insert, update)
--
-- Updating a row needs both: `using` stops you editing someone else's hike,
-- `with check` stops you editing your own hike so that it becomes theirs.

create policy "People can add their own hikes"
  on public.hikes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "People can edit their own hikes"
  on public.hikes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People can delete their own hikes"
  on public.hikes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Segments belong to whoever owns the parent hike.
create policy "People can add segments to their own hikes"
  on public.hike_segments for insert
  to authenticated
  with check (
    exists (select 1 from public.hikes h
            where h.id = hike_segments.hike_id and h.user_id = (select auth.uid()))
  );

create policy "People can edit segments of their own hikes"
  on public.hike_segments for update
  to authenticated
  using (
    exists (select 1 from public.hikes h
            where h.id = hike_segments.hike_id and h.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.hikes h
            where h.id = hike_segments.hike_id and h.user_id = (select auth.uid()))
  );

create policy "People can delete segments of their own hikes"
  on public.hike_segments for delete
  to authenticated
  using (
    exists (select 1 from public.hikes h
            where h.id = hike_segments.hike_id and h.user_id = (select auth.uid()))
  );

create policy "People can edit their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);


-- 2. Share links ------------------------------------------------------------------
--
-- Every profile gets a random, hard-to-guess slug. The page at /p/<slug>
-- only works while share_enabled is on, so turning it off kills the link.

alter table public.profiles
  add column share_enabled boolean not null default false,
  add column share_slug text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

-- Signed-out visitors get NO policy on profiles, hikes or segments. Instead
-- they call this one function, which returns only what the share page
-- shows: a display name and per-section totals. No dates, no hike names.
--
-- security definer lets it read past RLS, so it has to do its own checking:
-- it returns nothing unless that slug exists AND sharing is on.
create function public.shared_progress(slug text)
returns table (
  display_name text,
  section_id   smallint,
  section_name text,
  length_km    numeric,
  done_km      numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select p.id, p.display_name
    from public.profiles p
    where p.share_slug = slug and p.share_enabled
  ),
  merged as (
    select g.section_id, range_agg(g.km) as covered
    from public.hike_segments g
    join public.hikes h on h.id = g.hike_id
    where h.user_id = (select id from owner)
    group by g.section_id
  )
  select
    o.display_name,
    s.id,
    s.name,
    s.length_km,
    coalesce((select round(sum(upper(r) - lower(r)), 1) from unnest(m.covered) as r), 0)
  from owner o
  cross join public.sections s
  left join merged m on m.section_id = s.id
  order by s.id;
$$;

grant execute on function public.shared_progress(text) to anon, authenticated;
