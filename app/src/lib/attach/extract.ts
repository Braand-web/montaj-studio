import { unzipSync, strFromU8 } from 'fflate';

// Text extraction shared by the browser (claude.ai page) and the Cloudflare server.
// Pure functions over bytes: no DOM, no Node APIs, so the same code runs in both places.

export type FileKind = 'image' | 'video' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'text' | 'code' | 'json' | 'zip' | 'svg';

const EXT: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'svg',
  mp4: 'video', mov: 'video', webm: 'video', m4v: 'video',
  pdf: 'pdf', docx: 'docx', xlsx: 'xlsx', csv: 'csv', tsv: 'csv',
  txt: 'text', md: 'text', markdown: 'text', rtf: 'text', log: 'text',
  json: 'json', zip: 'zip',
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code', mjs: 'code', cjs: 'code', py: 'code', rb: 'code', go: 'code', rs: 'code', java: 'code', kt: 'code',
  swift: 'code', c: 'code', h: 'code', cpp: 'code', hpp: 'code', cs: 'code', php: 'code', html: 'code', htm: 'code', css: 'code', scss: 'code',
  sql: 'code', sh: 'code', yml: 'code', yaml: 'code', toml: 'code', xml: 'code', vue: 'code', svelte: 'code', dart: 'code', lua: 'code', r: 'code',
};

export function kindOf(name: string, mime = ''): FileKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (EXT[ext]) return EXT[ext];
  if (mime === 'image/svg+xml') return 'svg';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  return null;
}

export const MB = 1024 * 1024;
export const LIMITS = { video: 100 * MB, other: 20 * MB, perMessage: 10, textChars: 60_000 };
export const maxSize = (k: FileKind) => (k === 'video' ? LIMITS.video : LIMITS.other);

export const ACCEPT = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', '.svg',
  'video/mp4', 'video/quicktime', 'video/webm', '.mov',
  'application/pdf', '.docx', '.xlsx', '.csv', '.txt', '.md', '.json', '.zip',
  ...Object.keys(EXT).filter((e) => EXT[e] === 'code').map((e) => '.' + e),
].join(',');

const decodeXml = (s: string) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&');

export function utf8(bytes: Uint8Array) {
  return new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '');
}

// Word: paragraphs from word/document.xml (+ tables as tab-separated cells).
export function docxText(bytes: Uint8Array): string {
  const files = unzipSync(bytes, { filter: (f) => f.name === 'word/document.xml' });
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('Not a Word document (word/document.xml missing)');
  const body = strFromU8(xml);
  const out: string[] = [];
  for (const p of body.split(/<\/w:p>/)) {
    const cells = p.includes('</w:tc>') ? p.split(/<\/w:tc>/) : [p];
    const line = cells.map((c) => [...c.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)].map((m) => (m[1] !== undefined ? decodeXml(m[1]) : m[0] === '<w:tab/>' ? '\t' : '\n')).join('')).join('\t');
    if (line.trim()) out.push(line);
  }
  return out.join('\n');
}

// Excel: every sheet as CSV-like text (shared strings, inline strings, numbers).
export function xlsxText(bytes: Uint8Array, maxRows = 500): string {
  const files = unzipSync(bytes, { filter: (f) => f.name.startsWith('xl/') && f.name.endsWith('.xml') });
  const ss = files['xl/sharedStrings.xml'] ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((t) => decodeXml(t[1])).join('')) : [];
  const wb = files['xl/workbook.xml'] ? strFromU8(files['xl/workbook.xml']) : '';
  const names = [...wb.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => decodeXml(m[1]));
  const sheets = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  if (!sheets.length) throw new Error('Not an Excel workbook (no worksheets)');
  const colIdx = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const parts: string[] = [];
  sheets.forEach((s, i) => {
    const xml = strFromU8(files[s]);
    const rows: string[] = [];
    for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      if (rows.length >= maxRows) { rows.push('…'); break; }
      const cells: string[] = [];
      for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1], inner = c[2] ?? '';
        const ref = attrs.match(/r="([A-Z]+)\d+"/)?.[1] ?? '';
        const t = attrs.match(/t="(\w+)"/)?.[1];
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        let val = '';
        if (t === 's' && v !== undefined) val = ss[+v] ?? '';
        else if (t === 'inlineStr') val = [...inner.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1])).join('');
        else if (v !== undefined) val = decodeXml(v);
        const idx = ref ? colIdx(ref) : cells.length;
        while (cells.length < idx) cells.push('');
        cells[idx] = /[",;\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
      }
      if (cells.some((x) => x)) rows.push(cells.join(';'));
    }
    parts.push(`## ${names[i] ?? `Feuille ${i + 1}`}\n${rows.join('\n')}`);
  });
  return parts.join('\n\n');
}

