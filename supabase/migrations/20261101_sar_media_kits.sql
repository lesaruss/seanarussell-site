-- seanarussell.com media kits (playbook media-kits, brand sean-a-russell, Phase 1).
--
-- One kit per industry, all rendered by the same template (kit.html) from this
-- table plus the case_studies rows tagged into the kit. Read only through the
-- sar-kits edge function (service role): RLS is on with no policies, so the
-- browser never reads these tables directly.
--
-- stats: [{v, l, src, public}]. public=true only when src is a published case
-- study or copy already published on seanarussell.com (PROOF: provenance).
-- terms and pdf_url are shown only on the shared-link and owner views.
-- Case studies join a kit through case_studies.audience_tags 'sar-kit:<slug>'.

create table if not exists public.sar_kits (
  slug          text primary key,
  name          text not null,
  role_line     text not null,
  tagline       text not null,
  pose          text not null,          -- 3:4 full-body pose, shown whole
  scene         text,                   -- 16:9 scene, null = new art needed
  scene_caption text,
  stats         jsonb not null default '[]'::jsonb,
  pillars       jsonb not null default '[]'::jsonb,   -- [[title, line]]
  tags          text[] not null default '{}',
  track_record  text,
  terms         jsonb not null default '[]'::jsonb,   -- shared and owner views only
  pdf_url       text,                                 -- shared and owner views only
  worked_with   text[] not null default '{}',
  status        text not null default 'draft' check (status in ('live','draft')),
  sort          int not null default 100,
  updated_at    timestamptz not null default now()
);

create table if not exists public.sar_kit_links (
  token       text primary key,
  kit_slug    text not null references public.sar_kits(slug) on delete cascade,
  label       text,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  last_opened_at timestamptz,
  opens       int not null default 0
);
create index if not exists sar_kit_links_kit on public.sar_kit_links(kit_slug);

alter table public.sar_kits enable row level security;
alter table public.sar_kit_links enable row level security;

insert into public.sar_kits (slug,name,role_line,tagline,pose,scene,scene_caption,stats,pillars,tags,track_record,terms,pdf_url,worked_with,status,sort) values
('executive-marketing','Executive Marketing','Fractional CMO · VP Marketing',
 'Twenty years leading marketing, content and production teams, most recently as the strategist behind an $800M voter-approved bond campaign.',
 '/assets/poses/lesaruss-author-hero.png','/assets/photos/executive/why-proven-at-scale.png','At the board: results over activity',
 '[{"v":"$800M","l":"Voter-approved bond campaign led","src":"case_studies:broward-county-public-schools","public":true},
   {"v":"10.16x","l":"Top return on ad spend, LashMakers","src":"case_studies:lashmakers","public":true},
   {"v":"730%","l":"Quarterly revenue growth, Balance for Life Florida","src":"case_studies:balance-for-life-florida","public":true},
   {"v":"100+","l":"Clients served","src":"seanarussell.com/kit/executive-marketing","public":true}]',
 '[["Systems thinker","Every engagement becomes a repeatable system that keeps compounding after the first quarter."],["AI-powered, human-backed","LESARUSS runs the marketing department; community managers handle the relationships."],["Proven at scale","Judged on delivered numbers across civic, beauty, wellness and entertainment."]]',
 '{CMO,Fractional,Remote}',
 'Founder and CEO of Lesaruss Inc. since 2007. B.S., Television Production, Florida International University.',
 '["Full-time CMO or VP Marketing, remote only","Fractional CMO engagements","Marketing systems consulting","Board and advisory roles"]',
 '/kit/executive-marketing-kit.pdf',
 '{"Broward County Public Schools","LashMakers","Balance for Life Florida","SoFlo Vegans"}','live',1),
