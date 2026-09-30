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

  // Also add them to the LESARUSS Pulse list (the LESARUSS email system's
  // email-subscribe endpoint, which replaced Beehiiv). It is idempotent,
  // holds bot-looking signups for review, and never re-adds anyone who
  // unsubscribed. A failure here never fails the form.
  const isBooking = source === 'booking' || (source && source.startsWith('booking'));
  try {
    const subRes = await fetch('https://fwbhwfxpncrsfhttimna.supabase.co/functions/v1/email-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signup-Ip': String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() },
      body: JSON.stringify({
        list: 'lesaruss-pulse',
        email,
        name: body.name || null,
        source: isBooking ? 'sar-booking' : 'sar-newsletter',
        source_detail: 'seanarussell.com ' + source,
      })
    });
    if (!subRes.ok) console.error('email-subscribe error:', subRes.status, await subRes.text().catch(() => ''));
  } catch (err) {
    console.error('email-subscribe fetch error:', err.message);
  }

  return res.status(200).json({ ok: true });
}
