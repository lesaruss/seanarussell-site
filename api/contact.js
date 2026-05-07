export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, source, website } = req.body || {};
    if (website) return res.status(200).json({ ok: true });
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const KEY = process.env.BEEHIIV_API_KEY;
    const PUB = process.env.BEEHIIV_PUBLICATION_ID;
    if (!KEY || !PUB) return res.status(502).json({ error: 'Not configured.' });
    const BASE = 'https://api.beehiiv.com/v2/publications/' + PUB;
    const hdrs = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY };
    const debug = {};

    async function safeJson(fetchPromise) {
      const r = await fetchPromise;
      const txt = await r.text();
      let parsed;
      try { parsed = JSON.parse(txt); } catch(e) { parsed = { _raw: txt.slice(0, 200) }; }
      return { status: r.status, data: parsed };
    }

    // Step 1: POST /tags for each name to get IDs (create if not exists)
    const tagNames = source === 'booking' ? ['lesaruss-universe', 'sar-booking'] : ['lesaruss-universe', 'sar-newsletter'];
    const tagIds = [];
    for (let i = 0; i < tagNames.length; i++) {
      const name = tagNames[i];
      const result = await safeJson(fetch(BASE + '/tags', {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ name: name })
      }));
      debug['tag_' + i] = { name: name, status: result.status, resp: result.data };
      const id = result.data && result.data.data && result.data.data.id;
      if (id) tagIds.push(id);
    }
    debug.tagIds = tagIds;

    // Step 2: Create subscriber
    const sub = await safeJson(fetch(BASE + '/subscriptions', {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ email: email, reactivate_existing: true, send_welcome_email: false, utm_source: 'sar-website' })
    }));
    const subId = sub.data && sub.data.data && sub.data.data.id;
    debug.subId = subId;
    debug.subStatus = sub.status;

    // Step 3: Apply tags
    if (subId && tagIds.length > 0) {
      const apply = await safeJson(fetch(BASE + '/subscriptions/' + subId + '/tags', {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ tag_ids: tagIds })
      }));
      debug.applyStatus = apply.status;
      debug.applyResp = apply.data;
    }

    // Step 4: Verify
    if (subId) {
      const verify = await safeJson(fetch(BASE + '/subscriptions/' + subId + '?expand[]=tags', {
        headers: { Authorization: 'Bearer ' + KEY }
      }));
      debug.finalTags = verify.data && verify.data.data && verify.data.data.tags;
    }

    return res.status(200).json({ ok: true, debug: debug });
  } catch(err) {
    return res.status(200).json({ ok: false, error: err.message, stack: err.stack });
  }
}