('education','Education','K-12 Systems · Web · Programs',
 'Twenty years inside K-12 systems: district web, programs grown from a single pilot, and the work behind K12 Unlocked and ADA Unlocked.',
 '/assets/poses/lesaruss-k12-hero.png','/assets/poses/sar-education-thumb.png','In the classroom: systems you can teach',
 '[{"v":"20+","l":"Years inside K-12 and transformation work","src":"seanarussell.com/ (homepage)","public":true},
   {"v":"~30","l":"Schools reached by the Summer Program, grown from one pilot","src":"case_studies:bcps-summer-program","public":true},
   {"v":"$800M","l":"District bond campaign led","src":"case_studies:broward-county-public-schools","public":true},
   {"v":"230+","l":"Schools on a CMS Sean migrated","src":"case_studies:bcps-wcm-community-transformation","public":false},
   {"v":"12 yrs","l":"Russell''s Roving Reporters, every school morning","src":"case_studies:russells-roving-reporters","public":false}]',
 '[["District web","CMS migrations, web teams and content governance across a whole district."],["Programs that scale","From one school pilot to a district model."],["Accessibility","ADA Unlocked: remediation, policy and training."]]',
 '{K-12,"Public sector",Accessibility}',
 'District Webmaster, Broward County Public Schools, the sixth-largest school district in the United States.',
 '["District consulting engagements","CMS migration leadership","Program design and rollout"]',
 null,
 '{"Broward County Public Schools","Silver Ridge Elementary"}','live',2),
('media-production','Media & Production','Producer · On Camera · Actor',
 'Thirty years building systems, communities and stories that move culture. Available as a producer, on-camera talent or actor. Often, all three.',
 '/assets/poses/lesaruss-producer-hero.png','/assets/photos/geekfon/proven-storyteller.png','On the mic: producing the show',
 '[{"v":"300+","l":"Projects produced","src":"seanarussell.com/kit/media-industry","public":true},
   {"v":"1M+","l":"Community reach","src":"seanarussell.com/kit/media-industry","public":true},
   {"v":"30","l":"Years active","src":"seanarussell.com/kit/media-industry","public":true},
   {"v":"1M+","l":"Podcast downloads, Anime 3000","src":"case_studies:anime-3000-podcast-downloads","public":false}]',
 '[["Produce","Shows, podcasts and live streams, end to end."],["On camera","Host, interviewer and actor."],["Build the audience","Communities that outlast the show."]]',
 '{Producer,"On camera",Podcast}',
 'Content featured on NBC, ABC, MTV and Crunchyroll.',
 '["Producer, per project","Host and on-camera talent","Podcast and stream production"]',
 null,
 '{"Anime 3000","Top Spot USA","Dr. Michael Klaper","Vegans Explore Podcast"}','live',3),
('speaker','Speaker & Host','Keynotes · Panels · Host',
 'You are not booking a speaker. You are bringing in infrastructure: a platform, a growing Vegan community and an operator who has done this at every scale.',
 '/assets/poses/lesaruss-speaker-hero.png','/assets/photos/geekfon/community-first.png','In the room with the audience',
 '[{"v":"1","l":"Keynote: From Blur to Blueprint","src":"seanarussell.com/speaker","public":true},
   {"v":"6","l":"Talk topics, one for every room","src":"seanarussell.com/speaker","public":true},
   {"v":"4","l":"Parts to every booking: platform, community, promotion, production","src":"seanarussell.com/speaker","public":true}]',
 '[["The keynote","From Blur to Blueprint: the origin story and the system that came out of it."],["Every room","Movement architecture, K-12 transformation, Vegan community building, AI as operating system."],["The production","A run-of-show drafted within a week. Sean solo or with full LESARUSS production."]]',
 '{Keynote,Panel,Host}',
 'Speaker and host on the Seed Food & Wine stage.',
 '["Keynotes","Panels and moderation","Hosting and MC"]',
 null,
 '{"Seed Food & Wine","Broward County Public Schools"}','live',4),
('vegan-movement','Vegan Movement','Community · Events · Media',
 'A decade building South Florida''s Vegan community, seven years running marketing for Seed Food & Wine, and now Vegans Explore.',
 '/assets/poses/lesaruss-host-hero.png','/assets/photos/geekfon/audience-builder.png','On stage at Seed Food & Wine Week',
 '[{"v":"10 yrs","l":"SoFlo Vegans","src":"case_studies:soflo-vegans","public":false},
   {"v":"7 yrs","l":"Chair of marketing, Seed Food & Wine","src":"case_studies:seed-food-and-wine-marketing","public":false}]',
 '[["Community","Chapters, ambassadors and creators."],["Events","Festivals and city crawls."],["Media","Interviews, the Daily Pulse and the Pre-Vegans book."]]',
 '{Community,Events,"Vegans Explore"}',
 'Author of Pre-Vegans. Speaker at Seed Food & Wine.',
 '["Event marketing","Brand partnerships","Hosting and panels"]',
 null,
 '{"Seed Food & Wine","SoFlo Vegans","Vegans Explore","Dr. Michael Klaper"}','draft',5),
