-- Profile stage: photo, goal, home clubs, sharing them, and deleting an account.

-- 1. Profile fields -------------------------------------------------------------
alter table public.profiles
  add column goal          text check (char_length(goal) <= 120),
  add column avatar_path   text check (char_length(avatar_path) <= 200),
  -- Off by default: your photo and goal appear on your share page only if you say so.
  add column share_profile boolean not null default false;

comment on column public.profiles.avatar_path is 'Path of the profile photo in the private avatars bucket.';

-- Your photo path must be inside your own folder. Without this, someone could
-- set their avatar_path to another person's photo, turn on their own share
-- page, and the share page policy below would make that photo public.
alter table public.profiles
  add constraint profiles_avatar_in_own_folder
  check (avatar_path is null or avatar_path like id::text || '/%');


-- 2. Home clubs ------------------------------------------------------------------
--
-- Each of the nine sections has one club, and people can belong to several.
-- That's a many-to-many relationship, so it gets its own table with one row
-- per (person, club) pair instead of a list stuffed into one column.
create table public.profile_clubs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  section_id smallint not null references public.sections (id),
  primary key (profile_id, section_id)
);

alter table public.profile_clubs enable row level security;

create policy "People can read their own clubs"
  on public.profile_clubs for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "People can add their own clubs"
  on public.profile_clubs for insert to authenticated
  with check ((select auth.uid()) = profile_id);
create policy "People can remove their own clubs"
  on public.profile_clubs for delete to authenticated
  using ((select auth.uid()) = profile_id);

-- Replace your clubs in one transaction, so a half-finished save can't leave
-- you with none. Runs as the caller, so the policies above still apply.
create function public.set_home_clubs(section_ids smallint[])
returns void
language sql
set search_path = ''
as $$
  delete from public.profile_clubs where profile_id = (select auth.uid());
  insert into public.profile_clubs (profile_id, section_id)
  select (select auth.uid()), unnest(section_ids);
$$;

grant execute on function public.set_home_clubs(smallint[]) to authenticated;


-- 3. Profile photos in Supabase Storage ------------------------------------------
--
-- Storage keeps files outside the database, but who can read and write them
-- is still decided by RLS policies, on the storage.objects table. Each
-- person's photos live in a folder named after their user id:
--   avatars/<user id>/<file>.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg', 'image/png']);

-- storage.foldername('abc/photo.webp') returns {abc}: the folder part of the path.
create policy "People can read their own photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People can upload their own photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People can replace their own photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "People can delete their own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Anyone can see a photo that its owner shows on a share page that's switched on.
--
-- The check has to look at profiles, but RLS applies inside policies too, and
-- a signed-out visitor can't read any profile rows. So the lookup goes
-- through a small security definer function that answers one yes/no
-- question and reveals nothing else.
create function public.is_shared_avatar(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.avatar_path = path and p.share_enabled and p.share_profile
  );
$$;

grant execute on function public.is_shared_avatar(text) to anon, authenticated;

create policy "Photos on share pages are visible"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars' and public.is_shared_avatar(name));


-- 4. Share pages can include the photo and goal ------------------------------------
--
-- A separate small function, so shared_progress keeps returning exactly what
-- it did before.
create function public.shared_profile(slug text)
returns table (display_name text, goal text, avatar_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.display_name,
         case when p.share_profile then p.goal end,
         case when p.share_profile then p.avatar_path end
  from public.profiles p
  where p.share_slug = slug and p.share_enabled;
$$;

grant execute on function public.shared_profile(text) to anon, authenticated;


-- 5. Deleting an account ---------------------------------------------------------
--
-- Your login lives in auth.users, which normal users can't touch. This
-- function runs as its owner (security definer) to delete exactly one row:
-- yours, identified by the JWT. The foreign keys cascade from there:
-- auth.users -> profiles -> hikes -> hike_segments, and profile_clubs.
-- The app removes your photo files through the Storage API first, because
-- deleting storage.objects rows directly would leave the files behind.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
