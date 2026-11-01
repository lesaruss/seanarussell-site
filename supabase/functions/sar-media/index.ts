// supabase/functions/sar-media/index.ts
//
// seanarussell.com Watch & Listen (playbook media-kits, Phase 2).
// Sean's shows (sar_media_sources) -> their episodes (sar_media_episodes) ->
// what he features (sar_media_features), shown on /watch and every kit page.
//
// Episodes are read server-side: podcast RSS (same parsing as Vegans Explore's
// ve-podcast) and YouTube channels through the YouTube Data API (the same Google
// key ve-youtube uses). Vegans Explore network episodes are matched to the
// content index (ve_pulse_content) by title and release day (matchNetwork), which gives
// them their YouTube id and their tagged moments (ve_content_moments_live).
// Nothing is copied: audio streams from the show's host, video from YouTube.
//
// Owner = the seanarussell.com lr_token of a members.is_superadmin, verified as
// lr-shell verifiedSub does; ops = LESARUSS_ADMIN_TOKEN as admin_token.
//
// Actions (POST JSON, ?action=):
//   sources                        anyone: shows with roles, kits, counts
//   featured {kit?}                anyone: the features to play
//   refresh {source?}              owner or ops: read feeds and channels again
//   catalog {source, q?, offset?}  owner: episodes to pick from
//   moments {episode_id}           owner: the tagged moments in an episode
//   feature_save {...}             owner: create or update a feature (kits, profiles)
//   feature_remove {id}            owner

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.4.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const KITS = ['executive-marketing', 'education', 'media-production', 'speaker', 'vegan-movement', 'entertainment'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function secret(key: string) {
  const { data } = await db.from('lesaruss_secrets').select('value').eq('key', key).maybeSingle();
  return (data?.value as string) || '';
}

// ---- who is asking ----
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function verifiedSub(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.split('.').length !== 3) return null;
  const [h, b, sig] = token.split('.');
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY.slice(0, 32).padEnd(32, '0')), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${b}`)))) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(b)));
    if (typeof p.exp === 'number' && p.exp < Math.floor(Date.now() / 1000)) return null;
    return typeof p.sub === 'string' ? p.sub : null;
  } catch { return null; }
}
async function isOwner(body: any): Promise<boolean> {
  if (typeof body.admin_token === 'string' && body.admin_token.length > 10) {
    const t = await secret('LESARUSS_ADMIN_TOKEN');
    if (t && body.admin_token === t) return true;
  }
  const sub = await verifiedSub(body.token);
  if (!sub) return false;
  const { data } = await db.from('members').select('is_superadmin').eq('id', sub).maybeSingle();
  return data?.is_superadmin === true;
}

// ---- podcast RSS ----
const txt = (v: any): string => v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v);
function plain(html: string, max: number): string {
  const s = html.replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' } as any)[e.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '...' : s;
}
function seconds(d: string): number | null {
  const s = d.trim(); if (!s) return null;
  if (/^\d+$/.test(s)) return +s;
  const p = s.split(':').map(Number); if (p.some(isNaN)) return null;
  return p.reduce((a, b) => a * 60 + b, 0);
}
const httpUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u) ? u : '';

async function readFeed(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': 'SeanARussell/1.0 (+https://seanarussell.com)', Accept: 'application/rss+xml, application/xml, text/xml, */*' }, redirect: 'follow', signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('The feed answered ' + r.status);
  const xml = await r.text();
  const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text', processEntities: true, htmlEntities: true }).parse(xml);
  const ch = doc?.rss?.channel; if (!ch) throw new Error('Not a podcast RSS feed');
  const items = ([] as any[]).concat(ch.item || []);
  const eps = items.map((it) => {
    const enc = ([] as any[]).concat(it.enclosure || []).find((e) => e?.['@_url']) || {};
    const audio = httpUrl(String(enc['@_url'] || ''));
    const title = plain(txt(it.title) || txt(it['itunes:title']), 300);
    const date = Date.parse(txt(it.pubDate));
    return {
      guid: (txt(it.guid) || audio || title).slice(0, 500), title, audio_url: audio,
      published_at: isNaN(date) ? null : new Date(date).toISOString(), duration_s: seconds(txt(it['itunes:duration'])),
      image: httpUrl(it['itunes:image']?.['@_href'] || '') || null, link: httpUrl(txt(it.link)) || null,
      summary: plain(txt(it.description) || txt(it['itunes:summary']) || txt(it['content:encoded']), 600) || null,
    };
  }).filter((e) => e.audio_url && e.title);
  return {
    cover: httpUrl(ch['itunes:image']?.['@_href'] || txt(ch.image?.url) || '') || null,
    description: plain(txt(ch.description) || txt(ch['itunes:summary']), 600) || null,
    eps,
  };
}

// ---- YouTube ----
async function yt(path: string, params: Record<string, string>) {
  const key = (await secret('YOUTUBE_API_KEY')) || (await secret('GOOGLE_PLACES_API_KEY'));
  if (!key) throw new Error('no_key');
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`);
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message ? `${r.status} ${d.error.message}`.slice(0, 300) : `youtube ${r.status}`);
  return d;
}
const pic = (t: any) => t?.maxres?.url || t?.standard?.url || t?.high?.url || t?.medium?.url || t?.default?.url || '';
function isoSeconds(iso: string): number | null {
  const m = String(iso || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return ((+m[1] || 0) * 24 + (+m[2] || 0)) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}
async function readChannel(src: any) {
  const params: Record<string, string> = { part: 'snippet,contentDetails' };
  if (src.channel_id) params.id = src.channel_id; else params.forHandle = String(src.youtube_handle || '').replace(/^@?/, '@');
  const c = (await yt('channels', params)).items?.[0];
  if (!c) throw new Error('channel_not_found');
  const uploads = c.contentDetails?.relatedPlaylists?.uploads;
  let items: any[] = [], page = '';
  do {
    const d = await yt('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50', ...(page ? { pageToken: page } : {}) });
    items = items.concat(d.items || []);
    page = d.nextPageToken || '';
  } while (page && items.length < 500);
  const vids = items.map((i) => ({
    guid: i.contentDetails?.videoId || '', youtube_id: i.contentDetails?.videoId || '', title: i.snippet?.title || '',
    published_at: i.contentDetails?.videoPublishedAt || i.snippet?.publishedAt || null, image: pic(i.snippet?.thumbnails) || null,
    summary: String(i.snippet?.description || '').slice(0, 600) || null, duration_s: null as number | null,
    link: i.contentDetails?.videoId ? `https://www.youtube.com/watch?v=${i.contentDetails.videoId}` : null,
  })).filter((v) => /^[\w-]{11}$/.test(v.youtube_id) && v.title !== 'Private video' && v.title !== 'Deleted video');
  for (let i = 0; i < vids.length; i += 50) {
    const d = await yt('videos', { part: 'contentDetails', id: vids.slice(i, i + 50).map((v) => v.youtube_id).join(',') });
    const dur: Record<string, number | null> = {};
    for (const it of d.items || []) dur[it.id] = isoSeconds(it.contentDetails?.duration);
    for (const v of vids.slice(i, i + 50)) v.duration_s = dur[v.youtube_id] ?? null;
  }
  return { channel_id: c.id, cover: pic(c.snippet?.thumbnails) || null, description: String(c.snippet?.description || '').slice(0, 600) || null, eps: vids };
}

