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

    async function safeJson(r) {
      const txt = await r.text();
      let d; try { d = JSON.parse(txt); } catch(e) { d = { _raw: txt.slice(0,200) }; }
      return { status: r.status, data: d };
    }

    // Create subscriber
    const subResp = await fetch(BASE + '/subscriptions', { method: 'POST', headers: hdrs,
      body: JSON.stringify({ email: email, reactivate_existing: true, send_welcome_email: false, utm_source: 'sar-website' })
    });
    const subResult = await safeJson(subResp);
    const subId = subResult.data && subResult.data.data && subResult.data.data.id;
    debug.subId = subId;
    debug.subStatus = subResult.status;

    if (subId) {
      const tagNames = source === 'booking' ? ['lesaruss-universe', 'sar-booking'] : ['lesaruss-universe', 'sar-newsletter'];

      // Hypothesis: tag_ids takes name strings directly
      const tryA = await fetch(BASE + '/subscriptions/' + subId + '/tags', {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ tag_ids: tagNames })
      });
      const tryAResult = await safeJson(tryA);
      debug.tryA_names_as_ids = { status: tryAResult.status, resp: tryAResult.data };

      // Also try tags array of objects with name field in the PUT endpoint
      const tryB = await fetch(BASE + '/subscriptions/' + subId, {
        method: 'PUT', headers: hdrs,
        body: JSON.stringify({ tags: tagNames })
      });
      const tryBResult = await safeJson(tryB);
      debug.tryB_put_tags = { status: tryBResult.status, finalTags: tryBResult.data && tryBResult.data.data && tryBResult.data.data.tags };

      // Verify
      const verify = await fetch(BASE + '/subscriptions/' + subId + '?expand[]=tags', {
        headers: { Authorization: 'Bearer ' + KEY }
      });
      const verResult = await safeJson(verify);
      debug.finalTags = verResult.data && verResult.data.data && verResult.data.data.tags;
    }

    return res.status(200).json({ ok: true, debug: debug });
  } catch(err) {
    return res.status(200).json({ ok: false, error: err.message, stack: err.stack });
  }
}