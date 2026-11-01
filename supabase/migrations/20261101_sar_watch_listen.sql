-- seanarussell.com Watch & Listen (playbook media-kits, Phase 2).
--
-- sar_media_sources   Sean's shows: podcast RSS feeds and YouTube channels, with
--                     his roles and the kits each belongs to.
-- sar_media_episodes  every episode or video read from a source by the sar-media
--                     edge function (RSS server-side, YouTube Data API), matched
--                     to the Vegans Explore content index (ve_pulse_content) by
--                     audio URL then title, for the YouTube id and the moments.
-- sar_media_features  what Sean picked to show: a full episode, a tagged moment
--                     or his own start and end, with its kits. Read by /watch and
--                     each kit page; written only through sar-media by the owner.
-- RLS on, no policies: the function (service role) is the only reader.

create table if not exists public.sar_media_sources (
  slug        text primary key,
  name        text not null,
  kind        text not null check (kind in ('podcast','youtube')),
  rss_url     text,
  youtube_handle text,
  channel_id  text,
  network     text,                       -- e.g. Anime 3000
  roles       text[] not null default '{}',
  kits        text[] not null default '{}',
  cover       text,
  description text,
  episode_count int,
  fetched_at  timestamptz,
  error       text,
  sort        int not null default 100
);

create table if not exists public.sar_media_episodes (
  id           uuid primary key default gen_random_uuid(),
  source_slug  text not null references public.sar_media_sources(slug) on delete cascade,
  guid         text not null,
  title        text not null,
  published_at timestamptz,
  duration_s   int,
  audio_url    text,
  youtube_id   text,
  image        text,
  summary      text,
  link         text,
  content_id   uuid,                      -- ve_pulse_content.id when matched
  unique (source_slug, guid)
);
create index if not exists sar_media_episodes_src on public.sar_media_episodes(source_slug, published_at desc);

create table if not exists public.sar_media_features (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references public.sar_media_episodes(id) on delete cascade,
  format      text not null check (format in ('full','highlight')),
  start_s     numeric,
  end_s       numeric,
  moment_id   uuid,
  title       text,
  summary     text,
  kits        text[] not null default '{}',
  sort        int not null default 100,
  created_at  timestamptz not null default now(),
  check (format = 'full' or (start_s is not null and end_s is not null and end_s > start_s))
);
create index if not exists sar_media_features_kits on public.sar_media_features using gin (kits);

alter table public.sar_media_sources  enable row level security;
alter table public.sar_media_episodes enable row level security;
alter table public.sar_media_features enable row level security;

insert into public.sar_media_sources (slug,name,kind,rss_url,youtube_handle,network,roles,kits,sort) values
 ('vegans-explore-podcast','Vegans Explore Podcast','podcast','https://feeds.captivate.fm/vegans-explore/',null,'Vegans Explore','{Host,Producer}','{vegan-movement,executive-marketing,media-production}',1),
 ('soflo-vegans-podcast','SoFlo Vegans Podcast','podcast','https://feeds.captivate.fm/soflo-vegans/',null,'Vegans Explore','{Host,Producer}','{vegan-movement,media-production}',2),
 ('pre-vegans-podcast','Pre-Vegans Podcast','podcast','https://feeds.captivate.fm/pre-vegans/',null,'Vegans Explore','{Host}','{vegan-movement,speaker}',3),
 ('vegans-who-lift-podcast','Vegans Who Lift Podcast','podcast','https://feeds.captivate.fm/vegans-who-lift-podcast/',null,'Vegans Explore','{Producer,"Executive Producer"}','{vegan-movement,media-production}',4),
 ('mr-russells-class','Mr. Russell''s Class','podcast','https://feeds.captivate.fm/mr-russells-class/',null,null,'{Host}','{education}',5),
 ('a3k-podcast','A3K Podcast','podcast','https://feeds.captivate.fm/a3k-podcast/',null,'Anime 3000','{Host,Producer,"Executive Producer"}','{media-production,entertainment}',6),
 ('a3k-panel','A3K Panel','podcast','https://feeds.captivate.fm/a3k-panel/',null,'Anime 3000','{Host,Producer,"Executive Producer"}','{media-production,entertainment}',7),
 ('a3k-radio','A3K Radio','podcast','https://feeds.captivate.fm/a3k-radio/',null,'Anime 3000','{Host,Producer,"Executive Producer"}','{media-production,entertainment}',8),
 ('a3k-manga-corner','Manga Corner','podcast','https://feeds.captivate.fm/a3k-manga-corner/',null,'Anime 3000','{Host,Producer,"Executive Producer"}','{entertainment}',9),
 ('a3k-2gam','2 Guys and a Mic','podcast','https://feeds.captivate.fm/a3k-2gam/',null,'Anime 3000','{"Executive Producer"}','{media-production,entertainment}',10),
 ('top-spot-usa','Top Spot USA','youtube',null,'@topspotusa',null,'{}','{media-production,entertainment}',11),
 ('anime-3000','Anime 3000','youtube',null,'@Anime3000a3ktv','Anime 3000','{Host,Producer,"Executive Producer"}','{media-production,entertainment}',12)
on conflict (slug) do nothing;
