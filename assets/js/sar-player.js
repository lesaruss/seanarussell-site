/* sar-player.js: Watch & Listen on seanarussell.com (playbook media-kits, Phase 2).
 *
 * One player for /watch and every kit page.
 *   Video (an item with a youtube_id) opens in a pop-up that plays only the
 *   chosen stretch: youtube-nocookie with start and end, plus Keep watching on
 *   YouTube. Escape or the close button ends it.
 *   Audio (an item with only an audio_url) plays in a bar docked at the foot of
 *   the window, from the start second and stopping at the end second for a
 *   highlight. Moving to another page keeps your place: the next page shows the
 *   bar paused with Resume (browsers do not let a page start sound on its own).
 *
 *   SARPlayer.card(item)         a clip card's markup (data-sar-play=<index>)
 *   SARPlayer.bind(root, items)  wires the cards inside root to play items[i]
 *   SARPlayer.play(item)
 *   SARPlayer.esc(s), SARPlayer.clock(seconds)
 */
(function () {
  if (window.SARPlayer) return;
  var KEY = 'sar_audio';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clock(x) {
    x = Math.max(0, Math.round(+x || 0));
    var h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), s = x % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function store(v) { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  var css = '' +
    '.sarp-card{border:1.5px solid #1a1a1a;border-radius:6px;overflow:hidden;background:#fff;text-align:left;padding:0;cursor:pointer;color:inherit;font:inherit;display:grid;grid-template-rows:auto 1fr;min-width:0;transition:transform .15s,box-shadow .15s}' +
    '.sarp-card:hover,.sarp-card:focus-visible{transform:translate(-2px,-2px);box-shadow:4px 4px 0 #F69820;outline:none}' +
    '.sarp-th{position:relative;aspect-ratio:16/9;max-width:100%;background:#0d0d0d center/cover no-repeat;border-bottom:1.5px solid #1a1a1a}' +
    '.sarp-th.sq{background-size:contain;background-color:#0d0d0d}' +
    '.sarp-kind{position:absolute;left:8px;top:8px;font:800 9.5px/1 Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase;background:#1a1a1a;color:#fff;padding:5px 7px;border-radius:4px}' +
    '.sarp-len{position:absolute;right:8px;bottom:8px;font:700 11px/1 Montserrat,sans-serif;background:rgba(0,0,0,.72);color:#fff;padding:4px 6px;border-radius:4px;font-variant-numeric:tabular-nums}' +
    '.sarp-bd{padding:10px 12px 12px;display:grid;gap:4px;align-content:start}' +
    '.sarp-bd small{font:700 10px/1.3 Montserrat,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#7d4a00}' +
    '.sarp-bd b{font:700 14px/1.3 Montserrat,sans-serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.sarp-bd span{font:400 12.5px/1.45 Montserrat,sans-serif;color:#55524e;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.sarp-modal{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}' +
    '.sarp-modal[hidden]{display:none}' +
    '.sarp-box{width:min(960px,100%);background:#fff;border-radius:6px;overflow:hidden;box-shadow:8px 8px 0 #F69820;position:relative}' +
    '.sarp-frame{position:relative;aspect-ratio:16/9;background:#000}' +
    '.sarp-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
    '.sarp-meta{padding:14px 18px 18px;display:grid;gap:6px;font-family:Montserrat,sans-serif}' +
    '.sarp-meta small{font-weight:800;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7d4a00}' +
    '.sarp-meta b{font-weight:900;font-size:18px;line-height:1.2}' +
    '.sarp-meta p{margin:0;font-size:13.5px;color:#55524e}' +
    '.sarp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}' +
    '.sarp-btn{display:inline-flex;align-items:center;gap:6px;font:800 11px/1 Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.1em;padding:11px 14px;border-radius:6px;background:#F69820;color:#1a1a1a;border:1.5px solid #F69820;text-decoration:none;cursor:pointer}' +
    '.sarp-btn.ghost{background:#fff;border-color:#1a1a1a}' +
    '.sarp-x{position:absolute;top:8px;right:8px;z-index:2;width:36px;height:36px;border-radius:6px;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:22px;line-height:1;cursor:pointer}' +
    '.sarp-bar{position:fixed;left:0;right:0;bottom:0;z-index:90;background:#0d0d0d;color:#fff;border-top:2px solid #F69820;display:grid;grid-template-columns:44px 44px minmax(0,1fr) auto 36px;gap:12px;align-items:center;padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));font-family:Montserrat,sans-serif}' +
    '.sarp-bar[hidden]{display:none}' +
    '.sarp-art{width:44px;height:44px;border-radius:4px;background:#333 center/cover}' +
    '.sarp-pp{width:44px;height:44px;border-radius:50%;border:0;background:#F69820;color:#1a1a1a;font-weight:900;font-size:15px;cursor:pointer}' +
    '.sarp-info{min-width:0;display:grid;gap:2px}' +
    '.sarp-info b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sarp-info span{font-size:11px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.sarp-track{height:4px;background:rgba(255,255,255,.2);border-radius:2px;cursor:pointer}' +
    '.sarp-track i{display:block;height:4px;width:0;background:#F69820;border-radius:2px}' +
    '.sarp-time{font-size:11px;opacity:.75;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.sarp-close{width:36px;height:36px;border:0;background:none;color:#fff;font-size:22px;cursor:pointer}' +
    'body.sarp-has-bar{padding-bottom:76px}' +
    '@media (max-width:520px){.sarp-bar{grid-template-columns:44px minmax(0,1fr) 36px}.sarp-art,.sarp-time{display:none}}' +
    '@media (prefers-reduced-motion:reduce){.sarp-card{transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function range(it) {
    return it.format === 'highlight' ? clock(it.start_s) + ' to ' + clock(it.end_s) : (it.duration_s ? clock(it.duration_s) : 'Full episode');
  }
  function card(it, i) {
    var video = !!it.youtube_id;
    var thumb = video ? 'https://i.ytimg.com/vi/' + it.youtube_id + '/hqdefault.jpg' : (it.image || '');
    var len = it.format === 'highlight' ? clock(it.end_s - it.start_s) : (it.duration_s ? clock(it.duration_s) : 'Full');
    return '<button type="button" class="sarp-card" data-sar-play="' + i + '" aria-label="Play ' + esc(it.title) + '">' +
      '<div class="sarp-th' + (video ? '' : ' sq') + '"' + (thumb ? ' style="background-image:url(\'' + esc(thumb) + '\')"' : '') + '>' +
      '<span class="sarp-kind">' + (video ? '&#9654; Video' : '&#9835; Audio') + (it.format === 'highlight' ? ' &middot; Highlight' : '') + '</span>' +
      '<span class="sarp-len">' + esc(len) + '</span></div>' +
      '<div class="sarp-bd"><small>' + esc(it.show) + '</small><b>' + esc(it.title) + '</b>' +
      '<span>' + esc(it.summary || (it.format === 'highlight' ? 'From ' + it.episode_title : 'The full episode')) + '</span></div></button>';
  }

  // ---- video pop-up ----
  var modal, lastFocus;
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.querySelector('.sarp-frame').innerHTML = '';
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function video(it) {
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'sarp-modal'; modal.hidden = true;
      modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Video');
      modal.innerHTML = '<div class="sarp-box"><button type="button" class="sarp-x" aria-label="Close">&times;</button><div class="sarp-frame"></div><div class="sarp-meta"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.sarp-x')) closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    }
    var pauseBar = bar && audio && !audio.paused; if (pauseBar) audio.pause();
    var p = ['autoplay=1', 'rel=0', 'modestbranding=1'];
    if (it.format === 'highlight') { p.push('start=' + Math.floor(it.start_s)); p.push('end=' + Math.ceil(it.end_s)); }
    modal.querySelector('.sarp-frame').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(it.youtube_id) + '?' + p.join('&') + '" title="' + esc(it.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    var yt = 'https://www.youtube.com/watch?v=' + encodeURIComponent(it.youtube_id) + (it.format === 'highlight' ? '&t=' + Math.floor(it.start_s) + 's' : '');
    modal.querySelector('.sarp-meta').innerHTML = '<small>' + esc(it.show) + ' &middot; ' + esc(range(it)) + '</small><b>' + esc(it.title) + '</b>' +
      (it.summary ? '<p>' + esc(it.summary) + '</p>' : '') +
      '<div class="sarp-acts"><a class="sarp-btn" href="' + esc(yt) + '" target="_blank" rel="noopener">Keep watching on YouTube</a>' +
      (it.format === 'highlight' && it.episode_title && it.episode_title !== it.title ? '<span class="sarp-btn ghost" aria-hidden="true" style="cursor:default">From: ' + esc(it.episode_title) + '</span>' : '') + '</div>';
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.querySelector('.sarp-x').focus();
  }

  // ---- audio bar ----
  var bar, audio, cur = null;
  function ensureBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'sarp-bar'; bar.hidden = true; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Audio player');
    bar.innerHTML = '<div class="sarp-art"></div><button type="button" class="sarp-pp" aria-label="Play">&#9654;</button>' +
      '<div class="sarp-info"><b></b><span></span><div class="sarp-track" role="slider" aria-label="Position" tabindex="0"><i></i></div></div>' +
      '<span class="sarp-time"></span><button type="button" class="sarp-close" aria-label="Close the player">&times;</button>';
    document.body.appendChild(bar);
    audio = new Audio(); audio.preload = 'none';
    bar.querySelector('.sarp-pp').addEventListener('click', function () { if (audio.paused) audio.play().catch(function () {}); else audio.pause(); });
    bar.querySelector('.sarp-close').addEventListener('click', function () { audio.pause(); bar.hidden = true; document.body.classList.remove('sarp-has-bar'); cur = null; store(null); });
    bar.querySelector('.sarp-track').addEventListener('click', function (e) {
      if (!cur) return; var r = this.getBoundingClientRect(), f = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      var a = lo(), b = hi(); if (b > a) audio.currentTime = a + f * (b - a);
    });
    audio.addEventListener('play', sync); audio.addEventListener('pause', sync);
    audio.addEventListener('timeupdate', function () {
      if (!cur) return;
      if (cur.format === 'highlight' && audio.currentTime >= cur.end_s) { audio.pause(); audio.currentTime = cur.start_s; }
      tick();
    });
    audio.addEventListener('loadedmetadata', tick);
    window.addEventListener('pagehide', function () { if (cur) store({ item: cur, t: audio.currentTime || lo() }); });
  }
  function lo() { return cur && cur.format === 'highlight' ? +cur.start_s : 0; }
  function hi() { return cur && cur.format === 'highlight' ? +cur.end_s : (audio.duration || cur && cur.duration_s || 0); }
  function sync() {
    var pp = bar.querySelector('.sarp-pp');
    pp.innerHTML = audio.paused ? '&#9654;' : '&#10074;&#10074;';
    pp.setAttribute('aria-label', audio.paused ? (bar.dataset.resume ? 'Resume' : 'Play') : 'Pause');
    if (!audio.paused) delete bar.dataset.resume;
  }
  function tick() {
    var a = lo(), b = hi(), t = audio.currentTime || a;
    var f = b > a ? Math.min(Math.max((t - a) / (b - a), 0), 1) : 0;
    bar.querySelector('.sarp-track i').style.width = (f * 100) + '%';
    bar.querySelector('.sarp-time').textContent = clock(t - a) + ' / ' + clock(b - a);
  }
  function load(it, t, autoplay) {
    ensureBar(); cur = it;
    bar.querySelector('.sarp-art').style.backgroundImage = it.image ? 'url("' + it.image.replace(/"/g, '%22') + '")' : '';
    bar.querySelector('.sarp-info b').textContent = it.title;
    bar.querySelector('.sarp-info span').textContent = it.show + ' · ' + range(it) + (autoplay ? '' : ' · Tap play to resume');
    audio.src = it.audio_url;
    var start = t != null ? t : lo();
    var seek = function () { try { audio.currentTime = start; } catch (e) {} audio.removeEventListener('loadedmetadata', seek); };
    audio.addEventListener('loadedmetadata', seek);
    audio.preload = 'metadata'; audio.load();
    bar.hidden = false; document.body.classList.add('sarp-has-bar');
    if (autoplay) audio.play().catch(function () {}); else bar.dataset.resume = '1';
    sync(); tick();
  }

  function play(it) {
    if (!it) return;
    if (it.youtube_id) return video(it);
    if (it.audio_url) return load(it, null, true);
  }
  function bind(root, items) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sar-play]');
      if (b && root.contains(b)) play(items[+b.getAttribute('data-sar-play')]);
    });
  }

  // Pick up audio from the last page, paused, ready to resume.
  var saved = read();
  if (saved && saved.item && saved.item.audio_url) {
    var start = function () { load(saved.item, saved.t, false); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  window.SARPlayer = { card: card, bind: bind, play: play, esc: esc, clock: clock };
})();