export interface ZipEntry { path: string; size: number }
const TEXTY = new Set(['text', 'code', 'json', 'csv', 'svg']);

// ZIP: tree listing + contents of small text files (to understand a project or an asset pack).
export function zipSummary(bytes: Uint8Array, budget = 40_000): { tree: ZipEntry[]; text: string } {
  const entries = unzipSync(bytes);
  const tree = Object.keys(entries).filter((p) => !p.endsWith('/') && !/(^|\/)(__MACOSX|\.git|node_modules)\//.test(p)).map((p) => ({ path: p, size: entries[p].length })).sort((a, b) => a.path.localeCompare(b.path));
  let used = 0;
  const parts: string[] = [];
  for (const e of tree) {
    const k = kindOf(e.path);
    if (!k || !TEXTY.has(k) || e.size > 60_000) continue;
    const t = utf8(entries[e.path]);
    if (used + t.length > budget) { parts.push(`--- ${e.path} (non inclus : budget atteint)`); continue; }
    used += t.length;
    parts.push(`--- ${e.path}\n${t}`);
  }
  const listing = tree.slice(0, 400).map((e) => `${e.path} (${fmtSize(e.size)})`).join('\n') + (tree.length > 400 ? `\n… ${tree.length - 400} autres fichiers` : '');
  return { tree, text: `Arborescence (${tree.length} fichiers) :\n${listing}\n\n${parts.join('\n\n')}` };
}

// PDF text with unpdf (serverless pdf.js build: works in the browser and in Workers).
export async function pdfText(bytes: Uint8Array): Promise<{ pages: number; text: string; perPage: string[] }> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const { totalPages, text } = await extractText(doc, { mergePages: false });
  return { pages: totalPages, perPage: text, text: text.map((t, i) => `--- Page ${i + 1}\n${t.trim()}`).join('\n\n') };
}

// A PDF whose pages carry almost no text is a scan: it needs OCR (vision) instead.
export const looksScanned = (perPage: string[]) => perPage.length > 0 && perPage.filter((t) => t.replace(/\s/g, '').length < 5).length / perPage.length >= 0.6;

export function fmtSize(n: number) {
  return n >= MB ? `${(n / MB).toFixed(1).replace('.', ',')} Mo` : n >= 1024 ? `${Math.round(n / 1024)} Ko` : `${n} o`;
}

export function clip(text: string, max = LIMITS.textChars) {
  return text.length > max ? text.slice(0, max) + `\n…(tronqué : ${text.length - max} caractères de plus)` : text;
}

// Extracts text from any non-media file kind. Images and videos are handled by the caller.
export async function extractText(kind: FileKind, bytes: Uint8Array): Promise<{ text: string; pages?: number; scanned?: boolean; perPage?: string[] }> {
  switch (kind) {
    case 'docx': return { text: docxText(bytes) };
    case 'xlsx': return { text: xlsxText(bytes) };
    case 'zip': return { text: zipSummary(bytes).text };
    case 'pdf': { const r = await pdfText(bytes); return { text: r.text, pages: r.pages, perPage: r.perPage, scanned: looksScanned(r.perPage) }; }
    case 'json': { const t = utf8(bytes); try { return { text: JSON.stringify(JSON.parse(t), null, 1) }; } catch { return { text: t }; } }
    default: return { text: utf8(bytes) };
  }
}
