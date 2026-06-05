alter table public.collections
add column if not exists cover_image_url text;

alter table public.collections
add column if not exists cover_type text not null default 'icon';

update public.collections
set cover_type = 'icon'
where cover_type is null;
