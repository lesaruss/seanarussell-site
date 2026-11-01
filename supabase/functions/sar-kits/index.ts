// supabase/functions/sar-kits/index.ts
//
// seanarussell.com media kits (playbook media-kits, brand sean-a-russell).
// One kit per industry, rendered by kit.html from public.sar_kits plus the
// case_studies rows tagged 'sar-kit:<slug>'. Both tables are RLS-on with no
// policies, so this function (service role) is the only reader.
//
// THREE VIEWS of one kit, modeled on the Vegans Explore Creator Media Kit:
//   public  anyone. Live kits only. Public stats only, published stories only,
//           no terms, no PDF.
//   shared  a private link (sar_kit_links.token, unexpired, not revoked) for
//           THAT kit. Adds terms, fee ranges (sar_kits.fees) and the PDF. Still published stories only.
//   you     the owner. The lr_token the seanarussell.com dashboard holds,
//           HMAC-verified exactly as lr-shell verifiedSub does (first 32 bytes
//           of the service key), and the member must be members.is_superadmin.
//           Everything: drafts marked, Make it shine, private links.
// The view is decided here from what the caller proves, never from what it asks
// for: a request for "you" without a valid owner token gets the public view.
//
// Actions (POST JSON, ?action=):
//   list         the kit shelf (live kits; drafts too for the owner)
//   get          {slug, link?, token?}
//   create_link  {slug, label?, days?}  owner only
//   revoke_link  {link}                 owner only

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// ---- Owner check: same token and key derivation as lr-shell verifiedSub ----
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
    const secret = new TextEncoder().encode(SERVICE_KEY.slice(0, 32).padEnd(32, '0'));
    const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${b}`)))) return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(b)));
    if (typeof p.exp === 'number' && p.exp < Math.floor(Date.now() / 1000)) return null;
    return typeof p.sub === 'string' ? p.sub : null;
  } catch { return null; }
}
async function isOwner(token: unknown): Promise<boolean> {
  const sub = await verifiedSub(token);
  if (!sub) return false;
  const { data } = await db.from('members').select('is_superadmin').eq('id', sub).maybeSingle();
  return data?.is_superadmin === true;
}

async function validLink(link: unknown, slug: string): Promise<boolean> {
  if (typeof link !== 'string' || link.length < 20) return false;
  const { data } = await db.from('sar_kit_links').select('token, kit_slug, expires_at, revoked_at, opens').eq('token', link).maybeSingle();
  if (!data || data.kit_slug !== slug || data.revoked_at || new Date(data.expires_at) < new Date()) return false;
  await db.from('sar_kit_links').update({ opens: (data.opens || 0) + 1, last_opened_at: new Date().toISOString() }).eq('token', link);
  return true;
}

type Stat = { v: string; l: string; src: string; public: boolean };

function firstResult(results: unknown): string | null {
  if (Array.isArray(results) && typeof results[0] === 'string') return results[0];
  return null;
}

async function kitStudies(slug: string, owner: boolean) {
  const { data } = await db
    .from('case_studies')
    .select('slug, client_name, industry, status, results, timeframe, testimonial, key_quote, published_content')
    .contains('audience_tags', [`sar-kit:${slug}`]);
  const rows = (data ?? []).filter((r: any) => r.status !== 'retired');
  const studies = rows
    .filter((r: any) => owner || r.status === 'published')
    .map((r: any) => ({
      slug: r.slug,
      client: String(r.client_name || '').replace(/^Sean A\. Russell -- /, ''),
      headline: firstResult(r.results),
      draft: r.status !== 'published',
      story_url: r.published_content ? `https://lesaruss.com/case-studies/${r.slug}` : null,
    }))
    .sort((a: any, b: any) => Number(a.draft) - Number(b.draft));
  const quotes = rows
    .filter((r: any) => r.status === 'published' && (r.testimonial || r.key_quote))
    .map((r: any) => ({ quote: r.testimonial || r.key_quote, by: String(r.client_name || '') }));
  return { studies, quotes, draftCount: rows.filter((r: any) => r.status !== 'published').length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? '';
  const body = await req.json().catch(() => ({}));

  try {
    if (action === 'list') {
      const owner = await isOwner(body.token);
      let q = db.from('sar_kits').select('slug, name, role_line, pose, stats, status, sort').order('sort');
      if (!owner) q = q.eq('status', 'live');
      const { data } = await q;
      return json({
        owner,
        kits: (data ?? []).map((k: any) => {
          const pub = (k.stats as Stat[]).filter((s) => s.public);
          const lead = pub[0] ?? null;
          return { slug: k.slug, name: k.name, role: k.role_line, pose: k.pose, status: k.status, lead: lead ? { v: lead.v, l: lead.l } : null };
        }),
      });
    }

    if (action === 'get') {
      const slug = typeof body.slug === 'string' ? body.slug : '';
      const { data: k } = await db.from('sar_kits').select('*').eq('slug', slug).maybeSingle();
      if (!k) return json({ error: 'not_found' }, 404);
      const owner = await isOwner(body.token);
      if (k.status !== 'live' && !owner) return json({ error: 'not_found' }, 404);
      const view = owner ? 'you' : (await validLink(body.link, slug)) ? 'shared' : 'public';
      const { studies, quotes, draftCount } = await kitStudies(slug, owner);
      const stats = (k.stats as Stat[])
        .filter((s) => owner || s.public)
        .map((s) => ({ v: s.v, l: s.l, draft: !s.public }));
      const out: Record<string, unknown> = {
        view,
        kit: {
          slug: k.slug, name: k.name, role: k.role_line, tagline: k.tagline, pose: k.pose,
          scene: k.scene, scene_caption: k.scene_caption, tags: k.tags, pillars: k.pillars,
          track_record: k.track_record, worked_with: k.worked_with, status: k.status,
        },
        stats, studies, quotes,
      };
      if (view !== 'public') {
        (out.kit as any).terms = k.terms;
        (out.kit as any).fees = Array.isArray(k.fees) ? k.fees : [];
        (out.kit as any).pdf_url = k.pdf_url;
      }
      if (view === 'you') {
        const feesSet = Array.isArray(k.fees) && k.fees.length > 0;
        out.shine = [
          ['Cover, tagline and three pillars', !!k.tagline && Array.isArray(k.pillars) && k.pillars.length >= 3],
          ['At least three public numbers', (k.stats as Stat[]).filter((s) => s.public).length >= 3],
          ['At least two published case studies', studies.filter((s: any) => !s.draft).length >= 2],
          [draftCount ? `Confirm ${draftCount} draft ${draftCount === 1 ? 'story' : 'stories'}` : 'No stories waiting in drafts', draftCount === 0],
          ['A client quote', quotes.length > 0],
          ['A scene illustration', !!k.scene],
          ['Fee ranges for private links', feesSet],
          ['A downloadable PDF', !!k.pdf_url],
        ];
        const { data: links } = await db
          .from('sar_kit_links').select('token, label, expires_at, revoked_at, opens, last_opened_at, created_at')
          .eq('kit_slug', slug).order('created_at', { ascending: false });
        out.links = links ?? [];
      }
      return json(out);
    }

    if (action === 'create_link') {
      if (!(await isOwner(body.token))) return json({ error: 'owner_only' }, 403);
      const slug = typeof body.slug === 'string' ? body.slug : '';
      const { data: k } = await db.from('sar_kits').select('slug').eq('slug', slug).maybeSingle();
      if (!k) return json({ error: 'not_found' }, 404);
      const days = Math.min(Math.max(parseInt(String(body.days ?? 30), 10) || 30, 1), 180);
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      const label = typeof body.label === 'string' ? body.label.slice(0, 120) : null;
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const { error } = await db.from('sar_kit_links').insert({ token, kit_slug: slug, label, expires_at: expires });
      if (error) return json({ error: 'could_not_create' }, 500);
      return json({ token, expires_at: expires, url: `https://seanarussell.com/kits/${slug}?link=${token}` });
    }

    if (action === 'revoke_link') {
      if (!(await isOwner(body.token))) return json({ error: 'owner_only' }, 403);
      const { error } = await db.from('sar_kit_links').update({ revoked_at: new Date().toISOString() }).eq('token', String(body.link || ''));
      if (error) return json({ error: 'could_not_revoke' }, 500);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (_e) {
    return json({ error: 'kits_failed' }, 500);
  }
});
