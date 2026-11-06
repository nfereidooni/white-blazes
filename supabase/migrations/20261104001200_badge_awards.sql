-- Badges you've received from the clubs.
--
-- The app can tell when you've hiked a whole section, but only the club can
-- award the end to end badge. So "received" is something you record
-- yourself, with the date. It isn't tied to the km: you might have earned a
-- badge before you started using White Blazes.
create table public.badge_awards (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  section_id  smallint not null references public.sections (id),
  received_on date not null check (received_on <= current_date + 1),
  created_at  timestamptz not null default now(),
  primary key (profile_id, section_id)
);

alter table public.badge_awards enable row level security;

create policy "People can read their own badges"
  on public.badge_awards for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "People can record their own badges"
  on public.badge_awards for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy "People can change their own badges"
  on public.badge_awards for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
create policy "People can remove their own badges"
  on public.badge_awards for delete to authenticated
  using ((select auth.uid()) = profile_id);

-- Badges on a share page, while the link is on. Same pattern as
-- shared_progress: security definer, one narrow answer.
create function public.shared_badges(slug text)
returns table (section_id smallint, received_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select b.section_id, b.received_on
  from public.badge_awards b
  join public.profiles p on p.id = b.profile_id
  where p.share_slug = slug and p.share_enabled
  order by b.section_id;
$$;

grant execute on function public.shared_badges(text) to anon, authenticated;
