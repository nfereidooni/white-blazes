-- More optional details about a hike. All private: the share page reads
-- only shared_progress(), which never returns these columns.
--
-- notes already exists (Stage 1); this caps its length like the others.

alter table public.hikes
  add column link        text check (link ~ '^https?://' and char_length(link) <= 500),
  add column hiked_with  text check (char_length(hiked_with) <= 200),
  add column hike_leader text check (char_length(hike_leader) <= 100),
  add column start_point text check (char_length(start_point) <= 120),
  add column end_point   text check (char_length(end_point) <= 120),
  add constraint hikes_notes_length check (char_length(notes) <= 2000);

comment on column public.hikes.link is 'A club listing, Strava activity or any page about the hike.';
comment on column public.hikes.start_point is 'Where the hike started, by name, for club badge logs.';
comment on column public.hikes.end_point is 'Where the hike ended, by name, for club badge logs.';
