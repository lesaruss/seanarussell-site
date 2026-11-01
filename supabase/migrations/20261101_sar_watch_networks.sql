-- Watch, rebuilt the Vegans Explore way (Sean, 2026-11-01: "it should be Vegans Explore, Top Spot USA, Anime 3000. And then
-- when you click those, you should see the shows that are underneath it... a thumbnail, then the name of the show... then you
-- get the profile with all the episodes... 3/4 ... and then you have 1/4 for ads... the podcast version... the same way it
-- shows on Vegans Explore... the feed should stay up to date... use the playlist as shows... similar to how Brooke's page is").
--
-- sar_watch_networks  the three networks on /watch
-- sar_watch_shows     each network's shows: a podcast (sar_media_sources, its RSS feed), a channel (sar_media_sources, the
--                     channel's uploads: A3K TV) or a YouTube playlist (ve_youtube_playlists, the shared playlist engine that
--                     keeps Brooke Sellers' series current, read again every 6 hours by ve-youtube-refresh)
-- RLS on, no policies: read through the sar-media edge function.

create table if not exists public.sar_watch_networks (
  slug    text primary key,
  name    text not null,
  tagline text,
  logo    text,
  sort    int not null default 100
);
create table if not exists public.sar_watch_shows (
  slug         text primary key,
  network_slug text not null references public.sar_watch_networks(slug) on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('podcast','channel','playlist')),
  source_slug  text references public.sar_media_sources(slug) on delete set null,
  playlist_id  text,
  cover        text,
  about        text,
  roles        text[] not null default '{}',
  status       text not null default 'live' check (status in ('live','draft')),
  sort         int not null default 100,
  check ((kind = 'playlist') = (playlist_id is not null)),
  check (kind = 'playlist' or source_slug is not null)
);
alter table public.sar_watch_networks enable row level security;
alter table public.sar_watch_shows enable row level security;

insert into public.sar_watch_networks (slug, name, tagline, logo, sort) values
 ('vegans-explore', 'Vegans Explore', 'The Vegan world this week, South Florida''s Vegan story, and the questions people ask before they go Vegan.',
  'https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/vegan-media/sar/logos/vegans-explore-mvxm8nh7.svg', 1),
 ('top-spot-usa', 'Top Spot USA', 'Independent music: artist interviews, live footage, radio and the shows behind them.',
  (select cover from public.sar_media_sources where slug = 'top-spot-usa'), 2),
 ('anime-3000', 'Anime 3000', 'Anime, manga and Japanese pop culture: the podcasts, the panels and A3K TV.',
  'https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/vegan-media/sar/logos/anime-3000-mvxm8nip.png', 3)
on conflict (slug) do nothing;

insert into public.sar_watch_shows (slug, network_slug, name, kind, source_slug, roles, sort) values
 ('vegans-explore-podcast', 'vegans-explore', 'Vegans Explore Podcast', 'podcast', 'vegans-explore-podcast', '{Host,Producer}', 1),
 ('soflo-vegans-podcast', 'vegans-explore', 'SoFlo Vegans Podcast', 'podcast', 'soflo-vegans-podcast', '{Host,Producer}', 2),
 ('pre-vegans-podcast', 'vegans-explore', 'Pre-Vegans Podcast', 'podcast', 'pre-vegans-podcast', '{Host}', 3),
 ('a3k-podcast', 'anime-3000', 'A3K Podcast', 'podcast', 'a3k-podcast', '{Host,Producer,"Executive Producer"}', 1),
 ('a3k-radio', 'anime-3000', 'A3K Radio', 'podcast', 'a3k-radio', '{Host,Producer,"Executive Producer"}', 2),
 ('a3k-panel', 'anime-3000', 'A3K Panel', 'podcast', 'a3k-panel', '{Host,Producer,"Executive Producer"}', 3),
 ('a3k-manga-corner', 'anime-3000', 'Manga Corner', 'podcast', 'a3k-manga-corner', '{Host,Producer,"Executive Producer"}', 4),
 ('a3k-2gam', 'anime-3000', '2 Guys and a Mic', 'podcast', 'a3k-2gam', '{"Executive Producer"}', 5),
 ('a3k-tv', 'anime-3000', 'A3K TV', 'channel', 'anime-3000', '{}', 6),
 ('mr-russells-class', 'top-spot-usa', 'Mr. Russell''s Class', 'podcast', 'mr-russells-class', '{Host}', 1)
