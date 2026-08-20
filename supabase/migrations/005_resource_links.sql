-- ============================================================
-- 005_resource_links.sql
-- Adds a `links` column to resources — an array of {url, label}
-- objects so a resource can have multiple links.
-- The original `link` column is kept for backward compatibility.
-- ============================================================

alter table public.resources
  add column if not exists links jsonb not null default '[]'::jsonb;

-- Backfill: migrate existing single link into the links array
update public.resources
  set links = jsonb_build_array(jsonb_build_object('url', link, 'label', 'View Resource'))
  where link is not null and link <> '' and links = '[]'::jsonb;
