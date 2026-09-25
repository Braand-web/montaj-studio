import { backend, scrapeRemote, type ScrapeResult } from './backend';

// Links pasted in a Studio Chat message: detected, previewed, then analyzed on the server.

export interface LinkInfo {
  url: string;
  host: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  title?: string; description?: string; favicon?: string; image?: string;
  error?: string;
  result?: ScrapeResult;
  shot?: Blob; // screenshot for the model (vision)
}

const URL_RE = /\bhttps?:\/\/[^\s<>"'«»)\]]+[^\s<>"'«».,;:!?)\]]/gi;
export function detectUrls(text: string, max = 3): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    try { const u = new URL(m[0]); if (!out.includes(u.href)) out.push(u.href); } catch { /* not a URL */ }
    if (out.length >= max) break;
  }
  return out;
}

export const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

// "Explore the site" style requests crawl a few internal pages (server-side, capped).
export const wantsCrawl = (text: string) => /\b(tout le site|plusieurs pages|pages internes|explore|parcours|crawl|whole site|all pages|other pages|autres pages)\b/i.test(text);

export async function previewLink(url: string, signal?: AbortSignal): Promise<Partial<LinkInfo>> {
  const be = await backend();
  if (!be.scrape) return { status: 'error', error: 'unavailable' };
  try {
    const r = await scrapeRemote(url, { preview: true }, signal);
    return { title: r.title, description: r.description, favicon: r.favicon, image: r.image };
  } catch { return {}; }
}

export async function analyzeLink(url: string, crawl: number, signal?: AbortSignal): Promise<LinkInfo> {
  const host = hostOf(url);
  const be = await backend();
  if (!be.scrape) return { url, host, status: 'error', error: 'unavailable' };
  try {
    const r = await scrapeRemote(url, { crawl }, signal);
    let shot: Blob | undefined;
    if (r.screenshot) {
      const bin = atob(r.screenshot);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      shot = new Blob([bytes], { type: 'image/jpeg' });
    }
    return { url, host, status: 'ready', title: r.title, description: r.description, favicon: r.favicon, image: r.image, result: { ...r, screenshot: undefined }, shot };
  } catch (e) {
    return { url, host, status: 'error', error: (e as Error).message };
  }
}

// What the model reads about an analyzed link.
export function linkContext(l: LinkInfo, i: number): string {
  if (l.status !== 'ready' || !l.result) {
    const why = l.error === 'unavailable'
      ? 'the page could not be fetched: this view has no network access to websites (link analysis runs on the Montaj server when the app is hosted on Cloudflare)'
      : `the analysis failed: ${l.error ?? 'unknown error'}`;
    return `[Link ${i}: ${l.url} — ${why}. Tell the user clearly, and offer to paste the page's text or send a screenshot instead. Do not invent the page's content.]`;
  }
  const r = l.result;
  const parts = [
    `[Link ${i}: ${r.finalUrl}${r.rendered ? ' (rendered in a headless browser)' : ''}]`,
    `Title: ${r.title}${r.siteName ? ` · Site: ${r.siteName}` : ''}`,
    r.description ? `Description: ${r.description}` : '',
    r.headings.length ? `Structure (headings): ${r.headings.slice(0, 30).join(' | ')}` : '',
    r.colors.length ? `Main colors: ${r.colors.slice(0, 10).join(', ')}` : '',
    r.fonts.length ? `Fonts: ${r.fonts.slice(0, 6).join(', ')}` : '',
    r.images.length ? `Images on the page: ${r.images.slice(0, 8).join(' , ')}` : '',
    `Text:\n${r.text.slice(0, 12000)}`,
    ...(r.pages ?? []).map((p) => `--- Internal page ${p.url} — ${p.title}\n${p.text.slice(0, 4000)}`),
    l.shot ? '(A screenshot of the page is attached as an image.)' : '',
  ];
  return parts.filter(Boolean).join('\n');
}
