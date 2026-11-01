-- GeekFon Society titles (Sean, 2026-11-01: "Same titles, founder"): Founder plus the titles he holds on Vegans Explore and
-- Anime 3000. The record goes live so Media's GeekFon Society tile and network page show them.
update public.sar_directory set relationship = '{Founder}', roles = '{Host,"Executive Producer",Producer,Editor,Videographer,Writer}',
  tagline = coalesce(tagline, 'A record label of animated artists.'), status = 'live', updated_at = now()
where slug = 'geekfon-society';
