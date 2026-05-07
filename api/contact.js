export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, source, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const KEY = process.env.BEEHIIV_API_KEY;
  const PUB = process.env.BEEHIIV_PUBLICATION_ID;
  if (!KEY || !PUB) return res.status(502).json({ error: 'Not configured.' });
  const BASE = `https://api.beehiiv.com/v2/publications/${PUB}`;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` };
  const debug = {};

  // Step 1: Ensure tags exist and collect their IDs
  const tagNames = source === 'booking' ? ['lesaruss-universe', 'sar-booking'] : ['lesaruss-universe', 'sar-newsletter'];
  const tagIds = [];
  for (const name of tagNames) {
    const r = await fetch(`${BASE}/tags`, {
      method: 'POST', headers,
      body: JSON.stringify({ name })
    });
    const d = await r.json();
    debug[`ensureTag_${name}`] = { status: r.status, id: d && d.data && d.data.id, body: JSON.stringify(d).slice(0, 200) };
    if (d && d.data && d.data.id) tagIds.push(d.data.id);
  }
  debug.tagIds = tagIds;

  // Step 2: Create subscriber
  const bhResp = await fetch(`${BASE}/subscriptions`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false, utm_source: 'sar-website' })
  });
  const bhData = await bhResp.json();
  const subId = bhData && bhData.data && bhData.data.id;
  debug.subId = subId;
  debug.bhStatus = bhResp.status;

  // Step 3: Apply tags by ID
  if (subId && tagIds.length > 0) {
    const tagResp = await fetch(`${BASE}/subscriptions/${subId}/tags`, {
      method: 'POST', headers,
      body: JSON.stringify({ tag_ids: tagIds })
    });
    const tagBody = await tagResp.text();
    debug.tagApply_status = tagResp.status;
    debug.tagApply_body = tagBody.slice(0, 300);
  }

  // Step 4: Verify
  if (subId) {
    const getResp = await fetch(`${BASE}/subscriptions/${subId}?expand[]=tags`, {
      headers: { Authorization: `Bearer ${KEY}` }
    });
    const getData = await getResp.json();
    debug.finalTags = getData && getData.data && getData.data.tags;
  }

  return res.status(200).json({ ok: true, debug });
}