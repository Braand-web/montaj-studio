import qrcode from 'qrcode-generator';
import type { El } from '../model/types';
import { contrast } from '../lib/util';

// Charts, tables and QR codes are described as simple primitives in element-local pixels,
// then drawn the same way on screen (SVG) and on export (canvas).

export type Prim =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string; r?: number; stroke?: string }
  | { t: 'text'; x: number; y: number; text: string; size: number; color: string; weight: number; align: 'start' | 'middle' | 'end' };

const qrCache = new Map<string, boolean[][]>();
export function qrMatrix(content: string): boolean[][] {
  const hit = qrCache.get(content);
  if (hit) return hit;
  let m: boolean[][] = [];
  try {
    const q = qrcode(0, 'M');
    q.addData(content || ' ', 'Byte');
    q.make();
    const n = q.getModuleCount();
    m = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
  } catch {
    m = [[false]];
  }
  qrCache.set(content, m);
  return m;
}

export function prims(el: El): Prim[] {
  const { w, h } = el;
  const out: Prim[] = [];
  if (el.type === 'chart') {
    const data = (el.data ?? []).filter((r) => r[0] !== '');
    const n = Math.max(1, data.length);
    const mx = Math.max(1e-6, ...data.map((r) => Math.abs(r[1]) || 0));
    const fill = el.fill ?? '#2E6BFF';
    const ink = el.color ?? '#0F1115';
    if ((el.kind ?? 'col') === 'col') {
      const fs = Math.max(8, Math.min(h / 12, (w / n) / 4.2));
      const base = h - fs * 1.8;
      const slot = w / n;
      data.forEach(([label, v], i) => {
        const bh = Math.max(0, (Math.abs(v) / mx) * (base - fs * 1.6));
        const bw = slot * 0.62;
        const x = i * slot + (slot - bw) / 2;
        out.push({ t: 'rect', x, y: base - bh, w: bw, h: bh, fill, r: Math.min(8, bw / 6) });
        out.push({ t: 'text', x: x + bw / 2, y: base - bh - fs * 0.45, text: fmtNum(v), size: fs, color: ink, weight: 700, align: 'middle' });
        out.push({ t: 'text', x: x + bw / 2, y: h - fs * 0.35, text: label, size: fs, color: ink, weight: 500, align: 'middle' });
      });
      out.push({ t: 'rect', x: 0, y: base, w, h: Math.max(1, fs / 10), fill: ink });
    } else {
      const fs = Math.max(8, Math.min(w / 18, (h / n) / 2.4));
      const labelW = Math.min(w * 0.3, fs * 6);
      const slot = h / n;
      data.forEach(([label, v], i) => {
        const bh = slot * 0.6;
        const y = i * slot + (slot - bh) / 2;
        const bw = Math.max(0, (Math.abs(v) / mx) * (w - labelW - fs * 3.2));
        out.push({ t: 'text', x: labelW - fs * 0.4, y: y + bh / 2 + fs * 0.35, text: label, size: fs, color: ink, weight: 500, align: 'end' });
        out.push({ t: 'rect', x: labelW, y, w: bw, h: bh, fill, r: Math.min(8, bh / 6) });
        out.push({ t: 'text', x: labelW + bw + fs * 0.4, y: y + bh / 2 + fs * 0.35, text: fmtNum(v), size: fs, color: ink, weight: 700, align: 'start' });
      });
    }
  } else if (el.type === 'table') {
    const rows = el.rows ?? [];
    const nr = Math.max(1, rows.length);
    const nc = Math.max(1, ...rows.map((r) => r.length));
    const rh = h / nr, cw = w / nc;
    const head = el.fill ?? '#FFD23F';
    const headInk = contrast(head, '#0F1115') >= 4.5 ? '#0F1115' : '#F2F2EE';
    const ink = el.color ?? '#0F1115';
    const fs = Math.max(8, Math.min(rh * 0.38, cw / 7));
    out.push({ t: 'rect', x: 0, y: 0, w, h, fill: 'transparent', stroke: ink });
    rows.forEach((row, r) => {
      if (r === 0) out.push({ t: 'rect', x: 0, y: 0, w, h: rh, fill: head });
      for (let c = 0; c < nc; c++) {
        out.push({ t: 'text', x: c * cw + fs * 0.6, y: r * rh + rh / 2 + fs * 0.35, text: row[c] ?? '', size: fs, color: r === 0 ? headInk : ink, weight: r === 0 ? 700 : 400, align: 'start' });
      }
      if (r > 0) out.push({ t: 'rect', x: 0, y: r * rh, w, h: Math.max(1, fs / 14), fill: ink });
    });
    for (let c = 1; c < nc; c++) out.push({ t: 'rect', x: c * cw, y: 0, w: Math.max(1, fs / 14), h, fill: ink });
  } else if (el.type === 'qr') {
    const m = qrMatrix(el.qr ?? '');
    const n = m.length + 8; // 4-module quiet zone on each side
    const s = Math.min(w, h) / n;
    const ox = (w - s * n) / 2, oy = (h - s * n) / 2;
    out.push({ t: 'rect', x: 0, y: 0, w, h, fill: '#FFFFFF' });
    const ink = el.fill ?? '#0F1115';
    m.forEach((row, r) => {
      let c = 0;
      while (c < row.length) {
        if (!row[c]) { c++; continue; }
        let e = c;
        while (e < row.length && row[e]) e++;
        out.push({ t: 'rect', x: ox + (c + 4) * s, y: oy + (r + 4) * s, w: (e - c) * s + 0.2, h: s + 0.2, fill: ink });
        c = e;
      }
    });
  }
  return out;
}

function fmtNum(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}
