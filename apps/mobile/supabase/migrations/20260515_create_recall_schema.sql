create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  creator text,
  platform text,
  video_url text not null,
  thumbnail_url text,
  category text,
  saved_at timestamptz not null default now(),
  last_opened_at timestamptz,
  revisit_count int not null default 0,
  archived boolean not null default false,
  dismissed_from_resurfacing_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_collections (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.saved_videos(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint video_collections_video_collection_unique unique (video_id, collection_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.saved_videos(id) on delete cascade,
  enabled boolean not null default true,
  reminder_time time,
  frequency text,
  days_of_week int[],
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_video_id_unique unique (video_id)
);

create table if not exists public.resurfacing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.saved_videos(id) on delete cascade,
  event_type text,
  shown_at timestamptz not null default now(),
  acted_at timestamptz
);

create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists saved_videos_user_id_idx on public.saved_videos (user_id);
create index if not exists saved_videos_user_saved_at_idx on public.saved_videos (user_id, saved_at desc);
create index if not exists saved_videos_user_archived_idx on public.saved_videos (user_id, archived);
create index if not exists saved_videos_user_last_opened_idx on public.saved_videos (user_id, last_opened_at desc);
create index if not exists collections_user_id_idx on public.collections (user_id);
create index if not exists collections_user_name_idx on public.collections (user_id, name);
create index if not exists video_collections_video_id_idx on public.video_collections (video_id);
create index if not exists video_collections_collection_id_idx on public.video_collections (collection_id);
create index if not exists reminders_user_id_idx on public.reminders (user_id);
create index if not exists reminders_video_id_idx on public.reminders (video_id);
create index if not exists reminders_enabled_idx on public.reminders (user_id, enabled);
create index if not exists resurfacing_events_user_id_idx on public.resurfacing_events (user_id);
create index if not exists resurfacing_events_video_id_idx on public.resurfacing_events (video_id);
create index if not exists resurfacing_events_user_shown_at_idx on public.resurfacing_events (user_id, shown_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_saved_videos_updated_at on public.saved_videos;
create trigger set_saved_videos_updated_at
before update on public.saved_videos
for each row
execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at
before update on public.collections
for each row
execute function public.set_updated_at();

drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.saved_videos enable row level security;
alter table public.collections enable row level security;
alter table public.video_collections enable row level security;
alter table public.reminders enable row level security;
alter table public.resurfacing_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists "saved_videos_select_own" on public.saved_videos;
create policy "saved_videos_select_own"
on public.saved_videos
for select
using (auth.uid() = user_id);

drop policy if exists "saved_videos_insert_own" on public.saved_videos;
create policy "saved_videos_insert_own"
on public.saved_videos
for insert
with check (auth.uid() = user_id);

drop policy if exists "saved_videos_update_own" on public.saved_videos;
create policy "saved_videos_update_own"
on public.saved_videos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_videos_delete_own" on public.saved_videos;
create policy "saved_videos_delete_own"
on public.saved_videos
for delete
using (auth.uid() = user_id);

drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own"
on public.collections
for select
using (auth.uid() = user_id);

drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own"
on public.collections
for insert
with check (auth.uid() = user_id);

drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own"
on public.collections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own"
on public.collections
for delete
using (auth.uid() = user_id);

drop policy if exists "video_collections_select_own" on public.video_collections;
create policy "video_collections_select_own"
on public.video_collections
for select
using (
  exists (
    select 1
    from public.saved_videos sv
    where sv.id = video_id
      and sv.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "video_collections_insert_own" on public.video_collections;
create policy "video_collections_insert_own"
on public.video_collections
for insert
with check (
  exists (
    select 1
    from public.saved_videos sv
    where sv.id = video_id
      and sv.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "video_collections_delete_own" on public.video_collections;
create policy "video_collections_delete_own"
on public.video_collections
for delete
using (
  exists (
    select 1
    from public.saved_videos sv
    where sv.id = video_id
      and sv.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own"
on public.reminders
for select
using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own"
on public.reminders
for insert
with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own"
on public.reminders
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own"
on public.reminders
for delete
using (auth.uid() = user_id);

drop policy if exists "resurfacing_events_select_own" on public.resurfacing_events;
create policy "resurfacing_events_select_own"
on public.resurfacing_events
for select
using (auth.uid() = user_id);

drop policy if exists "resurfacing_events_insert_own" on public.resurfacing_events;
create policy "resurfacing_events_insert_own"
on public.resurfacing_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "resurfacing_events_update_own" on public.resurfacing_events;
create policy "resurfacing_events_update_own"
on public.resurfacing_events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "resurfacing_events_delete_own" on public.resurfacing_events;
create policy "resurfacing_events_delete_own"
on public.resurfacing_events
for delete
using (auth.uid() = user_id);
