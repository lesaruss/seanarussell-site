// supabase/functions/sar-directory/index.ts
//
// seanarussell.com Directory (playbook media-kits, Phase 2b): who and what Sean
// has worked with, told from his side. Rows live in public.sar_directory
// (RLS on, no policies, so this function is the only reader).
//
// Nothing is copied that already has a home:
//   podcasts and channels  episodes from sar_media_episodes (read by sar-media)
//   Listen on              the Vegans Explore listing (public.listings) when one exists
//   guest shows            Sean's episode from the Press feed (lesaruss.com/api/press)
//   case studies           public.case_studies (published only, drafts for the owner)
//   videos                 Watch & Listen features tagged to the profile
//
// Owner = the seanarussell.com lr_token of a members.is_superadmin (as lr-shell
// verifiedSub checks it); ops = LESARUSS_ADMIN_TOKEN as admin_token.
//
// Actions (POST JSON, ?action=):
//   list                          anyone: the directory (drafts too for the owner)
//   get {slug}                    anyone: one profile with its shows, stories, videos
//   episodes {slug, q?, offset?}  anyone: a show's or channel's episodes, 20 a page
//   logo_scout {url}              owner: logo candidates on a brand's own site
//   logo_import {slug, src}       owner: copy a logo into public storage, set it
//   save {slug, ...}              owner: edit a profile's text fields

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);
const PRESS_URL = 'https://lesaruss.com/api/press';
const LOGO_BUCKET = 'vegan-media';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// The role key. Sean's definitions (2026-11-01), checked against standard
// podcast and TV credits; Founder added for the brands he started.
const KEY: Record<string, string> = {
  'Executive Producer': 'The top credit. Owns the show at the business level: funding, distribution, partnerships and sponsors, and the final call on direction.',
  Producer: 'Hands-on with every episode: finding and booking guests, planning, recording, editing and publishing.',
  Host: 'The voice on the mic who leads the conversation.',
  Guest: "Invited onto someone else's show.",
  Founder: 'Started it and runs it.',
  Client: 'Hired Sean or LESARUSS to deliver work.',
  Employer: 'Sean was on staff.',
  Partner: 'An ongoing role alongside them.',
};

async function secret(key: string) {
  const { data } = await db.from('lesaruss_secrets').select('value').eq('key', key).maybeSingle();
  return (data?.value as string) || '';
}
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

// ---- the Press feed (guest shows), cached per instance for 10 minutes ----
let PRESS: { at: number; byId: Record<string, any> } | null = null;
async function press(): Promise<Record<string, any>> {
  if (PRESS && Date.now() - PRESS.at < 600e3) return PRESS.byId;
  try {
    const r = await fetch(PRESS_URL, { signal: AbortSignal.timeout(8000) });
    const list = r.ok ? await r.json() : [];
    const byId: Record<string, any> = {};
    for (const p of Array.isArray(list) ? list : []) if (p && p.id) byId[p.id] = p;
    PRESS = { at: Date.now(), byId };
  } catch { PRESS = { at: Date.now() - 540e3, byId: PRESS?.byId ?? {} }; }
  return PRESS.byId;
}
const ytId = (u: string) => (String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/live\/|\/embed\/)([\w-]{11})/) || [])[1] || null;

// ---- shaping ----
const SOURCE_COLS = 'slug, name, kind, network, cover, description, episode_count, youtube_handle, channel_id, rss_url';
async function sourcesBy(slugs: string[]) {
  if (!slugs.length) return {} as Record<string, any>;
  const { data } = await db.from('sar_media_sources').select(SOURCE_COLS).in('slug', slugs);
  return Object.fromEntries((data ?? []).map((s: any) => [s.slug, s]));
}
async function listingsBy(slugs: string[]) {
  if (!slugs.length) return {} as Record<string, any>;
  const { data } = await db.from('listings').select('slug, logo_url, website, apple_podcasts_url, spotify_url, amazon_music_url, youtube, rss_url, description, tagline').in('slug', slugs).eq('status', 'approved');
  return Object.fromEntries((data ?? []).map((l: any) => [l.slug, l]));
}
function card(r: any, src: any, lst: any, pr: any) {
  const p = r.press_id ? pr[r.press_id] : null;
  return {
    slug: r.slug, kind: r.kind, name: r.name, status: r.status,
    logo: r.logo || lst?.logo_url || src?.cover || p?.img || null,
    tagline: r.tagline || (p ? [p.subtitle, p.date].filter(Boolean).join(' · ') : '') || lst?.tagline || firstSentence(src?.description) || null,
    relationship: r.relationship, roles: r.roles, kits: r.kits, parent_slug: r.parent_slug,
    aliases: r.aliases, network: src?.network ?? null, episodes: src?.episode_count ?? null,
    year: p?.year ?? null,
  };
}
function firstSentence(s: unknown): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const m = t.match(/^(.{20,180}?[.!?])(\s|$)/);
  return m ? m[1] : t.slice(0, 160).replace(/\s+\S*$/, '') + '...';
}
function keyFor(...lists: string[][]) {
  const out: Record<string, string> = {};
  for (const l of lists) for (const k of l || []) if (KEY[k]) out[k] = KEY[k];
  return out;
}

