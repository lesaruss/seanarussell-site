-- Sean's logos for Vegans Explore and Anime 3000 (2026-11-01, "to replace what you're currently using in the headers"), kept on
-- the site at assets/img/logos/. One logo per brand: the Media network header and tile, and the Directory entry.
update public.sar_watch_networks set logo = 'https://www.seanarussell.com/assets/img/logos/vegans-explore.webp' where slug = 'vegans-explore';
update public.sar_watch_networks set logo = 'https://www.seanarussell.com/assets/img/logos/anime-3000.webp' where slug = 'anime-3000';
update public.sar_directory set logo = 'https://www.seanarussell.com/assets/img/logos/vegans-explore.webp', updated_at = now() where slug = 'vegans-explore';
update public.sar_directory set logo = 'https://www.seanarussell.com/assets/img/logos/anime-3000.webp', updated_at = now() where slug = 'anime-3000';
