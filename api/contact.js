export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // honeypot
  if (body.website) return res.status(200).json({ ok: true });

  const email = (body.email || '').trim();
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  // Basic format check - rejects bot-fuzzed garbage before it ever reaches the CRM or Beehiiv
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address.' });

  const source = body.source || 'sar-contact';

  // Route to LESARUSS universal lead CRM
  const LEAD_URL = 'https://fwbhwfxpncrsfhttimna.supabase.co/functions/v1/inbound-lead';
  try {
    const leadRes = await fetch(LEAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: source === 'media-industry-kit'
          ? 'sar-media-kit'
          : source === 'executive-marketing-kit'
          ? 'sar-executive-kit'
          : source === 'blur-to-blueprint-waitlist'
          ? 'sar-book-waitlist'
          : 'sar-contact',
        name: body.name || null,
        email,
        org: body.org || null,
        opportunity_types: Array.isArray(body.types) ? body.types : null,
        message: body.message || null,
        source,
      })
    });
    if (!leadRes.ok) {
      const txt = await leadRes.text().catch(() => '');
      console.error('inbound-lead error:', leadRes.status, txt);
    }
  } catch (err) {
    console.error('inbound-lead fetch error:', err.message);
  }

  // Also subscribe to Beehiiv newsletter (secondary — captures email for list)
  const KEY = process.env.BEEHIIV_API_KEY;
  const PUB = process.env.BEEHIIV_PUBLICATION_ID;
  if (KEY && PUB) {
    const isBooking = source === 'booking' || (source && source.startsWith('booking'));
    const utmSource = isBooking ? 'sar-booking' : 'sar-newsletter';
    const TAG_UNIVERSE  = '03738f37-bba0-4bb4-ac9a-d286e97354ba';
    const TAG_NEWSLETTER = '60c48efd-255b-4062-b0c9-554b34c146a8';
    const TAG_BOOKING   = '2a4bead6-ce49-4f5b-9691-a84f0f2958cd';
    try {
      const resp = await fetch('https://api.beehiiv.com/v2/publications/' + PUB + '/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: false,
          utm_source: utmSource,
          utm_medium: 'organic',
          utm_campaign: 'seanarussell-site'
        })
      });
      let subId = null;
      try { const d = await resp.json(); subId = d && d.data && d.data.id; } catch (e) {}
      if (subId) {
        const tagIds = isBooking ? [TAG_UNIVERSE, TAG_BOOKING] : [TAG_UNIVERSE, TAG_NEWSLETTER];
        await fetch('https://api.beehiiv.com/v2/publications/' + PUB + '/subscriptions/' + subId + '/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY },
          body: JSON.stringify({ tag_ids: tagIds })
        });
      }
    } catch (err) {
      console.error('Beehiiv error', err.message);
    }
  }

  return res.status(200).json({ ok: true });
}
