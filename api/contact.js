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

  // Create subscriber
  const bhResp = await fetch(`${BASE}/subscriptions`, {
    method: 'POST', headers,
    body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false, utm_source: 'debug' })
  });
  const bhData = await bhResp.json();
  const subId = bhData && bhData.data && bhData.data.id;
  debug.subId = subId;
  debug.bhStatus = bhResp.status;

  if (subId) {
    // Try A: strings array
    const putA = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ tags: ['lesaruss-universe', 'sar-newsletter'] })
    });
    const putAData = await putA.json();
    debug.putA_status = putA.status;
    debug.putA_tags = putAData && putAData.data && putAData.data.tags;

    // Check tags after A
    const getA = await fetch(`${BASE}/subscriptions/${subId}?expand[]=tags`, { headers: { Authorization: `Bearer ${KEY}` } });
    const getAData = await getA.json();
    debug.tagsAfterA = getAData && getAData.data && getAData.data.tags;

    // Try B: objects array
    const putB = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ tags: [{ name: 'lesaruss-universe' }, { name: 'sar-newsletter' }] })
    });
    const putBData = await putB.json();
    debug.putB_status = putB.status;
    debug.putB_tags = putBData && putBData.data && putBData.data.tags;

    // Check tags after B
    const getB = await fetch(`${BASE}/subscriptions/${subId}?expand[]=tags`, { headers: { Authorization: `Bearer ${KEY}` } });
    const getBData = await getB.json();
    debug.tagsAfterB = getBData && getBData.data && getBData.data.tags;

    // Try C: PATCH with strings
    const patchC = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ tags: ['lesaruss-universe', 'sar-newsletter'] })
    });
    debug.patchC_status = patchC.status;
    debug.patchC_body = (await patchC.text()).slice(0, 200);
  }

  return res.status(200).json({ ok: true, debug });
}