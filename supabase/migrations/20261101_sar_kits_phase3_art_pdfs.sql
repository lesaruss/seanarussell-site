-- media-kits Phase 3 batch B (Sean, 2026-11-01: "A, ship it").
-- Entertainment & Music gets its scene (variant A, convention panel, same
-- illustrated style; 16:9, shown whole). Three kits get their PDFs, which the
-- kit page offers on private links only. Applied after the files were live.
update public.sar_kits set scene = '/assets/photos/entertainment/convention-panel.png',
  scene_caption = 'On the panel: entertainment and music, live with the fans'
  where slug = 'entertainment';
update public.sar_kits set pdf_url = '/kit/' || slug || '-kit.pdf'
  where slug in ('education', 'media-production', 'speaker');
