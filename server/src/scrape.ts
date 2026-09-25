import puppeteer from '@cloudflare/puppeteer';
import { BlockedError, assertPublicDns, parsePublicUrl, robotsAllows, isBlockedHostname } from './ssrf';

// Link analysis: full render in a headless browser (JavaScript sites, screenshot, computed
// colors and fonts) through Cloudflare Browser Rendering, with a plain-HTTP fallback.

export interface ScrapeEnv { BROWSER?: Fetcher }
export interface ScrapeOut {
  url: string; finalUrl: string; title: string; description?: string; favicon?: string; image?: string; siteName?: string;
  text: string; headings: string[]; colors: string[]; fonts: string[]; images: string[]; links: string[];
  screenshot?: string; pages?: { url: string; title: string; text: string }[]; rendered: boolean;
}

const UA = 'Mozilla/5.0 (compatible; MontajBot/1.0; +https://github.com/montaj-studio)';
const MAX_HTML = 3 * 1024 * 1024;
const TIMEOUT = 15_000;
const MAX_CRAWL = 5;

async function timedFetch(url: string, init: RequestInit = {}, ms = TIMEOUT): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal, redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', ...(init.headers ?? {}) } }); }
  catch (e) { throw new BlockedError('timeout', (e as Error).name === 'AbortError' ? 'Délai dépassé en chargeant la page' : 'Site injoignable'); }
  finally { clearTimeout(t); }
}

// Follows up to 5 redirects, re-checking every hop (a public URL can redirect inside).
async function safeFetch(raw: string, ms = TIMEOUT): Promise<Response> {
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    const u = parsePublicUrl(url);
    await assertPublicDns(u.hostname);
    const r = await timedFetch(u.href, {}, ms);
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location')!, u).href; continue; }
    Object.defineProperty(r, 'finalUrl', { value: u.href });
    return r;
  }
  throw new BlockedError('redirects', 'Trop de redirections');
}

async function readCapped(r: Response, max = MAX_HTML): Promise<string> {
  const len = Number(r.headers.get('content-length') ?? 0);
  if (len > max) throw new BlockedError('too_large', 'Page trop volumineuse');
  const reader = r.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel(); throw new BlockedError('too_large', 'Page trop volumineuse (plus de 3 Mo)'); }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.length; }
  return new TextDecoder().decode(buf);
}

