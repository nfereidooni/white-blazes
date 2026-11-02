-- A club hike can have two links: the club's listing and your own recording.
-- `link` (migration 0730) stays as the activity link: Strava, AllTrails, a watch.
alter table public.hikes
  add column club_link text check (club_link ~ '^https?://' and char_length(club_link) <= 500);

comment on column public.hikes.link is 'Your own recording: Strava, AllTrails, Garmin and so on.';
comment on column public.hikes.club_link is 'The club''s listing for a club hike.';
