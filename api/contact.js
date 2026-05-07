export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, name, organization, engagement_type, event_date, budget, slots, message, source, website } = req.body || {};
  if (website) return res.status(200).json({ ok: true }); // honeypot
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const KEY = process.env.BEEHIIV_API_KEY;
  const PUB = process.env.BEEHIIV_PUBLICATION_ID;
  if (!KEY || !PUB) return res.status(502).json({ error: 'Subscription service not configured.' });

  const isBooking = source === 'booking' || (source && source.startsWith('booking'));
  const utmSource = isBooking ? 'sar-booking' : 'sar-newsletter';

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
    if (!resp.ok && resp.status !== 201) {
      const err = await resp.text();
      console.error('Beehiiv error', resp.status, err);
    }
  } catch (err) {
    console.error('Beehiiv fetch failed', err.message);
  }

  return res.status(200).json({ ok: true });
}