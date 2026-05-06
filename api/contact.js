export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, organization, engagement_type, event_date, budget, slots, message, source, website } = req.body || {};

  if (website) return res.status(200).json({ ok: true }); // honeypot

  if (!email || !name) return res.status(400).json({ error: 'Name and email are required.' });

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) return res.status(502).json({ error: 'Service not configured.' });

  const isBooking = ['booking', 'speaker', 'index'].includes(source);
  const tags = ['lesaruss-universe', isBooking ? 'sar-booking' : 'sar-newsletter'];

  try {
    const bhResp = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BEEHIIV_API_KEY}` },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: 'seanarussell.com',
          utm_medium: source || 'website',
          custom_fields: [
            { name: 'first_name', value: (name || '').split(' ')[0] },
            { name: 'organization', value: organization || '' },
            { name: 'engagement_type', value: engagement_type || '' },
            { name: 'event_date', value: event_date || '' },
            { name: 'budget', value: budget || '' },
            { name: 'slots', value: Array.isArray(slots) ? slots.join(', ') : (slots || '') },
            { name: 'message', value: message || '' }
          ],
          tags
        })
      }
    );
    if (!bhResp.ok) {
      console.error('Beehiiv error:', bhResp.status, await bhResp.text());
      return res.status(502).json({ error: 'Subscription failed.' });
    }
  } catch (err) {
    console.error('Beehiiv fetch error:', err);
    return res.status(502).json({ error: 'Subscription failed.' });
  }

  if (RESEND_API_KEY && NOTIFY_TO_EMAIL && isBooking) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'noreply@lesaruss.com',
          to: NOTIFY_TO_EMAIL,
          subject: `Booking inquiry from ${name}`,
          html: [
            `<p><strong>Name:</strong> ${name}</p>`,
            `<p><strong>Email:</strong> ${email}</p>`,
            `<p><strong>Organization:</strong> ${organization || 'N/A'}</p>`,
            `<p><strong>Engagement type:</strong> ${engagement_type || 'N/A'}</p>`,
            `<p><strong>Event date:</strong> ${event_date || 'N/A'}</p>`,
            `<p><strong>Budget:</strong> ${budget || 'N/A'}</p>`,
            `<p><strong>Slots:</strong> ${Array.isArray(slots) ? slots.join(', ') : (slots || 'N/A')}</p>`,
            `<p><strong>Message:</strong></p><p>${(message || 'N/A').replace(/\n/g, '<br>')}</p>`,
            `<p><strong>Source page:</strong> ${source || 'N/A'}</p>`
          ].join('\n')
        })
      });
    } catch (err) {
      console.error('Resend error (non-fatal):', err);
    }
  }

  return res.status(200).json({ ok: true });
}