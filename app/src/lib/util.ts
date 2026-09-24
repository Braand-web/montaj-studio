export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

// Timecode mm:ss:ff at 30 fps, as in the prototype header.
export const tc = (s: number, fps = 30) => `${pad2(s / 60)}:${pad2(s % 60)}:${pad2((s % 1) * fps)}`;
export const mmss = (s: number) => `${Math.floor(s / 60)}:${pad2(s % 60)}`;

export function bytes(n: number, lang: 'fr' | 'en') {
  const u = lang === 'fr' ? ['o', 'Ko', 'Mo', 'Go'] : ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(1)).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US') + ' ' + u[i];
}

export function ago(t: number, lang: 'fr' | 'en') {
  const s = (Date.now() - t) / 1000;
  const fr = lang === 'fr';
  if (s < 60) return fr ? 'à l’instant' : 'just now';
  if (s < 3600) return fr ? `il y a ${Math.round(s / 60)} min` : `${Math.round(s / 60)} min ago`;
  if (s < 86400) return fr ? `il y a ${Math.round(s / 3600)} h` : `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  if (d === 1) return fr ? 'hier' : 'yesterday';
  return fr ? `il y a ${d} jours` : `${d} days ago`;
}

// WCAG relative luminance and contrast ratio (used for the contrast warning).
export function lum(hex: string) {
  const h = normHex(hex);
  if (!h) return 0.5;
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export function normHex(c: string): string | null {
  if (!c) return null;
  let h = c.trim();
  if (/^#[0-9a-f]{3}$/i.test(h)) h = '#' + h.slice(1).split('').map((x) => x + x).join('');
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toUpperCase() : null;
}

export const deepClone = <T,>(v: T): T => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const d = (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a: A) => { clearTimeout(t); fn(...a); };
  return d;
}

export async function sha256(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', buf);
    return 'sha256:' + [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'size:' + blob.size;
  }
}

export function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  return lines.map((line) => {
    const out: string[] = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

export const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'montaj';
