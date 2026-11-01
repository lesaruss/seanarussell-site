/*
 * The Directory's tile, shared (Sean, 2026-11-01: "use the same style you use for the directory... literally the same tile...
 * That's how we grow exponentially with this platform, is by reusing things and not redoing them").
 *
 * One file draws the tile on /directory and on /watch, so a change here changes both.
 *
 *   SARDir.css()                         adds the tile styles once (the page supplies the --ink, --orange... tokens)
 *   SARDir.card(item, opts) -> html      item: a sar-directory item {slug, kind, name, logo, tagline, roles, relationship,
 *                                        status, episodes, year, parent_slug}
 *                                        opts.key  role tag meanings (sar-directory list .key), for each tag's title
 *                                        opts.by   items by slug, for a show's network name
 *                                        opts.href where the tile opens (default /directory/<slug>)
 *                                        opts.sub  the small line under the tagline, in place of the default
 *   SARDir.grid(html) -> html            the tile grid
 *   SARDir.esc(s)
 */
(function () {
  var CSS = [
    '.sard-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
    '.sard-card{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:start;border:1.5px solid var(--line,#1a1a1a);border-radius:6px;padding:12px;text-decoration:none;color:inherit;background:#fff;transition:transform .15s,box-shadow .15s;min-width:0}',
    '.sard-card:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--orange,#F69820)}',
    '.sard-card:focus-visible{outline:3px solid var(--orange,#F69820);outline-offset:2px}',
    '.sard-logo{width:72px;height:72px;border:1px solid var(--hair,rgba(26,26,26,.12));border-radius:6px;background:#fff;display:grid;place-items:center;overflow:hidden}',
    '.sard-logo img{width:100%;height:100%;object-fit:contain;padding:6px}',
    '.sard-logo.cover img{padding:0}',
    '.sard-logo b{font-weight:900;font-size:20px;color:var(--orange-ink,#7d4a00)}',
    '.sard-bd{display:grid;gap:5px;min-width:0}',
    '.sard-nm{font-weight:800;font-size:14.5px;line-height:1.25}',
    '.sard-tg{font-size:12.5px;line-height:1.45;color:var(--ink2,#55524e);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.sard-sub{font-size:11px;font-weight:700;color:var(--ink3,#8a8580)}',
    '.sard-pills{display:flex;gap:4px;flex-wrap:wrap}',
    '.sard-pill{font:800 9.5px/1 var(--font,Montserrat,sans-serif);letter-spacing:.08em;text-transform:uppercase;padding:4px 6px;border-radius:4px;background:var(--orange-wash,#fdf2e3);color:var(--orange-ink,#7d4a00);border:1px solid rgba(246,152,32,.4);cursor:help}',
    '.sard-pill.rel{background:var(--ink,#1a1a1a);color:#fff;border-color:var(--ink,#1a1a1a)}',
    '.sard-pill.draft{background:#fff;color:#a33;border-color:#a33;cursor:default}',
    '.sard-pill.on{background:var(--orange,#F69820);color:#1a1a1a;border-color:var(--orange,#F69820);cursor:default}',
    '@media (max-width:1200px){.sard-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@media (max-width:880px){.sard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media (max-width:560px){.sard-grid{grid-template-columns:1fr}}',
    '@media (prefers-reduced-motion:reduce){.sard-card{transition:none}}'
  ].join('');
  function css() {
    if (document.getElementById('sard-css')) return;
    var s = document.createElement('style'); s.id = 'sard-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function initials(n) { return String(n || '').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function logo(it) {
    var cover = it.kind === 'podcast' || it.kind === 'guest' || it.kind === 'youtube';
    return '<span class="sard-logo' + (cover ? ' cover' : '') + '">' + (it.logo ? '<img src="' + esc(it.logo) + '" alt="" loading="lazy">' : '<b>' + esc(initials(it.name)) + '</b>') + '</span>';
  }
  function pills(it, key) {
    key = key || {};
    var p = (it.relationship || []).map(function (r) { return '<span class="sard-pill rel" title="' + esc(r + ': ' + (key[r] || '')) + '">' + esc(r) + '</span>'; })
      .concat((it.roles || []).map(function (r) { return '<span class="sard-pill" title="' + esc(r + ': ' + (key[r] || '')) + '">' + esc(r) + '</span>'; }))
      .concat((it.extra || []).map(function (x) { return '<span class="sard-pill ' + esc(x[1] || '') + '">' + esc(x[0]) + '</span>'; }));
    if (it.status === 'draft') p.push('<span class="sard-pill draft">Draft, only you see this</span>');
    return p.length ? '<span class="sard-pills">' + p.join('') + '</span>' : '';
  }
  function sub(it, by) {
    var parent = it.parent_slug && by && by[it.parent_slug] ? by[it.parent_slug].name : '';
    var bits = [];
    if (it.kind === 'podcast') { if (parent) bits.push(parent); if (it.episodes) bits.push(it.episodes + ' episodes'); }
    if (it.kind === 'youtube' && it.episodes) bits.push(it.episodes + ' videos');
    if (it.kind === 'guest' && it.year) bits.push(String(it.year));
    return bits.join(' · ');
  }
  function card(it, opts) {
    opts = opts || {};
    var s = opts.sub != null ? opts.sub : sub(it, opts.by);
    return '<a class="sard-card" href="' + esc(opts.href || '/directory/' + encodeURIComponent(it.slug)) + '">' + logo(it) +
      '<span class="sard-bd"><span class="sard-nm">' + esc(it.name) + '</span>' + pills(it, opts.key) +
      (it.tagline ? '<span class="sard-tg">' + esc(it.tagline) + '</span>' : '') + (s ? '<span class="sard-sub">' + esc(s) + '</span>' : '') + '</span></a>';
  }
  window.SARDir = { css: css, card: card, esc: esc, grid: function (html) { return '<div class="sard-grid">' + html + '</div>'; } };
})();
