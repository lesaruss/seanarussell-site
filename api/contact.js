export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, source, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true });
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const KEY = process.env.BEEHIIV_API_KEY;
  const PUB = process.env.BEEHIIV_PUBLICATION_ID;
  if (!KEY || !PUB) return res.status(502).json({ error: 'Subscription service not configured.' });
  const isBooking = source === 'booking' || (source && source.startsWith('booking'));
  const utmSource = isBooking ? 'sar-booking' : 'sar-newsletter';
  const TAG_UNIVERSE = '03738f37-bba0-4bb4-ac9a-d286e97354ba';
  const TAG_NEWSLETTER = '60c48efd-255b-4062-b0c9-554b34c146a8';
  const TAG_BOOKING = '2a4bead6-ce49-4f5b-9691-a84f0f2958cd';
  try {
    const resp = await fetch('https://api.beehiiv.com/v2/publications/' + PUB + '/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
      body: JSON.stringify({
        email: email,
        reactivate_existing: true,
        send_welcome_email: false,
        utm_source: utmSource,
        utm_medium: 'organic',
        utm_campaign: 'seanarussell-site'
      })
    });
    let subId = null;
    try {
      const txt = await resp.text();
      const d = JSON.parse(txt);
      subId = d && d.data && d.data.id;
    } catch (e) {}
    if (!resp.ok && resp.status !== 201) {
      console.error('Beehiiv subscribe error', resp.status);
    }
    if (subId) {
      const tagIds = isBooking ? [TAG_UNIVERSE, TAG_BOOKING] : [TAG_UNIVERSE, TAG_NEWSLETTER];
      fetch('https://api.beehiiv.com/v2/publications/' + PUB + '/subscriptions/' + subId + '/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
        body: JSON.stringify({ tag_ids: tagIds })
      }).catch(e => console.error('Tag apply failed', e.message));
    }
  } catch (err) {
    console.error('Beehiiv fetch failed', err.message);
  }
  return res.status(200).json({ ok: true });
}
