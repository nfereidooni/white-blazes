-- Profiles: one row per person who signs up.
--
-- Supabase Auth owns the `auth.users` table (emails, password hashes, Google
-- identities). We never add columns there. Instead, `profiles` holds the
-- app's own data about a person and shares the same id.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'App-level data about a user. id = auth.users.id. Row is created on sign-up (stage 2 trigger).';

-- A small reusable trigger function that keeps updated_at honest,
-- so the app never has to remember to set it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS on, no policies yet: invisible through the API until stage 3.
alter table public.profiles enable row level security;
