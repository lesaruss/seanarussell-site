// The booking form sends its details as separate fields. Fold the ones the
// lead CRM has no column for into the message, so nothing the visitor typed is
// lost (organization, engagement type and date were dropped before 2026-11-01).
const KIT_NAMES = {
  'executive-marketing': 'Executive Marketing', education: 'Education', 'media-production': 'Media & Production',
  speaker: 'Speaker & Host', 'vegan-movement': 'Vegan Movement', entertainment: 'Entertainment & Music',
};
function bookingMessage(body) {
  const lines = [];
  const kit = typeof body.kit === 'string' && KIT_NAMES[body.kit] ? KIT_NAMES[body.kit] : '';
  if (kit) lines.push('Came from the ' + kit + ' media kit.');
  if (body.engagement_type && body.engagement_type !== 'Engagement type') lines.push('Engagement: ' + body.engagement_type);
  if (body.event_date) lines.push('Date or window: ' + body.event_date);
  if (body.budget) lines.push('Budget: ' + body.budget);
  if (Array.isArray(body.slots) && body.slots.length) lines.push('Times: ' + body.slots.join(', '));
  const msg = String(body.message || '').trim();
  if (!lines.length) return msg || null;
  return lines.join('\n') + (msg ? '\n\n' + msg : '');
}

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
        org: body.org || body.organization || null,
        opportunity_types: Array.isArray(body.types) ? body.types : (body.engagement_type ? [body.engagement_type] : null),
        message: bookingMessage(body),
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
