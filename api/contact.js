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

  // Step 1: List publication tags to get IDs
  const tagsListResp = await fetch(`${BASE}/tags`, { headers: { Authorization: `Bearer ${KEY}` } });
  debug.tagsListStatus = tagsListResp.status;
  const tagsListData = await tagsListResp.json();
  debug.tagsList = tagsListData;

  // Step 2: Create subscriber
  const bhResp = await fetch(`${BASE}/subscriptions`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false, utm_source: 'sar-website' })
  });
  const bhData = await bhResp.json();
  const subId = bhData && bhData.data && bhData.data.id;
  debug.subId = subId;
  debug.bhStatus = bhResp.status;

  if (subId && tagsListData && tagsListData.data) {
    // Find IDs for our tags by name
    const tagNames = ['lesaruss-universe', 'sar-newsletter'];
    const matchedIds = tagsListData.data
      .filter(t => tagNames.includes(t.name))
      .map(t => t.id);
    debug.matchedIds = matchedIds;

    if (matchedIds.length > 0) {
      // POST /subscriptions/:subId/tags with tag_ids
      const tagResp = await fetch(`${BASE}/subscriptions/${subId}/tags`, {
        method: 'POST', headers,
        body: JSON.stringify({ tag_ids: matchedIds })
      });
      const tagBody = await tagResp.text();
      debug.tagPost_status = tagResp.status;
      debug.tagPost_body = tagBody.slice(0, 400);
    }
  }

  // Step 3: Verify
  const getResp = await fetch(`${BASE}/subscriptions/${subId}?expand[]=tags`, {
    headers: { Authorization: `Bearer ${KEY}` }
  });
  const getData = await getResp.json();
  debug.finalTags = getData && getData.data && getData.data.tags;

  return res.status(200).json({ ok: true, debug });
}