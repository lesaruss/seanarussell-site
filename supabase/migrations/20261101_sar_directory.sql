-- seanarussell.com Directory (playbook media-kits, Phase 2b).
--
-- sar_directory  Sean's own profile rows: who and what he has worked with,
--                told from his side. Four kinds:
--                  brand    a client, employer or organization (logo, what Sean did,
--                           case studies, videos he picks)
--                  podcast  a show he hosted or produced; episodes come from
--                           sar_media_episodes (source_slug), Listen on links from
--                           the Vegans Explore listing when one exists (ve_listing)
--                  youtube  a video channel (source_slug), laid out like the
--                           Vegans Explore YouTube listings
--                  guest    a show he was a guest on; the episode is read from the
--                           Press feed (lesaruss.com/api/press) by press_id, not copied
--                parent_slug groups shows under their network (Anime 3000).
--                aliases are the names kits use in worked_with.
--                status draft = owner view only (facts rest on draft stories).
-- sar_media_features.profiles  the profiles a picked clip shows on (Videos tab).
-- RLS on, no policies: read through the sar-directory edge function only.

create table if not exists public.sar_directory (
  slug         text primary key,
  kind         text not null check (kind in ('brand','podcast','youtube','guest')),
  name         text not null,
  logo         text,
  website      text,
  tagline      text,
  about        text,
  relationship text[] not null default '{}',   -- Client, Employer, Partner, Founder
  roles        text[] not null default '{}',   -- Host, Producer, Executive Producer, Guest
  did          jsonb  not null default '[]',   -- [{title, body}]
  kits         text[] not null default '{}',
  case_studies text[] not null default '{}',
  source_slug  text references public.sar_media_sources(slug) on delete set null,
  parent_slug  text references public.sar_directory(slug) on delete set null,
  ve_listing   text,
  press_id     text,
  aliases      text[] not null default '{}',
  status       text not null default 'live' check (status in ('live','draft')),
  sort         int not null default 100,
  updated_at   timestamptz not null default now()
);
alter table public.sar_directory enable row level security;

alter table public.sar_media_features add column if not exists profiles text[] not null default '{}';
create index if not exists sar_media_features_profiles on public.sar_media_features using gin (profiles);

-- Brands. Facts only from published stories, the live kit copy or the Press feed.
insert into public.sar_directory (slug,kind,name,website,tagline,relationship,roles,did,kits,case_studies,aliases,status,sort,logo) values
 ('broward-county-public-schools','brand','Broward County Public Schools','https://www.browardschools.com',
  'The sixth-largest school district in the United States.','{Employer}','{}',
  '[{"title":"District Webmaster","body":"Ran the district''s web presence: CMS migrations, web teams and content governance across a whole district."},
    {"title":"Bond campaign","body":"Led the district bond campaign behind the $800M measure voters approved."},
    {"title":"Summer Program","body":"Built a summer camp from scratch at Silver Ridge Elementary, then grew it to roughly 30 schools across the district."}]',
  '{education,executive-marketing,speaker}','{broward-county-public-schools,bcps-summer-program,bcps-wcm-community-transformation}',
  '{"Silver Ridge Elementary","Broward County Public Schools -- Summer Program"}','live',1,null),
 ('lashmakers','brand','LashMakers',null,
  'A beauty training brand with real demand and a loyal audience around the world.','{Client}','{}',
  '[{"title":"Marketing system","body":"In a 90-day sprint, LESARUSS rebuilt the marketing stack, and quarterly revenue climbed from $167K to more than $262K."}]',
  '{executive-marketing}','{lashmakers}','{}','live',2,null),
 ('balance-for-life-florida','brand','Balance for Life Florida',null,
  'A wellness and health retreat in Florida.','{Client}','{}',
  '[{"title":"Growth system","body":"Over a 12-month build starting in Q4 2020, LESARUSS put a growth system in place, and quarterly revenue went from $12.9K to $107K."}]',
  '{executive-marketing}','{balance-for-life-florida}','{}','live',3,null),
 ('vegans-explore','brand','Vegans Explore','https://vegansexplore.com',
  'Infrastructure for a global Vegan community.','{Founder}','{Host}',
  '[{"title":"Founder","body":"Founded Vegans Explore and hosts the Vegans Explore Podcast, out every Sunday."}]',
  '{vegan-movement,media-production}','{}','{"Vegans Explore"}','live',4,'https://vegansexplore.com/public/logo-ve-landscape-v1.svg'),
 ('soflo-vegans','brand','SoFlo Vegans','https://vegansexplore.com/network/soflo-vegans-podcast/',
  'South Florida''s Vegan community.','{Founder}','{Host}',
  '[{"title":"Founder","body":"Founded SoFlo Vegans and hosts the SoFlo Vegans Podcast."},
    {"title":"Veg Night Out","body":"South Florida''s first all-Vegan street market, in Fort Lauderdale''s MASS District, featured on WSVN 7''s Deco Drive in 2021."}]',
  '{vegan-movement,executive-marketing}','{soflo-vegans}','{}','live',5,null),
 ('anime-3000','brand','Anime 3000',null,
  'An anime, manga and Japanese pop culture network: podcasts, panels and video.','{}','{Host,Producer,"Executive Producer"}',
  '[{"title":"The shows","body":"Host, producer and executive producer of the A3K Podcast, A3K Panel, A3K Radio and Manga Corner, and executive producer of 2 Guys and a Mic."},
    {"title":"In the press","body":"Interviewed by Blerds Online as Sean Russell of Anime 3000 (2014), and a guest on Anime News Network''s ANNCast (2010)."}]',
  '{media-production,entertainment}','{anime-3000-podcast-downloads}','{}','live',6,null),
 ('seed-food-and-wine','brand','Seed Food & Wine',null,null,'{}','{}','[]',
  '{speaker,vegan-movement}','{seed-food-and-wine-marketing}','{"Seed Food & Wine"}','draft',7,null),
 ('michael-klaper','brand','Dr. Michael Klaper',null,null,'{}','{}','[]',
  '{media-production,vegan-movement}','{klaper-moving-medicine-forward}','{"Dr. Michael Klaper"}','draft',8,null),
 ('geekfon-society','brand','GeekFon Society',null,null,'{}','{}','[]',
  '{entertainment}','{geekfon-society-origin}','{"GeekFon Society"}','draft',9,'https://geekfon.ai/geekfon-logo.png')
