/* sar-kit-editor.js: edit a media kit in place (Sean, 2026-11-01: "build the editor
 * on the kit page", BrandDesk next). One self-contained form that any page can
 * mount: the kit page's owner view today, BrandDesk later. It reads and writes
 * only through the sar-kits edge function (edit_get, kit_save), which re-checks
 * that the caller is the owner on every save.
 *
 *   SARKitEditor.mount(el, { slug, token, onSaved(), onCancel() })
 *
 * Sections, top to bottom: Basics, Numbers, What I do here, Client quotes, Worked
 * with, Track record, How we can work together, Fees (private links only), Press,
 * Status. Numbers and quotes each carry a "show publicly" switch; a number keeps
 * the source it came from, and a new one is marked as entered by Sean.
 */
(function () {
  if (window.SARKitEditor) return;
  var FN = 'https://fwbhwfxpncrsfhttimna.supabase.co/functions/v1/sar-kits';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Ymh3ZnhwbmNyc2ZodHRpbW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjAxMzksImV4cCI6MjA5MDIzNjEzOX0.9mxjK0bn5WATCbNLWrHPakD6yHUDtHFHrOaklPnWkOA';
  var PRESS_URL = 'https://lesaruss.com/api/press';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function call(action, body) {
    return fetch(FN + '?action=' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON, apikey: ANON }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
  }

  var css = '' +
    '.ske{display:grid;gap:16px;padding-block:24px 56px;font-family:Montserrat,-apple-system,sans-serif;color:#1a1a1a}' +
    '.ske-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}' +
    '.ske-top h1{margin:0;font-weight:900;font-size:clamp(22px,3vw,32px);text-transform:uppercase;line-height:1.05}' +
    '.ske-top p{margin:4px 0 0;font-size:13px;color:#55524e}' +
    '.ske-sec{border:1.5px solid #1a1a1a;border-radius:6px;padding:16px 18px;display:grid;gap:10px;min-width:0}' +
    '.ske-sec h2{margin:0;font-weight:800;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7d4a00}' +
    '.ske-sec .hint{margin:0;font-size:12.5px;color:#55524e}' +
    '.ske label{display:grid;gap:4px;font-size:12px;font-weight:700;min-width:0}' +
    '.ske input[type=text],.ske input[type=url],.ske textarea,.ske select{font:500 14px Montserrat,sans-serif;padding:10px 12px;border:1.5px solid #1a1a1a;border-radius:6px;background:#fff;color:#1a1a1a;width:100%;min-width:0;box-sizing:border-box}' +
    '.ske textarea{min-height:76px;resize:vertical;line-height:1.45}' +
    '.ske input:focus-visible,.ske textarea:focus-visible,.ske select:focus-visible,.ske button:focus-visible{outline:3px solid #F69820;outline-offset:2px}' +
    '.ske-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}' +
    '.ske-pill{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:10px}' +
    '.ske-row{display:grid;gap:8px;border:1px solid rgba(26,26,26,.15);border-radius:6px;padding:10px;background:#fafafa;min-width:0}' +
    '.ske-num{grid-template-columns:110px minmax(0,1fr) auto auto;align-items:end}' +
    '.ske-pub{display:flex !important;grid-auto-flow:column;align-items:center;gap:6px !important;font-weight:700;font-size:12px;white-space:nowrap}' +
    '.ske-x{border:1.5px solid #1a1a1a;background:#fff;border-radius:6px;width:36px;height:40px;font-size:18px;cursor:pointer}' +
    '.ske-btn{display:inline-flex;align-items:center;justify-content:center;font:800 11px/1 Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.1em;padding:12px 16px;border-radius:6px;background:#F69820;color:#1a1a1a;border:1.5px solid #F69820;cursor:pointer}' +
    '.ske-btn.ghost{background:#fff;border-color:#1a1a1a}' +
    '.ske-btn:disabled{opacity:.5;cursor:default}' +
    '.ske-add{justify-self:start}' +
    '.ske-press{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}' +
    '.ske-press label{display:flex;gap:8px;align-items:flex-start;font-weight:600;font-size:12.5px;border:1px solid rgba(26,26,26,.15);border-radius:6px;padding:8px}' +
    '.ske-press small{display:block;color:#8a8580;font-weight:600}' +
    '.ske-bar{position:sticky;bottom:0;background:rgba(255,255,255,.97);border-top:1.5px solid #1a1a1a;padding:12px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;z-index:5}' +
    '.ske-msg{font-size:13px;font-weight:700}' +
    '.ske-msg.ok{color:#2d7d31}.ske-msg.bad{color:#a33}' +
    '@media (max-width:640px){.ske-grid2,.ske-press,.ske-pill{grid-template-columns:1fr}.ske-num{grid-template-columns:90px minmax(0,1fr) auto}.ske-num .ske-pub{grid-column:1/-2}}';

  function injectCss() {
    if (document.getElementById('ske-css')) return;
    var s = document.createElement('style'); s.id = 'ske-css'; s.textContent = css; document.head.appendChild(s);
  }

  function lines(a) { return (a || []).join('\n'); }
  function split(v) { return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }

  function numRow(s, i) {
    return '<div class="ske-row ske-num" data-num>' +
      '<label>Number<input type="text" maxlength="16" data-f="v" value="' + esc(s.v) + '" placeholder="$800M"></label>' +
      '<label>What it means<input type="text" maxlength="120" data-f="l" value="' + esc(s.l) + '" placeholder="Bond campaign led"></label>' +
      '<label class="ske-pub"><input type="checkbox" data-f="public"' + (s.public ? ' checked' : '') + '> Show publicly</label>' +
      '<button type="button" class="ske-x" data-del aria-label="Remove this number">&times;</button></div>';
  }
  function quoteRow(q) {
    return '<div class="ske-row" data-quote>' +
      '<label>Quote<textarea maxlength="800" data-f="quote" placeholder="What they said, word for word">' + esc(q.quote) + '</textarea></label>' +
      '<div class="ske-grid2"><label>Who said it<input type="text" maxlength="120" data-f="by" value="' + esc(q.by) + '" placeholder="Name"></label>' +
      '<label>Their role<input type="text" maxlength="120" data-f="role" value="' + esc(q.role) + '" placeholder="Title, organization"></label></div>' +
      '<label>Where it is from (link, optional)<input type="url" maxlength="500" data-f="source_url" value="' + esc(q.source_url || '') + '" placeholder="https://"></label>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><label class="ske-pub"><input type="checkbox" data-f="public"' + (q.public ? ' checked' : '') + '> Show publicly</label>' +
      '<button type="button" class="ske-btn ghost" data-del>Remove quote</button></div></div>';
  }
  function pillarRow(p, i) {
    return '<div class="ske-row" data-pillar><div class="ske-pill">' +
      '<label>Pillar ' + (i + 1) + '<input type="text" maxlength="60" data-f="t" value="' + esc(p[0]) + '"></label>' +
      '<label>One line<input type="text" maxlength="240" data-f="b" value="' + esc(p[1]) + '"></label></div></div>';
  }

  function mount(el, opts) {
    injectCss();
    el.innerHTML = '<div class="ske"><p class="ske-msg">Loading the kit.</p></div>';
    var root = el.firstChild;
    Promise.all([
      call('edit_get', { slug: opts.slug, token: opts.token }),
      fetch(PRESS_URL).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    ]).then(function (res) {
      var r = res[0], press = Array.isArray(res[1]) ? res[1] : [];
      if (r.status === 403) { root.innerHTML = '<p class="ske-msg bad">Sign in on your dashboard to edit this kit.</p>'; return; }
      if (r.status !== 200 || !r.body.kit) { root.innerHTML = '<p class="ske-msg bad">This kit could not load for editing.</p>'; return; }
      draw(root, r.body.kit, press, opts);
    }).catch(function () { root.innerHTML = '<p class="ske-msg bad">This kit could not load for editing. Refresh to try again.</p>'; });
  }

  function draw(root, k, press, opts) {
    var pillars = (k.pillars || []).slice(0, 3);
    while (pillars.length < 3) pillars.push(['', '']);
    var picked = k.press_ids || [];
    var pressRows = press.map(function (p) {
      return '<label><input type="checkbox" data-press value="' + esc(p.id) + '"' + (picked.indexOf(p.id) > -1 ? ' checked' : '') + '><span>' + esc(p.title) + '<small>' + esc((p.type || '') + ' · ' + (p.date || '')) + '</small></span></label>';
    }).join('');
    root.innerHTML =
      '<div class="ske-top"><div><h1>Edit: ' + esc(k.name) + '</h1><p>Changes show on the kit as soon as you save. Fees and anything not marked public stay off the public page.</p></div>' +
        '<button type="button" class="ske-btn ghost" data-cancel>Back to the kit</button></div>' +
      '<section class="ske-sec"><h2>Basics</h2><div class="ske-grid2">' +
        '<label>Kit name<input type="text" maxlength="80" id="ske-name" value="' + esc(k.name) + '"></label>' +
        '<label>Role line<input type="text" maxlength="120" id="ske-role" value="' + esc(k.role_line) + '" placeholder="Fractional CMO · VP Marketing"></label></div>' +
        '<label>Tagline<textarea maxlength="400" id="ske-tagline">' + esc(k.tagline) + '</textarea></label>' +
        '<label>Tags (comma between each)<input type="text" id="ske-tags" value="' + esc((k.tags || []).join(', ')) + '"></label>' +
        '<label>Scene caption<input type="text" maxlength="160" id="ske-caption" value="' + esc(k.scene_caption) + '"></label></section>' +
      '<section class="ske-sec"><h2>Numbers</h2><p class="hint">Up to six. Only numbers you can back up should be public; a new number is recorded as entered by you.</p><div id="ske-nums" style="display:grid;gap:8px">' +
        (k.stats || []).map(numRow).join('') + '</div><button type="button" class="ske-btn ghost ske-add" data-add="num">Add a number</button></section>' +
      '<section class="ske-sec"><h2>What I do here</h2>' + pillars.map(pillarRow).join('') + '</section>' +
      '<section class="ske-sec"><h2>Client quotes</h2><p class="hint">Word for word, with who said it. Leave "Show publicly" off until you have their OK.</p><div id="ske-quotes" style="display:grid;gap:8px">' +
        (k.quotes || []).map(quoteRow).join('') + '</div><button type="button" class="ske-btn ghost ske-add" data-add="quote">Add a quote</button></section>' +
      '<section class="ske-sec"><h2>Worked with</h2><p class="hint">One per line. A name that matches a Directory profile shows its logo and links to it.</p><textarea id="ske-worked" style="min-height:110px">' + esc(lines(k.worked_with)) + '</textarea></section>' +
      '<section class="ske-sec"><h2>Track record</h2><textarea id="ske-track">' + esc(k.track_record) + '</textarea></section>' +
      '<section class="ske-sec"><h2>How we can work together</h2><p class="hint">One per line. Shown on private links only.</p><textarea id="ske-terms">' + esc(lines(k.terms)) + '</textarea></section>' +
      '<section class="ske-sec"><h2>Fees (private links only)</h2><p class="hint">One per line. Never shown on the public page or in the PDF.</p><textarea id="ske-fees">' + esc(lines(k.fees)) + '</textarea></section>' +
      '<section class="ske-sec"><h2>Press on this kit</h2><p class="hint">Pick up to ten from your Press page.</p><div class="ske-press">' + (pressRows || '<p class="hint">The Press feed could not load. Your current picks are kept.</p>') + '</div></section>' +
      '<section class="ske-sec"><h2>Status</h2><label>Who can see this kit<select id="ske-status"><option value="live"' + (k.status === 'live' ? ' selected' : '') + '>Live: anyone can see it</option><option value="draft"' + (k.status !== 'live' ? ' selected' : '') + '>Draft: only you</option></select></label></section>' +
      '<div class="ske-bar"><button type="button" class="ske-btn" data-save>Save changes</button><button type="button" class="ske-btn ghost" data-cancel>Cancel</button><span class="ske-msg" role="status" id="ske-msg"></span></div>';

    root.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-cancel]')) { if (opts.onCancel) opts.onCancel(); return; }
      var del = t.closest('[data-del]');
      if (del) { del.closest('[data-num],[data-quote]').remove(); return; }
      var add = t.closest('[data-add]');
      if (add) {
        if (add.getAttribute('data-add') === 'num') {
          var nums = document.getElementById('ske-nums');
          if (nums.children.length >= 6) return;
          nums.insertAdjacentHTML('beforeend', numRow({ v: '', l: '', public: false }));
          nums.lastChild.querySelector('input').focus();
        } else {
          var qs = document.getElementById('ske-quotes');
          qs.insertAdjacentHTML('beforeend', quoteRow({ quote: '', by: '', role: '', public: false }));
          qs.lastChild.querySelector('textarea').focus();
        }
        return;
      }
      if (t.closest('[data-save]')) save(root, k, opts, t.closest('[data-save]'));
    });
    root.addEventListener('change', function (e) {
      if (!e.target.matches('[data-press]')) return;
      var on = root.querySelectorAll('[data-press]:checked');
      if (on.length > 10) e.target.checked = false;
    });
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function save(root, k, opts, btn) {
    var msg = document.getElementById('ske-msg');
    var body = {
      slug: k.slug, token: opts.token,
      name: val('ske-name'), role_line: val('ske-role'), tagline: val('ske-tagline'), scene_caption: val('ske-caption'),
      tags: val('ske-tags').split(',').map(function (x) { return x.trim(); }).filter(Boolean),
      stats: Array.prototype.map.call(root.querySelectorAll('[data-num]'), function (r) {
        return { v: r.querySelector('[data-f=v]').value, l: r.querySelector('[data-f=l]').value, public: r.querySelector('[data-f=public]').checked };
      }),
      pillars: Array.prototype.map.call(root.querySelectorAll('[data-pillar]'), function (r) { return [r.querySelector('[data-f=t]').value, r.querySelector('[data-f=b]').value]; }),
      quotes: Array.prototype.map.call(root.querySelectorAll('[data-quote]'), function (r) {
        return { quote: r.querySelector('[data-f=quote]').value, by: r.querySelector('[data-f=by]').value, role: r.querySelector('[data-f=role]').value, source_url: r.querySelector('[data-f=source_url]').value, public: r.querySelector('[data-f=public]').checked };
      }),
      worked_with: split(val('ske-worked')), track_record: val('ske-track'), terms: split(val('ske-terms')), fees: split(val('ske-fees')),
      status: val('ske-status'),
    };
    var pressBoxes = root.querySelectorAll('[data-press]');
    if (pressBoxes.length) body.press_ids = Array.prototype.map.call(root.querySelectorAll('[data-press]:checked'), function (c) { return c.value; });
    var bad = body.quotes.some(function (q) { return (q.quote.trim() && !q.by.trim()) || (!q.quote.trim() && q.by.trim()); });
    if (bad) { msg.className = 'ske-msg bad'; msg.textContent = 'Each quote needs both the words and who said it.'; return; }
    btn.disabled = true; msg.className = 'ske-msg'; msg.textContent = 'Saving.';
    call('kit_save', body).then(function (r) {
      btn.disabled = false;
      if (r.status === 200) { msg.className = 'ske-msg ok'; msg.textContent = 'Saved. The kit is updated.'; if (opts.onSaved) opts.onSaved(); }
      else if (r.status === 403) { msg.className = 'ske-msg bad'; msg.textContent = 'Your sign-in ran out. Sign in on your dashboard, then save again.'; }
      else { msg.className = 'ske-msg bad'; msg.textContent = 'That did not save. Try again.'; }
    }).catch(function () { btn.disabled = false; msg.className = 'ske-msg bad'; msg.textContent = 'That did not save. Check your connection and try again.'; });
  }

  window.SARKitEditor = { mount: mount };
})();
