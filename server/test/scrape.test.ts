import { describe, expect, it, vi } from 'vitest';
vi.mock('@cloudflare/puppeteer', () => ({ default: {} }));
import { parseHtml } from '../src/scrape';

const HTML = `<!doctype html><html><head><title>Atelier Nomade — Céramique</title>
<meta name="description" content="Bols et tasses faits main à Dakar">
<meta property="og:image" content="/og.jpg"><meta property="og:site_name" content="Atelier Nomade">
<link rel="icon" href="/fav.png">
<style>body{font-family:"Playfair Display",serif;background:#F4EDE4;color:#2B2118}.btn{background:#C8553D;color:#fff}h1{color:#2B2118}</style>
<script>var secret = "ne pas lire";</script></head>
<body><header><h1>Céramique faite main</h1></header><main><h2>Nos bols</h2><p>Chaque pièce est unique &amp; tournée à la main.</p>
<img src="/img/bol.jpg"><a href="/boutique">Boutique</a><a href="https://instagram.com/x">Insta</a></main></body></html>`;

describe('HTML page analysis (no JavaScript)', () => {
  it('extracts metadata, structure, text, colors and fonts', async () => {
    const r = await parseHtml(HTML, new URL('https://atelier.example/'));
    expect(r.title).toBe('Atelier Nomade — Céramique');
    expect(r.description).toContain('faits main');
    expect(r.image).toBe('https://atelier.example/og.jpg');
    expect(r.favicon).toBe('https://atelier.example/fav.png');
    expect(r.siteName).toBe('Atelier Nomade');
    expect(r.headings).toEqual(['H1 Céramique faite main', 'H2 Nos bols']);
    expect(r.text).toContain('Chaque pièce est unique & tournée à la main.');
    expect(r.text).not.toContain('ne pas lire');
    expect(r.colors.slice(0, 2)).toEqual(['#2B2118', '#F4EDE4']);
    expect(r.fonts[0]).toBe('Playfair Display');
    expect(r.images).toEqual(['https://atelier.example/img/bol.jpg']);
    expect(r.links).toContain('https://atelier.example/boutique');
    expect(r.loginWall).toBe(false);
  });
  it('detects login walls', async () => {
    const r = await parseHtml('<html><body><form><input type="password"></form></body></html>', new URL('https://x.example/'));
    expect(r.loginWall).toBe(true);
  });
});
