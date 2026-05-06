(function () {
  'use strict';

  function submitContact(data, cb) {
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { cb(r.ok); }).catch(function () { cb(false); });
  }

  function injectNewsletterStyles() {
    if (document.getElementById('sar-news-style')) return;
    var s = document.createElement('style');
    s.id = 'sar-news-style';
    s.textContent =
      '.sar-news-cta{background:var(--surface2,#fafafa);border-top:1px solid var(--border,rgba(0,0,0,.08));border-bottom:1px solid var(--border,rgba(0,0,0,.08));padding:56px 24px}' +
      '.sar-news-inner{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center}' +
      '.sar-news-eyebrow{font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--text-50,rgba(26,26,26,.55));margin-bottom:14px}' +
      '.sar-news-h{font-size:clamp(28px,3.4vw,44px);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:1;margin-bottom:14px}' +
      '.sar-news-body{font-size:14px;color:var(--text-75,rgba(26,26,26,.78));line-height:1.6;max-width:520px}' +
      '.sar-news-form{display:flex;gap:8px;align-items:stretch;width:100%;position:relative}' +
      '.sar-news-input{flex:1;padding:16px 18px;background:var(--bg,#fff);border:1px solid var(--border,rgba(0,0,0,.08));font-family:inherit;font-size:14px;color:var(--text,#1a1a1a)}' +
      '.sar-news-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0}' +
      '.sar-news-btn{background:#F69820;color:#0d0d0d;border:none;padding:0 24px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.16em;cursor:pointer;font-family:inherit;white-space:nowrap}' +
      '.sar-news-btn:hover{background:var(--text,#1a1a1a);color:var(--bg,#fff)}' +
      '.sar-news-fine{font-size:11px;color:var(--text-50,rgba(26,26,26,.55));margin-top:14px;letter-spacing:.04em}' +
      '.sar-news-msg{font-size:13px;margin-top:12px;padding:10px 14px;background:var(--bg,#fff);border-left:3px solid #F69820;color:var(--text,#1a1a1a)}' +
      '.sar-news-msg.error{border-left-color:#c43c3c}' +
      '.form-msg{font-size:13px;margin-top:12px;padding:10px 14px;background:var(--bg,#fff);border-left:3px solid #F69820;color:var(--text,#1a1a1a)}' +
      '.form-msg.error{border-left-color:#c43c3c}' +
      '@media(max-width:700px){.sar-news-inner{grid-template-columns:1fr;gap:24px}.sar-news-form{flex-direction:column}.sar-news-btn{padding:14px 24px}}';
    document.head.appendChild(s);
  }

  function injectNewsletter() {
    if (document.body.hasAttribute('data-no-newsletter')) return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    injectNewsletterStyles();
    var sec = document.createElement('section');
    sec.className = 'sar-news-cta';
    sec.setAttribute('aria-label', 'Newsletter signup');
    sec.innerHTML =
      '<div class="sar-news-inner">' +
        '<div>' +
          '<p class="sar-news-eyebrow">From the founder<span class="dot">.</span></p>' +
          '<h3 class="sar-news-h">Signal from<br>the source<span class="dot">.</span></h3>' +
          '<p class="sar-news-body">Where we are with every brand in the universe, what I am into right now, and the news direct from me. For people already invested in what we are building. Weekly or biweekly.</p>' +
        '</div>' +
        '<div>' +
          '<form class="sar-news-form" id="sarNewsForm" novalidate>' +
            '<input type="email" name="email" placeholder="Your email" required class="sar-news-input" autocomplete="email">' +
            '<input type="text" name="website" class="sar-news-hp" aria-hidden="true" tabindex="-1" autocomplete="off">' +
            '<button type="submit" class="sar-news-btn">Subscribe</button>' +
          '</form>' +
          '<p class="sar-news-fine">One letter every week or two. Unsubscribe anytime.</p>' +
          '<p class="sar-news-msg" id="sarNewsMsg" hidden></p>' +
        '</div>' +
      '</div>';
    footer.parentNode.insertBefore(sec, footer);
    var form = document.getElementById('sarNewsForm');
    var msgEl = document.getElementById('sarNewsMsg');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button[type=submit]');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        submitContact({ email: form.email.value.trim(), name: '', website: form.website ? form.website.value : '', source: 'newsletter' }, function (ok) {
          if (ok) {
            if (msgEl) { msgEl.textContent = 'You are on the list.'; msgEl.className = 'sar-news-msg'; msgEl.hidden = false; }
            form.reset();
            if (btn) btn.textContent = 'Subscribed';
          } else {
            if (msgEl) { msgEl.textContent = 'Something went wrong. Try again in a moment.'; msgEl.className = 'sar-news-msg error'; msgEl.hidden = false; }
            if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
          }
        });
      });
    }
  }

  function wireBookingForms() {
    document.querySelectorAll('form[data-contact]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        injectNewsletterStyles();
        var btn = form.querySelector('.submit');
        var msgEl = form.querySelector('.form-msg');
        if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
        var slotBoxes = form.querySelectorAll('[name=slots]:checked');
        var slots = slotBoxes.length ? Array.from(slotBoxes).map(function (b) { return b.value; }) : val(form, 'slots');
        submitContact({
          name: val(form, 'name'), email: val(form, 'email'),
          organization: val(form, 'organization'), engagement_type: val(form, 'engagement_type'),
          event_date: val(form, 'event_date'), budget: val(form, 'budget'),
          slots: slots, message: val(form, 'message'),
          website: val(form, 'website'), source: form.getAttribute('data-contact') || 'booking'
        }, function (ok) {
          if (ok) {
            Array.from(form.elements).forEach(function (el) { el.disabled = true; });
            if (btn) btn.textContent = 'Sent';
            if (msgEl) { msgEl.textContent = 'Got it. Reply within 48 hours.'; msgEl.className = 'form-msg'; msgEl.hidden = false; }
          } else {
            if (btn) { btn.disabled = false; btn.textContent = 'Send the brief'; }
            if (msgEl) { msgEl.textContent = 'Something went wrong. Try again.'; msgEl.className = 'form-msg error'; msgEl.hidden = false; }
          }
        });
      });
    });
  }

  function val(form, name) {
    var el = form.querySelector('[name=' + name + ']');
    return el ? el.value.trim() : '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { injectNewsletter(); wireBookingForms(); });
  } else { injectNewsletter(); wireBookingForms(); }
}());