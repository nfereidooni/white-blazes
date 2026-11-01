-- Stage 2: sign-in.
--   1. Create a profile row automatically whenever someone signs up.
--   2. Let a signed-in person read their own profile, hikes and segments.
--   3. A view that turns segments into per-section progress.

-- 1. Profile on sign-up -------------------------------------------------------
--
-- Supabase Auth inserts into auth.users when someone signs up (magic link,
-- Google, anything). A trigger on that insert creates the matching profile,
-- so no code path can ever end up with a user who has no profile.
--
-- `security definer` runs the function with the rights of its owner (the
-- migration role), not of whoever triggered it. It needs that to write to
-- public.profiles while RLS is on. Because it's powerful, it does one thing
-- and has an empty search_path.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    -- Google sends a name; magic link sign-ups only have an email.
    left(nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )), ''), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Read your own rows ---------------------------------------------------------
--
-- auth.uid() reads the user id out of the JWT that came with the request.
-- Wrapping it in (select ...) makes Postgres compute it once per query
-- instead of once per row.
--
-- Only SELECT for now. Inserting, editing and deleting hikes, plus friends
-- seeing each other, are stage 3.

create policy "People can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "People can read their own hikes"
  on public.hikes for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Segments don't have a user_id, so the policy checks the parent hike.
create policy "People can read segments of their own hikes"
  on public.hike_segments for select
  to authenticated
  using (
    exists (
      select 1 from public.hikes h
      where h.id = hike_segments.hike_id
        and h.user_id = (select auth.uid())
    )
  );


-- 3. Section progress -----------------------------------------------------------
--
-- range_agg merges overlapping km ranges into one multirange, so a stretch
-- hiked twice counts once. security_invoker makes the view run with the
-- permissions of the person querying it, so the RLS policies above still
-- apply: you only ever see your own progress.

create view public.section_progress
with (security_invoker = true)
as
with merged as (
  select h.user_id, g.section_id, range_agg(g.km) as covered
  from public.hike_segments g
  join public.hikes h on h.id = g.hike_id
  group by h.user_id, g.section_id
)
select
  m.user_id,
  m.section_id,
  m.covered,
  (select round(sum(upper(r) - lower(r)), 1) from unnest(m.covered) as r) as done_km
from merged m;

comment on view public.section_progress is
  'Main-trail km covered per person per section, overlaps merged. Respects RLS.';
