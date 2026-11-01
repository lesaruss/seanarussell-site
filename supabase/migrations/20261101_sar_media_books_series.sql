-- Media (Sean, 2026-11-01: "this section, I think, should turn to media. And then I'll have all the stuff I've produced...
-- the book... these organizations, and then all of it can be just filterable"). Watch becomes /media. Its networks and shows
-- stay as they are (sar_watch_networks, sar_watch_shows); books and series are Directory records too, so one record feeds
-- every place it shows. Each opens its own page on the site (website). Events come later.
alter table public.sar_directory drop constraint if exists sar_directory_kind_check;
alter table public.sar_directory add constraint sar_directory_kind_check check (kind in ('brand','podcast','youtube','guest','book','series','event'));

-- Facts from the pages that already exist: pre-vegans.html (cover, subtitle, Amazon) and blur-to-blueprint.html (lede, the
-- $11 offer, Chapters One and Two). From Blur to Blueprint is a series: chapters release over time (Sean, 2026-11-01).
insert into public.sar_directory (slug, kind, name, logo, website, tagline, relationship, roles, status, sort) values
 ('from-blur-to-blueprint', 'series', 'From Blur to Blueprint', 'https://d8j0ntlcm91z4.cloudfront.net/user_3CDGnUNmLloVUBJsrfOxR8cZFdv/hf_20260816_204016_3cd73de7-d830-4382-ad7d-863796ee6a90.png',
  '/blur-to-blueprint', 'A coming-of-age story for builders, told chapter by chapter.', '{Author}', '{}', 'live', 1),
 ('pre-vegans', 'book', 'Pre-Vegans', '/assets/prevegans-cover.webp',
  '/pre-vegans', 'Inspirational Stories to Help You on Your Vegan Journey. Sean''s first book: eight conversations with voices in the Vegan movement.', '{Author}', '{}', 'live', 2)
on conflict (slug) do nothing;
