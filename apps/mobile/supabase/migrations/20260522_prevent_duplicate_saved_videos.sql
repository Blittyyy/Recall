with ranked_saved_videos as (
  select
    id,
    user_id,
    video_url,
    row_number() over (
      partition by user_id, video_url
      order by saved_at asc, created_at asc, id asc
    ) as duplicate_rank,
    first_value(id) over (
      partition by user_id, video_url
      order by saved_at asc, created_at asc, id asc
    ) as keeper_id
  from public.saved_videos
),
duplicate_video_map as (
  select id as duplicate_id, keeper_id
  from ranked_saved_videos
  where duplicate_rank > 1
),
transferred_collections as (
  insert into public.video_collections (video_id, collection_id, created_at)
  select distinct
    duplicate_video_map.keeper_id,
    video_collections.collection_id,
    video_collections.created_at
  from duplicate_video_map
  join public.video_collections
    on video_collections.video_id = duplicate_video_map.duplicate_id
  on conflict (video_id, collection_id) do nothing
  returning 1
),
duplicate_reminders as (
  select
    reminders.*,
    duplicate_video_map.keeper_id,
    row_number() over (
      partition by duplicate_video_map.keeper_id
      order by reminders.created_at asc, reminders.id asc
    ) as reminder_rank
  from duplicate_video_map
  join public.reminders
    on reminders.video_id = duplicate_video_map.duplicate_id
),
transferred_reminders as (
  insert into public.reminders (
    user_id,
    video_id,
    enabled,
    reminder_time,
    frequency,
    days_of_week,
    timezone,
    created_at,
    updated_at
  )
  select
    duplicate_reminders.user_id,
    duplicate_reminders.keeper_id,
    duplicate_reminders.enabled,
    duplicate_reminders.reminder_time,
    duplicate_reminders.frequency,
    duplicate_reminders.days_of_week,
    duplicate_reminders.timezone,
    duplicate_reminders.created_at,
    duplicate_reminders.updated_at
  from duplicate_reminders
  where duplicate_reminders.reminder_rank = 1
    and not exists (
      select 1
      from public.reminders keeper_reminders
      where keeper_reminders.video_id = duplicate_reminders.keeper_id
    )
  on conflict (video_id) do nothing
  returning 1
),
repointed_resurfacing_events as (
  update public.resurfacing_events
  set video_id = duplicate_video_map.keeper_id
  from duplicate_video_map
  where public.resurfacing_events.video_id = duplicate_video_map.duplicate_id
  returning 1
),
deleted_duplicate_videos as (
  delete from public.saved_videos
  using duplicate_video_map
  where public.saved_videos.id = duplicate_video_map.duplicate_id
  returning 1
)
select 1;

create unique index if not exists saved_videos_user_video_url_unique_idx
on public.saved_videos (user_id, video_url);