on conflict (slug) do nothing;

-- Top Spot USA's playlists, each a show (YouTube, channel UCa6dCQD_Uyg2XrNrle-iOeg, read 2026-11-01). No per-show roles: Sean
-- gave his Top Spot USA credits for the channel as a whole (Co-founder, Executive Producer, Producer, Host, Editor, Videographer,
-- Writer), shown on the network, not split across playlists by guess.
insert into public.sar_watch_shows (slug, network_slug, name, kind, playlist_id, roles, sort) values
 ('tsusa-interviews', 'top-spot-usa', 'TSUSA TV: Interviews', 'playlist', 'PL7UCtJUYXbFBgwjU1FyMb8rxkAxUsq-A_', '{}', 2),
 ('tsusa-mr-russell', 'top-spot-usa', 'TSUSA TV: Mr. Russell', 'playlist', 'PL7UCtJUYXbFD9UhoDs9ce_W5NwRlli3ph', '{}', 3),
 ('tsusa-tv', 'top-spot-usa', 'TSUSA TV', 'playlist', 'PLAE5C72F86453CA83', '{}', 4),
 ('tsusa-radio', 'top-spot-usa', 'TSUSA Radio', 'playlist', 'PL23B147625BE0C4F9', '{}', 5),
 ('tsusa-live', 'top-spot-usa', 'TSUSA Live', 'playlist', 'PLFE5818F97DDC9F9A', '{}', 6),
 ('tsusa-news', 'top-spot-usa', 'TSUSA News', 'playlist', 'PL0E335885439ACCD7', '{}', 7),
 ('tsusa-showcase', 'top-spot-usa', 'Showcase', 'playlist', 'PL40DE836C9FEBF86C', '{}', 8),
 ('tsusa-live-footage', 'top-spot-usa', 'Live Footage', 'playlist', 'PL7D7FF3A0857BBE74', '{}', 9),
 ('tsusa-all-access', 'top-spot-usa', 'All Access', 'playlist', 'PL1B44810974BA15D4', '{}', 10)
on conflict (slug) do nothing;

insert into public.ve_youtube_playlists (playlist_id, label, site)
select playlist_id, name, 'seanarussell.com' from public.sar_watch_shows where kind = 'playlist'
on conflict (playlist_id) do nothing;

-- The ad rail on Watch (one tall slot a page; ve-ad-rail.js with data-ad-brand).
insert into public.ad_placements (brand_slug, site_name, site_url, page_name, page_slug, slot_id, slot_position, dimensions, status, notes)
select 'sean-a-russell', 'Sean A. Russell', 'https://www.seanarussell.com', 'Watch', 'sar-watch', 'sar-watch-skyscraper', 'sticky-sidebar', '300x600', 'active',
  'The rail on every /watch view (network, show, episode). Sean, 2026-11-01: "I want to run ads on our content here."'
where not exists (select 1 from public.ad_placements where brand_slug = 'sean-a-russell' and page_slug = 'sar-watch');

-- Keep every feed current: hourly, sar-media reads any of Sean's sources older than 6 hours.
select cron.schedule('sar-media-refresh', '29 * * * *', $c$
  select net.http_post(url := 'https://fwbhwfxpncrsfhttimna.supabase.co/functions/v1/sar-media?action=refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.lesaruss_secrets where key = 'CRON_SECRET'),
      'Authorization', 'Bearer ' || (select value from public.lesaruss_secrets where key = 'SUPABASE_ANON_KEY')),
    body := '{"stale_hours":6}'::jsonb, timeout_milliseconds := 150000)
$c$);
