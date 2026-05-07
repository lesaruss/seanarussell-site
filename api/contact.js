export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, source, website } = req.body || {};
    if (website) return res.status(200).json({ ok: true });
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const KEY = process.env.BEEHIIV_API_KEY;
    const PUB = process.env.BEEHIIV_PUBLICATION_ID;
    if (!KEY || !PUB) return res.status(502).json({ error: 'Not configured.' });
    const BASE = 'https://api.beehiiv.com/v2/publications/' + PUB;
    const authHdr = { Authorization: 'Bearer ' + KEY };
    const hdrs = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY };

    // Search for existing subscriber by email to get full tag data
    const searchResp = await fetch(BASE + '/subscriptions?email=' + encodeURIComponent(email) + '&expand[]=tags', { headers: authHdr });
    const searchTxt = await searchResp.text();
    let searchData; try { searchData = JSON.parse(searchTxt); } catch(e) { searchData = { _raw: searchTxt.slice(0,500) }; }

    // Also try /subscriptions?expand[]=tags&limit=3 to see any tagged subscribers
    const listResp = await fetch(BASE + '/subscriptions?expand[]=tags&limit=3', { headers: authHdr });
    const listTxt = await listResp.text();
    let listData; try { listData = JSON.parse(listTxt); } catch(e) { listData = { _raw: listTxt.slice(0,500) }; }
    // Only return tags portion to avoid bloat
    const listTags = listData && listData.data && listData.data.map(function(s) {
      return { email: s.email, tags: s.tags };
    });

    return res.status(200).json({
      searchStatus: searchResp.status,
      searchSubTags: searchData && searchData.data && searchData.data[0] && searchData.data[0].tags,
      searchSubFull: searchData && searchData.data && searchData.data[0],
      listStatus: listResp.status,
      listTags: listTags
    });
  } catch(err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}