// ---- match to the Vegans Explore content index ----
// The index stores no audio URLs, its titles differ from the feeds ("X | E16 |
// Pre-Vegans Podcast" against "X Explained | E16") and some episodes are filed
// under a sister show. So the four network shows are matched together, one to
// one (each index entry to at most one episode, best score first):
//   3    the same title once episode codes and show names are taken off
//   2+o  released within 36 hours of each other and a third of the words shared
//   1+o  the same show and three quarters of the words shared
// Anything weaker stays unmatched: no video is better than the wrong video.
const NETWORK = { 'vegans-explore-podcast': 'Vegans Explore Podcast', 'soflo-vegans-podcast': 'SoFlo Vegans Podcast', 'pre-vegans-podcast': 'Pre-Vegans Podcast', 'vegans-who-lift-podcast': 'Vegans Who Lift Podcast' } as Record<string, string>;
const norm = (s: string) => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const clean = (s: string) => norm(String(s || '').replace(/\|\s*(e|ep|episode)\s*\d+/gi, ' ').replace(/[|\u2013\u2014-][^|\u2013\u2014]*podcast[^|\u2013\u2014]*$/i, ' ').replace(/\|/g, ' '));
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'how', 'why', 'what', 'your', 'you', 'podcast', 'vegans', 'vegan', 'explore', 'episode', 'e', 'ep', 'part', 'dr']);
const words = (s: string) => new Set(clean(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w)));
function overlap(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0; for (const w of a) if (b.has(w)) n++;
  return n / Math.max(a.size, b.size);
}
async function matchNetwork() {
  const { data: idx } = await db.from('ve_pulse_content').select('id, title, youtube_id, published_at, podcast_show').in('podcast_show', Object.values(NETWORK));
  const { data: eps } = await db.from('sar_media_episodes').select('*').in('source_slug', Object.keys(NETWORK));
  const I = (idx ?? []).map((r: any) => ({ r, c: clean(r.title), w: words(r.title), t: r.published_at ? Date.parse(r.published_at) : NaN }));
  const E = (eps ?? []).map((e: any) => ({ e, c: clean(e.title), w: words(e.title), t: e.published_at ? Date.parse(e.published_at) : NaN, show: NETWORK[e.source_slug] }));
  const pairs: [number, number, number][] = [];
  E.forEach((x, i) => I.forEach((y, j) => {
    const o = overlap(x.w, y.w);
    const day = !isNaN(x.t) && !isNaN(y.t) && Math.abs(x.t - y.t) < 36 * 3600e3;
    const score = x.c && x.c === y.c ? 3 + (x.show === y.r.podcast_show ? 0.5 : 0) : day && o >= 0.34 ? 2 + o : x.show === y.r.podcast_show && o >= 0.75 ? 1 + o : 0;
    if (score) pairs.push([score, i, j]);
  }));
  pairs.sort((a, b) => b[0] - a[0]);
  const usedE = new Set<number>(), usedI = new Set<number>(), match: Record<number, any> = {};
  for (const [, i, j] of pairs) { if (usedE.has(i) || usedI.has(j)) continue; usedE.add(i); usedI.add(j); match[i] = I[j].r; }
  const rows = E.map((x, i) => ({ ...x.e, content_id: match[i]?.id ?? null, youtube_id: match[i]?.youtube_id ?? null }));
  for (let k = 0; k < rows.length; k += 200) {
    const { error } = await db.from('sar_media_episodes').upsert(rows.slice(k, k + 200), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  return { episodes: rows.length, matched: Object.keys(match).length };
}

async function refreshSource(src: any) {
  try {
    const got = src.kind === 'youtube' ? await readChannel(src) : await readFeed(src.rss_url);
    const eps = got.eps.map((e: any) => ({ ...e, source_slug: src.slug }));
    for (let i = 0; i < eps.length; i += 200) {
      const { error } = await db.from('sar_media_episodes').upsert(eps.slice(i, i + 200), { onConflict: 'source_slug,guid' });
      if (error) throw new Error(error.message);
    }
    await db.from('sar_media_sources').update({
      cover: got.cover, description: got.description, episode_count: eps.length, fetched_at: new Date().toISOString(), error: null,
      ...(src.kind === 'youtube' && (got as any).channel_id ? { channel_id: (got as any).channel_id } : {}),
    }).eq('slug', src.slug);
    return { slug: src.slug, episodes: eps.length };
  } catch (e) {
    const msg = String((e as Error).message || e).slice(0, 300);
    await db.from('sar_media_sources').update({ error: msg, fetched_at: new Date().toISOString() }).eq('slug', src.slug);
    return { slug: src.slug, error: msg };
  }
}

function cleanKits(k: unknown): string[] {
  return Array.isArray(k) ? [...new Set(k.filter((x) => typeof x === 'string' && KITS.includes(x)))] as string[] : [];
}

// Directory profiles (sar_directory) a feature also shows on, Phase 2b.
async function cleanProfiles(p: unknown): Promise<string[]> {
  const want = Array.isArray(p) ? [...new Set(p.filter((x) => typeof x === 'string' && /^[a-z0-9-]{1,80}$/.test(x)))] as string[] : [];
  if (!want.length) return [];
  const { data } = await db.from('sar_directory').select('slug').in('slug', want);
  return (data ?? []).map((r: any) => r.slug);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const action = new URL(req.url).searchParams.get('action') ?? '';
  const body = await req.json().catch(() => ({}));

  try {
    if (action === 'sources') {
      const { data } = await db.from('sar_media_sources').select('slug, name, kind, network, roles, kits, cover, description, episode_count, youtube_handle, rss_url, sort').order('sort');
      return json({ sources: data ?? [] });
    }

    if (action === 'featured') {
      const kit = typeof body.kit === 'string' ? body.kit : '';
      let q = db.from('sar_media_features')
        .select('id, format, start_s, end_s, title, summary, kits, profiles, sort, created_at, sar_media_episodes!inner(id, title, published_at, duration_s, audio_url, youtube_id, image, link, source_slug, sar_media_sources!inner(slug, name, kind, network, cover))')
        .order('sort').order('created_at', { ascending: false });
      if (kit) q = q.contains('kits', [kit]);
      const { data, error } = await q;
      if (error) return json({ error: 'featured_failed' }, 500);
      return json({
        items: (data ?? []).map((f: any) => {
          const e = f.sar_media_episodes, s = e.sar_media_sources;
          return {
            id: f.id, episode_id: e.id, format: f.format, start_s: f.start_s, end_s: f.end_s, kits: f.kits, profiles: f.profiles,
            title: f.title || e.title, summary: f.summary, episode_title: e.title, published_at: e.published_at,
            duration_s: e.duration_s, audio_url: e.audio_url, youtube_id: e.youtube_id, link: e.link,
            image: e.image || s.cover, show: s.name, show_slug: s.slug, network: s.network,
          };
        }),
      });
    }

    if (!(await isOwner(body))) return json({ error: 'owner_only' }, 403);

    if (action === 'refresh') {
      let q = db.from('sar_media_sources').select('*').order('sort');
      if (typeof body.source === 'string' && body.source) q = q.eq('slug', body.source);
      const { data: srcs } = await q;
      const out = [];
      for (const s of srcs ?? []) out.push(await refreshSource(s));
      const network = (srcs ?? []).some((s: any) => NETWORK[s.slug]) ? await matchNetwork() : null;
      return json({ results: out, network });
    }

    if (action === 'catalog') {
      const src = String(body.source || '');
      const offset = Math.max(0, parseInt(String(body.offset ?? 0), 10) || 0);
      let q = db.from('sar_media_episodes').select('id, title, published_at, duration_s, audio_url, youtube_id, image, content_id', { count: 'exact' })
        .eq('source_slug', src).order('published_at', { ascending: false, nullsFirst: false }).range(offset, offset + 29);
      const term = String(body.q || '').trim();
      if (term) q = q.ilike('title', `%${term.replace(/[%_]/g, '')}%`);
      const { data, count } = await q;
      const ids = (data ?? []).map((e: any) => e.id);
      const { data: feats } = ids.length ? await db.from('sar_media_features').select('episode_id').in('episode_id', ids) : { data: [] };
      const featured: Record<string, number> = {};
      for (const f of feats ?? []) featured[(f as any).episode_id] = (featured[(f as any).episode_id] || 0) + 1;
      const cids = (data ?? []).map((e: any) => e.content_id).filter(Boolean);
      const moments: Record<string, number> = {};
      if (cids.length) {
        const { data: ms } = await db.from('ve_content_moments_live').select('content_id').in('content_id', cids);
        for (const m of ms ?? []) moments[(m as any).content_id] = (moments[(m as any).content_id] || 0) + 1;
      }
      return json({
        total: count ?? 0,
        episodes: (data ?? []).map((e: any) => ({ ...e, featured: featured[e.id] || 0, moments: e.content_id ? moments[e.content_id] || 0 : 0 })),
      });
    }

    if (action === 'moments') {
      const { data: ep } = await db.from('sar_media_episodes').select('id, content_id').eq('id', String(body.episode_id || '')).maybeSingle();
      if (!ep?.content_id) return json({ moments: [] });
      const { data } = await db.from('ve_content_moments_live').select('id, start_s, end_s, speaker, quote, summary, topics').eq('content_id', ep.content_id).order('start_s');
      return json({ moments: data ?? [] });
    }

    if (action === 'feature_save') {
      const format = body.format === 'highlight' ? 'highlight' : 'full';
      const row: Record<string, unknown> = {
        episode_id: String(body.episode_id || ''), format,
        start_s: format === 'highlight' ? Number(body.start_s) : null,
        end_s: format === 'highlight' ? Number(body.end_s) : null,
        moment_id: typeof body.moment_id === 'string' && body.moment_id ? body.moment_id : null,
        title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 200) : null,
        summary: typeof body.summary === 'string' && body.summary.trim() ? body.summary.trim().slice(0, 400) : null,
        kits: cleanKits(body.kits),
        profiles: await cleanProfiles(body.profiles),
        sort: Number.isFinite(+body.sort) ? +body.sort : 100,
      };
      if (format === 'highlight' && !(Number.isFinite(row.start_s as number) && Number.isFinite(row.end_s as number) && (row.end_s as number) > (row.start_s as number) && (row.start_s as number) >= 0))
        return json({ error: 'bad_times' }, 400);
      const { data: ep } = await db.from('sar_media_episodes').select('id').eq('id', row.episode_id).maybeSingle();
      if (!ep) return json({ error: 'no_episode' }, 404);
      const q = typeof body.id === 'string' && body.id
        ? db.from('sar_media_features').update(row).eq('id', body.id).select('id').maybeSingle()
        : db.from('sar_media_features').insert(row).select('id').maybeSingle();
      const { data, error } = await q;
      if (error || !data) return json({ error: 'could_not_save' }, 500);
      return json({ ok: true, id: (data as any).id });
    }

    if (action === 'feature_remove') {
      const { error } = await db.from('sar_media_features').delete().eq('id', String(body.id || ''));
      if (error) return json({ error: 'could_not_remove' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (_e) {
    return json({ error: 'media_failed' }, 500);
  }
});