const robotsCache = new Map<string, string>();
async function allowedByRobots(u: URL): Promise<boolean> {
  let txt = robotsCache.get(u.origin);
  if (txt === undefined) {
    try { const r = await safeFetch(u.origin + '/robots.txt', 5000); txt = r.ok ? (await readCapped(r, 256 * 1024)) : ''; } catch { txt = ''; }
    robotsCache.set(u.origin, txt);
  }
  return robotsAllows(txt, u.pathname + u.search);
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

// Plain HTML parsing (no JavaScript): metadata, headings, text, images, colors and fonts from CSS.
export async function parseHtml(html: string, base: URL): Promise<Omit<ScrapeOut, 'url' | 'finalUrl' | 'rendered'> & { loginWall: boolean }> {
  const meta = (re: RegExp) => { const m = html.match(re); return m ? decode(m[1]).trim() : undefined; };
  const abs = (h?: string) => { try { return h ? new URL(h, base).href : undefined; } catch { return undefined; } };
  const title = meta(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? meta(/property=["']og:title["'][^>]*content=["']([^"']+)/i) ?? base.hostname;
  const body = html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ');
  const headings = [...body.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => `H${m[1]} ${decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()}`).filter((h) => h.length > 3).slice(0, 40);
  const text = decode(body.replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, 30000);
  const images = [...new Set([...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => abs(decode(m[1]))).filter(Boolean) as string[])].filter((s) => !s.startsWith('data:')).slice(0, 20);
  const links = [...new Set([...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => abs(decode(m[1]))).filter(Boolean) as string[])].slice(0, 200);
  let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') + '\n' + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(';');
  for (const m of [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].slice(0, 2)) {
    try { const r = await safeFetch(abs(decode(m[1]))!, 6000); if (r.ok) css += '\n' + (await readCapped(r, 600 * 1024)); } catch { /* skip */ }
  }
  const count = new Map<string, number>();
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) { let h = m[1].toUpperCase(); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); count.set('#' + h, (count.get('#' + h) ?? 0) + 1); }
  const colors = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 12);
  const fonts = [...new Set([...css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map((m) => m[1].split(',')[0].replace(/["']/g, '').trim()).filter((f) => f && !/^(inherit|initial|var\()/i.test(f)))].slice(0, 8);
  const loginWall = /<input[^>]+type=["']password["']/i.test(html) && text.length < 1500;
  return {
    title, headings, text, images, links, colors, fonts, loginWall,
    description: meta(/name=["']description["'][^>]*content=["']([^"']+)/i) ?? meta(/property=["']og:description["'][^>]*content=["']([^"']+)/i),
    image: abs(meta(/property=["']og:image["'][^>]*content=["']([^"']+)/i)),
    siteName: meta(/property=["']og:site_name["'][^>]*content=["']([^"']+)/i),
    favicon: abs(meta(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)/i) ?? '/favicon.ico'),
  };
}

async function httpScrape(u: URL, preview: boolean): Promise<ScrapeOut> {
  const r = await safeFetch(u.href);
  if (r.status === 401 || r.status === 403) throw new BlockedError('login', 'Page privée ou protégée (connexion requise ou accès refusé)');
  if (!r.ok) throw new BlockedError('http', `Le site a répondu ${r.status}`);
  const type = r.headers.get('content-type') ?? '';
  if (!/html|xml/.test(type)) throw new BlockedError('not_html', 'Ce lien n’est pas une page web (' + type.split(';')[0] + ')');
  const finalUrl = (r as Response & { finalUrl?: string }).finalUrl ?? u.href;
  const p = await parseHtml(await readCapped(r, preview ? 1024 * 1024 : MAX_HTML), new URL(finalUrl));
  if (p.loginWall) throw new BlockedError('login', 'Cette page demande une connexion : elle est ignorée');
  const { loginWall: _lw, ...rest } = p;
  return { url: u.href, finalUrl, rendered: false, ...rest };
}

// Runs in the rendered page: text, structure and the computed visual identity.
const EXTRACT = `(() => {
  const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().height > 0; };
  const count = new Map(); const add = (c, w) => { if (!c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent') return; count.set(c, (count.get(c) || 0) + w); };
  const fonts = new Map();
  const els = Array.from(document.querySelectorAll('body, header, nav, main, section, footer, h1, h2, h3, a, button, p, [class*="btn"], [class*="hero"]')).slice(0, 600);
  for (const el of els) { if (!vis(el)) continue; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); const area = Math.min(r.width * r.height, 400000) / 1000 + 1;
    add(s.backgroundColor, area); add(s.color, 2); const f = s.fontFamily.split(',')[0].replace(/["']/g, '').trim(); if (f) fonts.set(f, (fonts.get(f) || 0) + 1); }
  const hex = (c) => { const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); return m ? '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('').toUpperCase() : c; };
  const colors = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => hex(c)).filter((c, i, a) => a.indexOf(c) === i).slice(0, 12);
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || undefined;
  const icon = document.querySelector('link[rel~="icon"]')?.href;
  const imgs = Array.from(document.images).filter((i) => i.naturalWidth >= 200 && !i.src.startsWith('data:')).sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight).map((i) => i.src).slice(0, 20);
  return {
    title: document.title, description: meta('meta[name="description"]') || meta('meta[property="og:description"]'), image: meta('meta[property="og:image"]'), siteName: meta('meta[property="og:site_name"]'),
    favicon: icon || location.origin + '/favicon.ico',
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(vis).map((h) => h.tagName + ' ' + h.innerText.replace(/\\s+/g, ' ').trim()).filter((h) => h.length > 3).slice(0, 40),
    text: (document.body?.innerText || '').replace(/\\n\\s*\\n+/g, '\\n').trim().slice(0, 30000),
    colors, fonts: [...fonts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f).slice(0, 8), images: imgs,
    links: Array.from(document.querySelectorAll('a[href]')).map((a) => a.href).filter((h) => h.startsWith('http')).slice(0, 300),
    loginWall: !!document.querySelector('input[type="password"]') && (document.body?.innerText || '').length < 1500,
  };
})()`;

async function browserScrape(env: Required<ScrapeEnv>, u: URL, crawl: number): Promise<ScrapeOut> {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      try { const h = new URL(req.url()).hostname; if (/^https?:/.test(req.url()) && isBlockedHostname(h)) return void req.abort(); } catch { /* data: etc. */ }
      if (['media', 'websocket'].includes(req.resourceType())) return void req.abort();
      void req.continue();
    });
    const resp = await page.goto(u.href, { waitUntil: 'networkidle2', timeout: 25_000 });
    const status = resp?.status() ?? 0;
    if (status === 401 || status === 403) throw new BlockedError('login', 'Page privée ou protégée (connexion requise ou accès refusé)');
    if (status >= 400) throw new BlockedError('http', `Le site a répondu ${status}`);
    const finalUrl = page.url();
    parsePublicUrl(finalUrl);
    const data = await page.evaluate(EXTRACT) as Omit<ScrapeOut, 'url' | 'finalUrl' | 'rendered'> & { loginWall: boolean };
    if (data.loginWall) throw new BlockedError('login', 'Cette page demande une connexion : elle est ignorée');
    const shot = await page.screenshot({ type: 'jpeg', quality: 70, encoding: 'base64' }) as string;
    const pages: ScrapeOut['pages'] = [];
    if (crawl > 0) {
      const origin = new URL(finalUrl).origin;
      const next = [...new Set(data.links.filter((l) => { try { const x = new URL(l); return x.origin === origin && x.pathname !== new URL(finalUrl).pathname && !/\.(pdf|jpg|png|zip)$/i.test(x.pathname); } catch { return false; } }).map((l) => l.split('#')[0]))].slice(0, Math.min(crawl, MAX_CRAWL));
      for (const l of next) {
        try {
          const lu = parsePublicUrl(l);
          if (!(await allowedByRobots(lu))) continue;
          const r = await page.goto(lu.href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
          if (!r || r.status() >= 400) continue;
          const d = await page.evaluate(EXTRACT) as { title: string; text: string; loginWall: boolean };
          if (!d.loginWall) pages.push({ url: page.url(), title: d.title, text: d.text.slice(0, 6000) });
        } catch { /* skip page */ }
      }
    }
    const { loginWall: _lw, ...rest } = data;
    return { url: u.href, finalUrl, rendered: true, ...rest, screenshot: shot, pages };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function scrape(env: ScrapeEnv, raw: string, opts: { crawl?: number; preview?: boolean }): Promise<ScrapeOut> {
  const u = parsePublicUrl(raw);
  await assertPublicDns(u.hostname);
  if (!(await allowedByRobots(u))) throw new BlockedError('robots', 'Le site interdit l’analyse automatique de cette page (robots.txt)');
  if (opts.preview || !env.BROWSER) return httpScrape(u, !!opts.preview);
  try {
    return await browserScrape(env as Required<ScrapeEnv>, u, Math.max(0, Math.min(MAX_CRAWL, opts.crawl ?? 0)));
  } catch (e) {
    if (e instanceof BlockedError) throw e;
    // Browser Rendering unavailable or over quota: fall back to the plain HTML.
    return httpScrape(u, false);
  }
}