async function studiesFor(slugs: string[], owner: boolean) {
  if (!slugs.length) return [];
  const { data } = await db.from('case_studies').select('slug, client_name, status, results, audience_tags, published_content').in('slug', slugs);
  const { data: kits } = await db.from('sar_kits').select('slug, name, highlights');
  const kitName: Record<string, string> = {}, value: Record<string, string> = {};
  for (const k of kits ?? []) { kitName[(k as any).slug] = (k as any).name; Object.assign(value, (k as any).highlights || {}); }
  return (data ?? [])
    .filter((r: any) => r.status !== 'retired' && (owner || r.status === 'published'))
    .map((r: any) => ({
      slug: r.slug,
      client: String(r.client_name || '').replace(/^Sean A\. Russell -- /, '').replace(/ -- /g, ': '),
      headline: Array.isArray(r.results) && typeof r.results[0] === 'string' ? r.results[0] : null,
      value: value[r.slug] ?? null,
      draft: r.status !== 'published',
      story_url: r.published_content ? `https://lesaruss.com/case-studies/${r.slug}` : null,
      kits: (r.audience_tags || []).filter((t: string) => t.startsWith('sar-kit:')).map((t: string) => { const s = t.slice(8); return { slug: s, name: kitName[s] || s }; }),
    }))
    .sort((a: any, b: any) => Number(a.draft) - Number(b.draft));
}

async function videosFor(slug: string) {
  const { data } = await db.from('sar_media_features')
    .select('id, format, start_s, end_s, title, summary, kits, sort, created_at, sar_media_episodes!inner(id, title, published_at, duration_s, audio_url, youtube_id, image, link, sar_media_sources!inner(slug, name, network, cover))')
    .contains('profiles', [slug]).order('sort').order('created_at', { ascending: false });
  return (data ?? []).map((f: any) => {
    const e = f.sar_media_episodes, s = e.sar_media_sources;
    return {
      id: f.id, episode_id: e.id, format: f.format, start_s: f.start_s, end_s: f.end_s, kits: f.kits,
      title: f.title || e.title, summary: f.summary, episode_title: e.title, published_at: e.published_at,
      duration_s: e.duration_s, audio_url: e.audio_url, youtube_id: e.youtube_id, link: e.link,
      image: e.image || s.cover, show: s.name, show_slug: s.slug, network: s.network,
    };
  });
}

async function episodes(source: string, q: string, offset: number, limit: number) {
  let query = db.from('sar_media_episodes').select('id, title, published_at, duration_s, audio_url, youtube_id, image, link, summary', { count: 'exact' })
    .eq('source_slug', source).order('published_at', { ascending: false, nullsFirst: false }).range(offset, offset + limit - 1);
  const term = q.trim().replace(/[%_,()]/g, '');
  if (term) query = query.ilike('title', `%${term}%`);
  const { data, count } = await query;
  return { total: count ?? 0, episodes: data ?? [] };
}

