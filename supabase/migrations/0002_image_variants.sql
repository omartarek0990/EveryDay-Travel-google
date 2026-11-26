-- ===========================================================================
-- everyDay Travel Agency — 0002: responsive image variants
--
-- Additive and idempotent. Safe to run on a live project; the application keeps
-- working before it is applied because both columns are nullable and every
-- reader treats a missing value as "no variants".
--
--   variants  : { "format": "webp" | "jpg", "widths": [480, 768, ...],
--                 "basePath": "everyday/<uuid>" }
--               Variant files live at "<basePath>-w<width>.<format>".
--   avg_color : "#rrggbb" sampled from the image, used as a loading placeholder.
--
-- Apply manually in Supabase -> SQL Editor (see docs/PERFORMANCE.md).
-- ===========================================================================

alter table public.images add column if not exists variants jsonb;
alter table public.images add column if not exists avg_color text;

comment on column public.images.variants is
  'Responsive variants: {format, widths[], basePath}. Null for legacy rows.';
comment on column public.images.avg_color is
  'Average color of the image (#rrggbb) used as a loading placeholder.';

-- ---------------------------------------------------------------------------
-- get_site_state: re-declared so the new columns are explicitly part of the
-- published state. It is identical to 0001 because to_jsonb(row) already
-- serialises every column of public.images, including the two added above.
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
-- replace_site_state: re-declared unchanged. jsonb_populate_recordset maps the
-- keys that are present and leaves absent ones null, so payloads written before
-- (or after) this migration both round-trip without SQL changes.
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

-- Grants are unchanged (the functions are replaced in place, so existing
-- grants survive), but re-assert them so the migration is safe to re-run.
revoke all on function public.get_site_state() from public, anon, authenticated;
revoke all on function public.replace_site_state(jsonb) from public, anon, authenticated;
grant execute on function public.get_site_state() to service_role;
grant execute on function public.replace_site_state(jsonb) to service_role;
