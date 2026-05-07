export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, organization, engagement_type, event_date, budget, slots, message, source, website } = req.body || {};

  if (website) return res.status(200).json({ ok: true });
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_TO_EMAIL = process.env.NOTIFY_TO_EMAIL;

  if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) return res.status(502).json({ error: 'Service not configured.' });

  const isBooking = ['booking', 'speaker', 'index'].includes(source);
  const tags = ['lesaruss-universe', isBooking ? 'sar-booking' : 'sar-newsletter'];

  const debug = { source, isBooking, tags, pubId: BEEHIIV_PUBLICATION_ID.slice(0,8) };

  let subId = null;

  try {
    const bhResp = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BEEHIIV_API_KEY}` },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
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
          ]
        })
      }
    );

    const bhText = await bhResp.text();
    debug.bhStatus = bhResp.status;
    debug.bhBody = bhText.slice(0, 400);

    if (!bhResp.ok) {
      console.error('BH_DEBUG', JSON.stringify(debug));
      return res.status(502).json({ error: 'Subscription failed.' });
    }

    try {
      const bhData = JSON.parse(bhText);
      subId = bhData && bhData.data && bhData.data.id;
      debug.subId = subId;
      debug.dataKeys = Object.keys((bhData && bhData.data) || {});
    } catch (e) {
      debug.parseErr = e.message;
    }
  } catch (err) {
    debug.fetchErr = err.message;
    console.error('BH_DEBUG', JSON.stringify(debug));
    return res.status(502).json({ error: 'Subscription failed.' });
  }

  // Try PUT with tags array (standard v2 update)
  if (subId) {
    try {
      const putResp = await fetch(
        `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BEEHIIV_API_KEY}` },
          body: JSON.stringify({ tags })
        }
      );
      const putText = await putResp.text();
      debug.putStatus = putResp.status;
      debug.putBody = putText.slice(0, 300);
    } catch (e) {
      debug.putErr = e.message;
    }
  }

  console.error('BH_DEBUG', JSON.stringify(debug));

  if (RESEND_API_KEY && NOTIFY_TO_EMAIL && isBooking) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'noreply@lesaruss.com',
          to: NOTIFY_TO_EMAIL,
          subject: `Booking inquiry from ${name}`,
          html: `<p>${email} - ${source}</p>`
        })
      });
    } catch (err) {}
  }

  return res.status(200).json({ ok: true });
}