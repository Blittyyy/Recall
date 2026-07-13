alter table public.saved_videos
add column if not exists availability_status text;

comment on column public.saved_videos.availability_status is
  'Null when available/unknown. Set to unavailable when the source video is no longer public.';