('entertainment','Entertainment & Music','Music · Animation · Story worlds',
 'From running a writers'' league as a teenager to GeekFon Society: story worlds with an audience built in.',
 '/assets/poses/lesaruss-actor-hero.png',null,null,
 '[{"v":"5 yrs","l":"Ultimate Championship Federation","src":"case_studies:ucf","public":true}]',
 '[["Original IP","Characters, worlds and series."],["Music","A&R for an animated roster."],["Fandom","Communities around the work."]]',
 '{Music,Animation,IP}',
 'Creator of GeekFon Society.',
 '["Licensing and collaboration","Development deals"]',
 null,
 '{"GeekFon Society","Anime 3000","Top Spot USA"}','draft',6)
on conflict (slug) do nothing;

-- Tag case studies into kits. Append only; never removes an existing tag.
with t(slug, tags) as (values
  ('broward-county-public-schools', array['sar-kit:executive-marketing','sar-kit:education']),
  ('lashmakers',                    array['sar-kit:executive-marketing']),
  ('balance-for-life-florida',      array['sar-kit:executive-marketing']),
  ('bcps-summer-program',           array['sar-kit:education']),
  ('bcps-wcm-community-transformation', array['sar-kit:education']),
  ('russells-roving-reporters',     array['sar-kit:education']),
  ('chester-is-cool',               array['sar-kit:education']),
  ('anime-3000-podcast-downloads',  array['sar-kit:media-production','sar-kit:entertainment']),
  ('top-spot-usa',                  array['sar-kit:media-production','sar-kit:entertainment']),
  ('klaper-moving-medicine-forward',array['sar-kit:media-production','sar-kit:vegan-movement']),
  ('sean-140-day-social-sprint',    array['sar-kit:media-production']),
  ('seed-food-and-wine-marketing',  array['sar-kit:vegan-movement','sar-kit:speaker']),
  ('soflo-vegans',                  array['sar-kit:vegan-movement']),
  ('vegan-foodie-fest',             array['sar-kit:vegan-movement']),
  ('geekfon-society-origin',        array['sar-kit:entertainment']),
  ('ucf',                           array['sar-kit:entertainment'])
)
update public.case_studies c
   set audience_tags = (select array_agg(distinct x) from unnest(coalesce(c.audience_tags,'{}') || t.tags) x)
  from t
 where c.slug = t.slug;

-- Fee ranges for private links, kept apart from terms (the ways to work
-- together) so the owner checklist only reads done once Sean sets real fees.
alter table public.sar_kits add column if not exists fees jsonb not null default '[]'::jsonb;

-- Fee ranges set by Logan as Sean's manager (Sean, 2026-11-01: "set my rates
-- based on what you feel I should be paid"). Shown on private links only.
-- The $2,500 internal floor is never printed.
update public.sar_kits set fees = '["Fractional CMO: from $7,500 a month, 3-month minimum","Marketing systems build: from $10,000 per project","Advisory or board seat: from $3,000 a month","Full-time CMO or VP Marketing: compensation discussed directly"]'::jsonb, updated_at = now() where slug = 'executive-marketing';
update public.sar_kits set fees = '["District consulting: from $10,000 per engagement","CMS migration leadership: from $25,000, scoped per project","Program design and rollout: from $7,500","Staff workshop: $2,500 per half day"]'::jsonb, updated_at = now() where slug = 'education';
update public.sar_kits set fees = '["Producer: from $5,000 per project","Host and on-camera talent: $2,500 a day","Podcast production: from $3,500 a month, four episodes"]'::jsonb, updated_at = now() where slug = 'media-production';
update public.sar_kits set fees = '["Keynote: from $7,500 plus travel","Virtual keynote: $5,000","Panel or moderation: $3,500","Host or MC: $5,000 a day"]'::jsonb, updated_at = now() where slug = 'speaker';
