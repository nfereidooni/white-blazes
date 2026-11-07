-- "Tell me when Strava sync is ready": one yes/no per person.
--
-- It lives on profiles, so the existing policies already cover it: you can
-- read and change only your own row. It isn't in any share function, so share
-- pages never see it. To count sign-ups, run this in the SQL editor (it runs
-- as the database owner, past RLS):
--
--   select count(*) from public.profiles where wants_strava_sync;

alter table public.profiles
  add column wants_strava_sync boolean not null default false;
