-- Site health, 2026-11-11: seanarussell.com scored 72 for speed, with about 11.5 MB of
-- oversized pictures on the homepage alone. Each kit's pose and scene picture now has a
-- WebP copy beside the original (same picture, at most 1920 px wide), and the kits point
-- at the copies. The PNG originals stay in the repo for share previews.
update public.sar_kits
set pose  = regexp_replace(pose,  '\.(png|jpe?g)$', '.webp')
where pose  like '/assets/%' and pose  ~ '\.(png|jpe?g)$';
update public.sar_kits
set scene = regexp_replace(scene, '\.(png|jpe?g)$', '.webp')
where scene like '/assets/%' and scene ~ '\.(png|jpe?g)$';

-- The kit pose is never shown wider than 200 px (the home page cards and the kit page),
-- so the kits use 600 px card copies (-card.webp), sharp on 3x screens.
update public.sar_kits
set pose = regexp_replace(pose, '-hero\.webp$', '-hero-card.webp')
where pose ~ '^/assets/poses/lesaruss-[a-z0-9]+-hero\.webp$';