on conflict (slug) do nothing;

update public.sar_directory set source_slug='anime-3000' where slug='anime-3000';

-- Video channel.
insert into public.sar_directory (slug,kind,name,source_slug,roles,kits,aliases,status,sort) values
 ('top-spot-usa','youtube','Top Spot USA','top-spot-usa','{}','{media-production,entertainment}','{"Top Spot USA"}','live',20)
on conflict (slug) do nothing;

-- Shows Sean hosted or produced, grouped under their network.
insert into public.sar_directory (slug,kind,name,source_slug,roles,kits,parent_slug,ve_listing,aliases,status,sort)
select s.slug, 'podcast', s.name, s.slug, s.roles, s.kits,
  case when s.network = 'Anime 3000' then 'anime-3000' when s.slug = 'soflo-vegans-podcast' then 'soflo-vegans'
       when s.network = 'Vegans Explore' then 'vegans-explore' end,
  case when s.slug in ('vegans-explore-podcast','soflo-vegans-podcast','pre-vegans-podcast','vegans-who-lift-podcast') then s.slug end,
  case when s.slug = 'vegans-explore-podcast' then '{"Vegans Explore Podcast"}'::text[] else '{}'::text[] end,
  'live', 30 + s.sort
from public.sar_media_sources s where s.kind = 'podcast'
on conflict (slug) do nothing;

-- Shows Sean was a guest on: the episode lives in the Press feed (press_id).
insert into public.sar_directory (slug,kind,name,press_id,roles,kits,status,sort) values
 ('plant-powered-athlete','guest','Plant Powered Athlete','plant-powered-athlete','{Guest}','{speaker,vegan-movement}','live',60),
 ('veggies-abroad','guest','Veggies Abroad','veggies-abroad','{Guest}','{speaker,vegan-movement}','live',61),
 ('vegan-linked','guest','Vegan Linked','vegan-linked','{Guest}','{speaker,vegan-movement}','live',62),
 ('plant-paradigm','guest','The Plant Paradigm','plant-paradigm','{Guest}','{speaker,vegan-movement}','live',63),
 ('love-this-food-thing','guest','Love This Food Thing','love-this-food-thing','{Guest}','{speaker,vegan-movement}','live',64),
 ('bloody-vegans','guest','The Bloody Vegans','bloody-vegans','{Guest}','{speaker,vegan-movement}','live',65),
 ('vkind-live','guest','VKind Live','vkind-live','{Guest}','{speaker,vegan-movement}','live',66),
 ('vegan-life-coach','guest','Vegan Life Coach','vegan-life-coach','{Guest}','{speaker,vegan-movement}','live',67),
 ('namaste-bosses','guest','Namaste Bosses','namaste-bosses','{Guest}','{speaker}','live',68),
 ('blaze-the-lion','guest','Blaze the Lion','blaze-the-lion','{Guest}','{speaker}','live',69),
 ('revolutionary-change','guest','Revolutionary Change','revolutionary-change','{Guest}','{speaker}','live',70),
 ('justin-stivers','guest','Justin Stivers Show','justin-stivers','{Guest}','{speaker}','live',71),
 ('livegan-podcast','guest','Livegan Podcast','livegan-podcast','{Guest}','{speaker,vegan-movement}','live',72),
 ('olapi-creative','guest','Ola''pi Creative','olapi-creative','{Guest}','{speaker}','live',73),
 ('anncast','guest','ANNCast','anncast','{Guest}','{speaker,entertainment}','live',74)
on conflict (slug) do nothing;
