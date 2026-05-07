export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, source, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const KEY = process.env.BEEHIIV_API_KEY;
  const PUB = process.env.BEEHIIV_PUBLICATION_ID;
  if (!KEY || !PUB) return res.status(502).json({ error: 'Not configured.', KEY: !!KEY, PUB: !!PUB });
  const BASE = `https://api.beehiiv.com/v2/publications/${PUB}`;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` };
  const debug = {};

  // Create subscriber with tags in body
  const bhResp = await fetch(`${BASE}/subscriptions`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false, utm_source: 'sar-website', tags: ['lesaruss-universe', 'sar-newsletter'] })
  });
  const bhData = await bhResp.json();
  const subId = bhData && bhData.data && bhData.data.id;
  debug.subId = subId;
  debug.bhStatus = bhResp.status;
  debug.bhTags = bhData && bhData.data && bhData.data.tags;

  if (subId) {
    // Try D: POST /subscriptions/:subId/tags one at a time (sub-resource endpoint)
    for (const tagName of ['lesaruss-universe', 'sar-newsletter']) {
      const tagResp = await fetch(`${BASE}/subscriptions/${subId}/tags`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: tagName })
      });
      const tagBody = await tagResp.text();
      debug[`tagPost_${tagName}`] = { status: tagResp.status, body: tagBody.slice(0, 300) };
    }

    // Check final state
    const getResp = await fetch(`${BASE}/subscriptions/${subId}?expand[]=tags`, {
      headers: { Authorization: `Bearer ${KEY}` }
    });
    const getData = await getResp.json();
    debug.finalTags = getData && getData.data && getData.data.tags;
    debug.subStatus = getData && getData.data && getData.data.status;
  }

  return res.status(200).json({ ok: true, debug });
}