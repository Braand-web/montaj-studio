import { kindOf, maxSize, extractText, clip, type FileKind } from '../../app/src/lib/attach/extract';
import { scrape } from './scrape';
import { claudeTurn, ClientError } from './claude';
import { BlockedError } from './ssrf';

// Montaj Studio server (Cloudflare Worker): serves the app and its /api.
//   PUT  /api/upload      store an attachment in R2 (size and type limits)
//   POST /api/extract     text of a stored document (PDF, Word, Excel, CSV, text, code, ZIP)
//   POST /api/transcribe  audio (16 kHz WAV from the browser) → text with Workers AI Whisper
//   POST /api/scrape      analyze a public web page (SSRF-safe, robots.txt, timeouts)
//   POST /api/claude      one Claude turn for the app's agent loop (owner's API key)

export interface Env {
  ASSETS: Fetcher;
  UPLOADS: R2Bucket;
  AI?: Ai;
  BROWSER?: Fetcher;
  RL?: RateLimit;
  ANTHROPIC_API_KEY?: string;
  ACCESS_CODE?: string; // optional: when set, the app must send it (x-montaj-code)
}

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (code: string, error: string, status = 400) => json({ code, error }, status);

async function guard(req: Request, env: Env, path: string): Promise<Response | null> {
  // Same-origin only: the app is served by this Worker.
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return fail('forbidden', 'Origine non autorisée', 403);
  if (env.ACCESS_CODE && req.headers.get('x-montaj-code') !== env.ACCESS_CODE && path !== '/api/health') return fail('not_granted', 'Code d’accès requis (Paramètres → Serveur)', 401);
  if (env.RL && path !== '/api/health') {
    const ip = req.headers.get('cf-connecting-ip') ?? 'anon';
    const { success } = await env.RL.limit({ key: `${ip}:${path}` });
    if (!success) return fail('rate_limited', 'Trop de requêtes, réessaie dans une minute', 429);
  }
  return null;
}

async function upload(req: Request, env: Env, url: URL): Promise<Response> {
  const name = (url.searchParams.get('name') ?? 'fichier').slice(0, 200);
  const type = req.headers.get('content-type') ?? 'application/octet-stream';
  const kind = kindOf(name, type);
  if (!kind) return fail('unsupported', `Type de fichier non pris en charge : ${name}`, 415);
  const len = Number(req.headers.get('content-length') ?? 0);
  if (!len) return fail('length_required', 'Taille du fichier inconnue', 411);
  if (len > maxSize(kind)) return fail('too_large', `Fichier trop volumineux (max ${Math.round(maxSize(kind) / 1048576)} Mo)`, 413);
  const id = crypto.randomUUID();
  await env.UPLOADS.put('u/' + id, req.body, { httpMetadata: { contentType: kind === 'pdf' ? 'application/pdf' : type }, customMetadata: { name, kind, at: String(Date.now()) } });
  return json({ id, size: len, kind });
}

const TEXT_KINDS: FileKind[] = ['pdf', 'docx', 'xlsx', 'csv', 'text', 'code', 'json', 'zip', 'svg'];

async function extract(env: Env, body: { id?: string }): Promise<Response> {
  if (!body.id || !/^[a-z0-9-]{36}$/.test(body.id)) return fail('invalid_request', 'id manquant');
  const obj = await env.UPLOADS.get('u/' + body.id);
  if (!obj) return fail('not_found', 'Fichier introuvable (expiré ?)', 404);
  const kind = (obj.customMetadata?.kind ?? kindOf(obj.customMetadata?.name ?? '')) as FileKind;
  if (!TEXT_KINDS.includes(kind)) return fail('unsupported', 'Pas de texte à extraire pour ce type', 415);
  try {
    const r = await extractText(kind, new Uint8Array(await obj.arrayBuffer()));
    return json({ kind, text: clip(r.text), pages: r.pages, scanned: r.scanned });
  } catch (e) {
    return fail('extract_failed', 'Lecture impossible : ' + (e as Error).message, 422);
  }
}

async function transcribe(req: Request, env: Env): Promise<Response> {
  if (!env.AI) return fail('unavailable', 'Transcription non configurée (binding AI)', 503);
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 25 * 1024 * 1024) return fail('too_large', 'Audio trop long (max ~13 min)', 413);
  const buf = new Uint8Array(await req.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const out = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(bin) }) as { text?: string };
  return json({ text: out.text ?? '' });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(req);
    const denied = await guard(req, env, path);
    if (denied) return denied;
    try {
      if (path === '/api/health' && req.method === 'GET') {
        return json({ ok: true, ai: !!env.ANTHROPIC_API_KEY, upload: true, scrape: true, browser: !!env.BROWSER, transcribe: !!env.AI, maxVideoMb: 100, maxFileMb: 20, locked: !!env.ACCESS_CODE });
      }
      if (path === '/api/upload' && req.method === 'PUT') return await upload(req, env, url);
      if (req.method !== 'POST') return fail('not_found', 'Route inconnue', 404);
      if (path === '/api/transcribe') return await transcribe(req, env);
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      if (path === '/api/extract') return await extract(env, body as { id?: string });
      if (path === '/api/scrape') {
        const r = await scrape(env, String(body.url ?? ''), { crawl: Number(body.crawl ?? 0), preview: !!body.preview });
        return json(r);
      }
      if (path === '/api/claude') return await claudeTurn(env, body, ctx);
      return fail('not_found', 'Route inconnue', 404);
    } catch (e) {
      if (e instanceof BlockedError) return fail(e.code, e.message, 422);
      if (e instanceof ClientError) return fail(e.code, e.message, e.status);
      return fail('server_error', (e as Error).message ?? 'Erreur serveur', 500);
    }
  },
} satisfies ExportedHandler<Env>;
