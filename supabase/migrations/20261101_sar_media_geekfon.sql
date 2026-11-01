-- GeekFon Society under Networks (Sean, 2026-11-01: "put Geek Fun Society under networks... when you click on it, the next
-- tiles are the artists. Same format, same look and feel... the square image, profile image of the artist, their name, the pill
-- would be their genre, and then a little short blurb... When you click on there, I wanted to go to their page"). A network's
-- kind says what its tiles are: shows (sar_watch_shows) or artists (GeekFon's own roster, read by sar-media from
-- geekfon.ai/api/home, so the roster, its order, photos, genres and taglines stay GeekFon's). An artist opens their geekfon.ai
-- page inside /media (?embed=1; join and support open on geekfon.ai).
alter table public.sar_watch_networks add column if not exists kind text not null default 'shows';
alter table public.sar_watch_networks drop constraint if exists sar_watch_networks_kind_check;
alter table public.sar_watch_networks add constraint sar_watch_networks_kind_check check (kind in ('shows','artists'));
insert into public.sar_watch_networks (slug, name, tagline, logo, sort, kind) values
 ('geekfon-society', 'GeekFon Society', 'A record label of animated artists.',
  'https://fwbhwfxpncrsfhttimna.supabase.co/storage/v1/object/public/vegan-media/sar/logos/geekfon-society-mvxm8neo.png', 4, 'artists')
on conflict (slug) do nothing;
