// Client for the Montaj server (Cloudflare Worker, same origin, /api/*). It exists only when
// the app is hosted by that Worker; inside claude.ai the page cannot reach any server, so
// every caller falls back to in-browser processing and says so.

export interface BackendInfo { ok: boolean; ai: boolean; upload: boolean; scrape: boolean; browser: boolean; transcribe: boolean; maxVideoMb: number; maxFileMb: number; billing?: boolean; byok?: boolean; payments?: { stripe: boolean; plans: Record<string, { month: boolean; year: boolean }>; packs: boolean; mobileMoney: boolean } }

const NONE: BackendInfo = { ok: false, ai: false, upload: false, scrape: false, browser: false, transcribe: false, maxVideoMb: 0, maxFileMb: 0 };
let infoP: Promise<BackendInfo> | null = null;

export const accessCode = {
  get: () => { try { return localStorage.getItem('ms:accessCode') ?? ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem('ms:accessCode', v); } catch { /* storage blocked */ } infoP = null; },
};
// Credit wallet of this device until accounts exist (Supabase): a random id kept in this browser.
export function walletId(): string {
  try {
    let id = localStorage.getItem('ms:wallet');
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) { id = crypto.randomUUID(); localStorage.setItem('ms:wallet', id); }
    return id;
  } catch { return (window as unknown as { __msWallet?: string }).__msWallet ??= crypto.randomUUID(); }
}
export const apiHeaders = (extra: Record<string, string> = {}) => ({ ...extra, 'x-montaj-wallet': walletId(), ...(accessCode.get() ? { 'x-montaj-code': accessCode.get() } : {}) });

export function backend(): Promise<BackendInfo> {
  if (!infoP) {
    const hosted = typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !window.claude;
    infoP = !hosted
      ? Promise.resolve(NONE)
      : fetch('/api/health', { headers: apiHeaders() })
        .then((r) => (r.ok ? r.json() : NONE))
        .then((j: Partial<BackendInfo>) => ({ ...NONE, ...j, ok: !!j.ok }))
        .catch(() => NONE);
  }
  return infoP;
}

export class ApiError extends Error { constructor(public code: string, message: string) { super(message); } }

async function asJson<T>(r: Response): Promise<T> {
  const body = await r.json().catch(() => ({})) as { error?: string; code?: string };
  if (!r.ok) throw new ApiError(body.code ?? String(r.status), body.error ?? `HTTP ${r.status}`);
  return body as T;
}

// Upload with progress (XHR: fetch has no upload progress). Stored in R2 by the Worker.
export function upload(file: Blob, name: string, onProgress: (p: number) => void, signal?: AbortSignal): Promise<{ id: string; size: number; kind: string }> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', `/api/upload?name=${encodeURIComponent(name)}`);
    x.setRequestHeader('content-type', file.type || 'application/octet-stream');
    for (const [k, v] of Object.entries(apiHeaders())) x.setRequestHeader(k, v);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    x.onload = () => {
      let body: { id?: string; size?: number; kind?: string; error?: string; code?: string } = {};
      try { body = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300 && body.id) resolve({ id: body.id, size: body.size ?? file.size, kind: body.kind ?? '' });
      else reject(new ApiError(body.code ?? String(x.status), body.error ?? `HTTP ${x.status}`));
    };
    x.onerror = () => reject(new ApiError('network', 'Connexion au serveur impossible'));
    x.onabort = () => reject(new ApiError('cancelled', 'Envoi annulé'));
    signal?.addEventListener('abort', () => x.abort());
    x.send(file);
  });
}

export const extractRemote = (id: string) => fetch('/api/extract', { method: 'POST', headers: apiHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ id }) })
  .then((r) => asJson<{ text: string; pages?: number; scanned?: boolean; kind: string }>(r));

export const transcribeRemote = (wav: Blob) => fetch('/api/transcribe', { method: 'POST', headers: apiHeaders({ 'content-type': 'audio/wav' }), body: wav })
  .then((r) => asJson<{ text: string }>(r));

export interface ScrapeResult {
  url: string; finalUrl: string; title: string; description?: string; favicon?: string; image?: string; siteName?: string;
  text: string; headings: string[]; colors: string[]; fonts: string[]; images: string[]; links: string[];
  screenshot?: string; // base64 JPEG
  pages?: { url: string; title: string; text: string }[];
  rendered: boolean; // true when a headless browser rendered the page (JavaScript sites)
}
export const scrapeRemote = (url: string, opts: { crawl?: number; preview?: boolean } = {}, signal?: AbortSignal) =>
  fetch('/api/scrape', { method: 'POST', signal, headers: apiHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ url, ...opts }) })
    .then((r) => asJson<ScrapeResult>(r));
