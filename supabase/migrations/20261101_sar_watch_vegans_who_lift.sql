-- Vegans Who Lift under Vegans Explore on Watch (Sean, 2026-11-01: "Add Vegans Who Lift under Vegans Explore").
-- Roles from its sar_media_sources row (Producer, Executive Producer).
insert into public.sar_watch_shows (slug, network_slug, name, kind, source_slug, roles, sort) values
 ('vegans-who-lift-podcast', 'vegans-explore', 'Vegans Who Lift Podcast', 'podcast', 'vegans-who-lift-podcast', '{Producer,"Executive Producer"}', 4)
on conflict (slug) do nothing;
