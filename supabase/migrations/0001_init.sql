-- ===========================================================================
-- everyDay Travel Agency — Supabase initial schema
-- Run this file once in Supabase Dashboard -> SQL Editor.
-- It creates the content tables, auth tables, the atomic read/write RPCs,
-- and the public storage bucket used for dashboard image uploads.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Auth tables
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                  text primary key,
  username            text not null unique,
  password_hash       text not null,
  role                text not null default 'OWNER' check (role in ('OWNER', 'SALES')),
  must_change_password boolean not null default false,
  created_at          timestamptz not null default now()
);

create table if not exists public.sessions (
  id                text primary key,
  user_id           text not null references public.users (id) on delete cascade,
  token_hash        text not null unique,
  expires_at        timestamptz not null,
  last_refreshed_at timestamptz not null,
  created_at        timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

create table if not exists public.login_attempts (
  id         text primary key,
  key        text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_key_created_idx
  on public.login_attempts (key, created_at desc);

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------
create table if not exists public.images (
  id         text primary key,
  provider   text not null check (provider in ('SUPABASE', 'CLOUDINARY', 'STATIC')),
  public_id  text not null,
  url        text not null,
  width      integer not null default 1600,
  height     integer not null default 1200,
  bytes      bigint not null default 0,
  format     text not null default 'jpg',
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id                    text primary key default 'default',
  company_name          jsonb not null,
  logo_image_id         text references public.images (id) on delete set null,
  favicon_image_id      text references public.images (id) on delete set null,
  phone                 text not null default '',
  whatsapp              text not null default '',
  email                 text not null default '',
  address               jsonb not null default '{"ar":"","en":"","enManual":true}'::jsonb,
  map_url               text not null default '',
  tiktok_url            text not null default '',
  facebook_url          text not null default '',
  instagram_url         text not null default '',
  whatsapp_message      jsonb not null,
  seo_title             jsonb not null,
  seo_description       jsonb not null,
  og_image_id           text references public.images (id) on delete set null,
  about_title           jsonb not null,
  about_body            jsonb not null,
  hero_badge            jsonb not null,
  hero_title            jsonb not null,
  hero_subtitle         jsonb not null,
  hero_description      jsonb not null,
  hero_features         jsonb not null default '[]'::jsonb,
  hero_interval_seconds integer not null default 5,
  show_trips_section    boolean not null default true,
  show_why_us_section   boolean not null default true,
  show_gallery_section  boolean not null default true,
  show_contact_section  boolean not null default true,
  why_us_items          jsonb not null default '[]'::jsonb,
  trips_intro           jsonb not null,
  gallery_title         jsonb not null,
  contact_intro         jsonb not null,
  footer_tagline        jsonb not null
);

create table if not exists public.hero_images (
  id         text primary key,
  image_id   text not null references public.images (id) on delete cascade,
  sort_order integer not null default 0
);

create table if not exists public.destinations (
  id         text primary key,
  slug       text not null unique,
  name       jsonb not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table if not exists public.trips (
  id             text primary key,
  slug           text not null unique,
  title          jsonb not null,
  destination_id text not null references public.destinations (id) on delete restrict,
  tagline        jsonb not null,
  badge          jsonb,
  features       jsonb not null default '[]'::jsonb,
  description    jsonb not null,
  duration_days  integer,
  price_amount   integer,
  price_prefix   text not null default 'NONE',
  price_unit     text not null default 'PER_PERSON',
  status         text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists trips_destination_id_idx on public.trips (destination_id);
create index if not exists trips_status_sort_idx on public.trips (status, sort_order);

create table if not exists public.trip_images (
  id         text primary key,
  trip_id    text not null references public.trips (id) on delete cascade,
  image_id   text not null references public.images (id) on delete cascade,
  sort_order integer not null default 0
);

create index if not exists trip_images_trip_id_idx on public.trip_images (trip_id, sort_order);
create index if not exists trip_images_image_id_idx on public.trip_images (image_id);

create table if not exists public.itinerary_days (
  id          text primary key,
  trip_id     text not null references public.trips (id) on delete cascade,
  sort_order  integer not null default 0,
  title       jsonb not null,
  description jsonb not null
);

create index if not exists itinerary_days_trip_id_idx
  on public.itinerary_days (trip_id, sort_order);

create table if not exists public.optional_activities (
  id           text primary key,
  trip_id      text not null references public.trips (id) on delete cascade,
  sort_order   integer not null default 0,
  title        jsonb not null,
  description  jsonb not null,
  pricing      text not null default 'FREE' check (pricing in ('FREE', 'EXTRA_COST')),
  price_amount integer
);

create index if not exists optional_activities_trip_id_idx
  on public.optional_activities (trip_id, sort_order);

create table if not exists public.gallery_images (
  id         text primary key,
  image_id   text not null references public.images (id) on delete cascade,
  caption    jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_images_image_id_idx on public.gallery_images (image_id);

-- ---------------------------------------------------------------------------
-- Atomic read: returns the whole dashboard-editable state as snake_case JSON
-- ---------------------------------------------------------------------------
create or replace function public.get_site_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'images', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at, x.id)
      from public.images x
    ), '[]'::jsonb),
    'siteSettings', (
      select to_jsonb(s) from public.site_settings s where s.id = 'default'
    ),
    'heroImages', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.hero_images x
    ), '[]'::jsonb),
    'destinations', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.destinations x
    ), '[]'::jsonb),
    'trips', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.trips x
    ), '[]'::jsonb),
    'tripImages', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.trip_images x
    ), '[]'::jsonb),
    'itineraryDays', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.itinerary_days x
    ), '[]'::jsonb),
    'optionalActivities', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.optional_activities x
    ), '[]'::jsonb),
    'galleryImages', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sort_order, x.id)
      from public.gallery_images x
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Atomic write: replaces the whole content state in a single transaction.
-- Auth tables are intentionally untouched.
-- ---------------------------------------------------------------------------
create or replace function public.replace_site_state(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if payload is null or payload -> 'siteSettings' is null then
    raise exception 'replace_site_state: siteSettings is required';
  end if;

  -- Children before parents (safe delete order).
  -- "where true" keeps the Supabase safeupdate guard happy.
  delete from public.hero_images where true;
  delete from public.gallery_images where true;
  delete from public.trip_images where true;
  delete from public.itinerary_days where true;
  delete from public.optional_activities where true;
  delete from public.site_settings where true;
  delete from public.trips where true;
  delete from public.destinations where true;
  delete from public.images where true;

  -- Parents before children (safe insert order).
  insert into public.images
  select *
  from jsonb_populate_recordset(null::public.images, coalesce(payload -> 'images', '[]'::jsonb));

  insert into public.destinations
  select *
  from jsonb_populate_recordset(null::public.destinations, coalesce(payload -> 'destinations', '[]'::jsonb));

  insert into public.trips
  select *
  from jsonb_populate_recordset(null::public.trips, coalesce(payload -> 'trips', '[]'::jsonb));

  insert into public.site_settings
  select *
  from jsonb_populate_record(null::public.site_settings, payload -> 'siteSettings');

  insert into public.hero_images
  select *
  from jsonb_populate_recordset(null::public.hero_images, coalesce(payload -> 'heroImages', '[]'::jsonb));

  insert into public.trip_images
  select *
  from jsonb_populate_recordset(null::public.trip_images, coalesce(payload -> 'tripImages', '[]'::jsonb));

  insert into public.itinerary_days
  select *
  from jsonb_populate_recordset(null::public.itinerary_days, coalesce(payload -> 'itineraryDays', '[]'::jsonb));

  insert into public.optional_activities
  select *
  from jsonb_populate_recordset(null::public.optional_activities, coalesce(payload -> 'optionalActivities', '[]'::jsonb));

  insert into public.gallery_images
  select *
  from jsonb_populate_recordset(null::public.gallery_images, coalesce(payload -> 'galleryImages', '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Security: server-only access (service role bypasses RLS).
-- The anon/public keys must never be able to read or mutate these tables.
-- ---------------------------------------------------------------------------
alter table public.users              enable row level security;
alter table public.sessions           enable row level security;
alter table public.login_attempts     enable row level security;
alter table public.images             enable row level security;
alter table public.site_settings      enable row level security;
alter table public.hero_images        enable row level security;
alter table public.destinations       enable row level security;
alter table public.trips              enable row level security;
alter table public.trip_images        enable row level security;
alter table public.itinerary_days     enable row level security;
alter table public.optional_activities enable row level security;
alter table public.gallery_images     enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function public.get_site_state() from public, anon, authenticated;
revoke all on function public.replace_site_state(jsonb) from public, anon, authenticated;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.get_site_state() to service_role;
grant execute on function public.replace_site_state(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for dashboard images, writes through signed URLs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = excluded.public;
