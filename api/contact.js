export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) return res.status(502).json({ error: 'Not configured.' });

  const debug = { pubId: BEEHIIV_PUBLICATION_ID };

  // 1. Fetch publication tags list
  try {
    const tagsResp = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/tags`,
      { headers: { 'Authorization': `Bearer ${BEEHIIV_API_KEY}` } }
    );
    const tagsText = await tagsResp.text();
    debug.tagsStatus = tagsResp.status;
    debug.tagsBody = tagsText.slice(0, 800);
  } catch (e) { debug.tagsErr = e.message; }

  // 2. Create subscription
  let subId = null;
  try {
    const bhResp = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BEEHIIV_API_KEY}` },
        body: JSON.stringify({ email, reactivate_existing: true, send_welcome_email: false, utm_source: 'debug' })
      }
    );
    const bhText = await bhResp.text();
    debug.bhStatus = bhResp.status;
    const bhData = JSON.parse(bhText);
    subId = bhData && bhData.data && bhData.data.id;
    debug.subId = subId;
  } catch (e) { debug.bhErr = e.message; }

  // 3. Fetch subscriber with tags expanded
  if (subId) {
    try {
      const getResp = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subId}?expand[]=tags`,
        { headers: { 'Authorization': `Bearer ${BEEHIIV_API_KEY}` } }
      );
      const getText = await getResp.text();
      debug.getStatus = getResp.status;
      debug.getBody = getText.slice(0, 800);
    } catch (e) { debug.getErr = e.message; }
  }

  return res.status(200).json({ ok: true, debug });
}