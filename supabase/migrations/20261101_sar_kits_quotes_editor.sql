-- Kit editor (Sean, 2026-11-01): quotes Sean gathers himself, per kit.
-- [{quote, by, role, source_url, public}] ; public=false keeps one in the owner view only.
alter table public.sar_kits add column if not exists quotes jsonb not null default '[]';
alter table public.sar_kits add column if not exists updated_at timestamptz;