function listenOn(src: any, lst: any, firstLink: string | null) {
  const site = lst?.website || (firstLink && /captivate\.fm/.test(firstLink) ? new URL(firstLink).origin : null);
  const yt = lst?.youtube ? (/^https?:/.test(lst.youtube) ? lst.youtube : 'https://www.youtube.com/' + String(lst.youtube).replace(/^@?/, '@')) : null;
  return [
    ['Website', site], ['Spotify', lst?.spotify_url], ['Apple Podcasts', lst?.apple_podcasts_url],
    ['Amazon Music', lst?.amazon_music_url], ['YouTube', yt], ['RSS', src?.rss_url || lst?.rss_url],
  ].filter((x) => typeof x[1] === 'string' && /^https?:\/\//.test(x[1] as string)).map(([label, url]) => ({ label, url }));
}

// ---- logos ----
async function scout(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeanARussell/1.0; +https://seanarussell.com)' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const html = (await r.text()).slice(0, 600000);
  const abs = (u: string) => { try { return new URL(u.replace(/&amp;/g, '&'), r.url).href; } catch { return ''; } };
  const found: { kind: string; url: string }[] = [];
  const add = (kind: string, u: string | undefined) => { const a = u ? abs(u) : ''; if (a && !found.some((f) => f.url === a)) found.push({ kind, url: a }); };
  for (const m of html.matchAll(/<img[^>]+>/gi)) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    add('img', (tag.match(/\ssrc="([^"]+)"/i) || tag.match(/\sdata-src="([^"]+)"/i) || [])[1]);
  }
  for (const m of html.matchAll(/<link[^>]+rel="(?:apple-touch-icon|icon|shortcut icon)"[^>]*>/gi)) add('icon', (m[0].match(/href="([^"]+)"/i) || [])[1]);
  add('og', (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) || [])[1]);
  return { status: r.status, final_url: r.url, title: ((html.match(/<title[^>]*>([^<]*)/i) || [])[1] || '').trim().slice(0, 200), candidates: found.slice(0, 12) };
}
async function importLogo(slug: string, src: any) {
  let bytes: Uint8Array, type = 'image/png';
  if (src && typeof src === 'object' && src.bucket && src.path) {
    const { data, error } = await db.storage.from(String(src.bucket)).download(String(src.path));
    if (error || !data) throw new Error('download_failed');
    bytes = new Uint8Array(await data.arrayBuffer()); type = data.type || type;
  } else {
    const r = await fetch(String(src), { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeanARussell/1.0)' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('fetch_' + r.status);
    type = (r.headers.get('content-type') || '').split(';')[0] || type;
    bytes = new Uint8Array(await r.arrayBuffer());
  }
  if (!/^image\//.test(type)) throw new Error('not_an_image ' + type);
  if (bytes.length > 3_000_000) throw new Error('too_large');
  const ext = ({ 'image/svg+xml': 'svg', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico' } as Record<string, string>)[type] || 'png';
  const path = `sar/logos/${slug}-${Date.now().toString(36)}.${ext}`;
  const { error } = await db.storage.from(LOGO_BUCKET).upload(path, bytes, { contentType: type, upsert: true });
  if (error) throw new Error('upload_failed ' + error.message);
  const url = `${SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
  await db.from('sar_directory').update({ logo: url, updated_at: new Date().toISOString() }).eq('slug', slug);
  return { url, type, bytes: bytes.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const action = new URL(req.url).searchParams.get('action') ?? '';
  const body = await req.json().catch(() => ({}));

  try {
    if (action === 'list') {
      const owner = await isOwner(body);
      let q = db.from('sar_directory').select('*').order('sort');
      if (!owner) q = q.eq('status', 'live');
      const { data: rows } = await q;
      const R = rows ?? [];
      const [src, lst, pr] = await Promise.all([
        sourcesBy(R.map((r: any) => r.source_slug).filter(Boolean)),
        listingsBy(R.map((r: any) => r.ve_listing).filter(Boolean)),
        R.some((r: any) => r.press_id) ? press() : Promise.resolve({}),
      ]);
      return json({ owner, key: KEY, items: R.map((r: any) => card(r, src[r.source_slug], lst[r.ve_listing], pr)) });
    }

    if (action === 'get') {
      const owner = await isOwner(body);
      const slug = String(body.slug || '');
      const { data: r } = await db.from('sar_directory').select('*').eq('slug', slug).maybeSingle();
      if (!r || (r.status !== 'live' && !owner)) return json({ error: 'not_found' }, 404);
      let kq = db.from('sar_directory').select('*').eq('parent_slug', slug).order('sort');
      if (!owner) kq = kq.eq('status', 'live');
      const [{ data: kids }, { data: parent }] = await Promise.all([
        kq,
        r.parent_slug ? db.from('sar_directory').select('*').eq('slug', r.parent_slug).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const all = [r, ...(kids ?? []), ...(parent ? [parent] : [])];
      const [src, lst, pr] = await Promise.all([
        sourcesBy(all.map((x: any) => x.source_slug).filter(Boolean)),
        listingsBy(all.map((x: any) => x.ve_listing).filter(Boolean)),
        r.press_id ? press() : Promise.resolve({} as Record<string, any>),
      ]);
      const s = src[r.source_slug], l = lst[r.ve_listing];
      const eps = r.source_slug ? await episodes(r.source_slug, '', 0, s?.kind === 'youtube' ? 12 : 20) : null;
      const p = r.press_id ? pr[r.press_id] : null;
      const roles = [...r.roles];
      const showRoles = (kids ?? []).flatMap((k: any) => k.roles);
      return json({
        owner,
        profile: {
          ...card(r, s, l, pr),
          website: r.website, about: r.about || l?.description || s?.description || null, did: r.did,
          source: s ? { slug: s.slug, kind: s.kind, name: s.name, cover: s.cover, episodes: s.episode_count, handle: s.youtube_handle, channel_id: s.channel_id } : null,
          listen_on: s?.kind === 'podcast' ? listenOn(s, l, eps?.episodes?.[0]?.link ?? null) : [],
          channel_url: s?.kind === 'youtube' ? (s.channel_id ? `https://www.youtube.com/channel/${s.channel_id}` : `https://www.youtube.com/${s.youtube_handle}`) : null,
          guest: p ? { title: p.title, episode: p.subtitle || null, date: p.date, year: p.year, url: p.href, youtube_id: ytId(p.href), summary: p.desc, image: p.img } : null,
        },
        parent: parent ? card(parent, src[parent.source_slug], lst[parent.ve_listing], pr) : null,
        shows: (kids ?? []).map((k: any) => card(k, src[k.source_slug], lst[k.ve_listing], pr)),
        episodes: eps,
        studies: await studiesFor(r.case_studies || [], owner),
        videos: await videosFor(slug),
        key: keyFor(roles, r.relationship, showRoles),
      });
    }

    if (action === 'episodes') {
      const { data: r } = await db.from('sar_directory').select('source_slug, status').eq('slug', String(body.slug || '')).maybeSingle();
      if (!r?.source_slug || (r.status !== 'live' && !(await isOwner(body)))) return json({ error: 'not_found' }, 404);
      const limit = Math.min(50, Math.max(1, parseInt(String(body.limit ?? 20), 10) || 20));
      const offset = Math.max(0, parseInt(String(body.offset ?? 0), 10) || 0);
      return json(await episodes(r.source_slug, String(body.q || ''), offset, limit));
    }

    if (!(await isOwner(body))) return json({ error: 'owner_only' }, 403);

    if (action === 'logo_scout') {
      const url = String(body.url || '');
      if (!/^https?:\/\/[^\s]+$/.test(url)) return json({ error: 'bad_url' }, 400);
      return json(await scout(url));
    }

    if (action === 'logo_import') {
      const slug = String(body.slug || '');
      const { data: r } = await db.from('sar_directory').select('slug').eq('slug', slug).maybeSingle();
      if (!r) return json({ error: 'not_found' }, 404);
      if (!body.src) return json({ error: 'no_src' }, 400);
      return json({ ok: true, ...(await importLogo(slug, body.src)) });
    }

    if (action === 'save') {
      const slug = String(body.slug || '');
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ['name', 'tagline', 'about', 'website', 'logo']) if (typeof body[k] === 'string') patch[k] = body[k].trim() || null;
      for (const k of ['relationship', 'roles', 'kits', 'aliases', 'case_studies']) if (Array.isArray(body[k])) patch[k] = body[k].filter((x: unknown) => typeof x === 'string');
      if (Array.isArray(body.did)) patch.did = body.did.filter((d: any) => d && typeof d.title === 'string' && typeof d.body === 'string').map((d: any) => ({ title: d.title, body: d.body }));
      if (body.status === 'live' || body.status === 'draft') patch.status = body.status;
      if (patch.name === null) delete patch.name;
      const { data, error } = await db.from('sar_directory').update(patch).eq('slug', slug).select('slug').maybeSingle();
      if (error || !data) return json({ error: 'could_not_save' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: 'directory_failed', detail: String((e as Error).message || e).slice(0, 200) }, 500);
  }
});
