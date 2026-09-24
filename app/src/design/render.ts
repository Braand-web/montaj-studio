import type { El, Page } from '../model/types';
import { fontCss } from '../model/fonts';
import { prims } from './prims';
import { loadImage, mediaUrl } from '../lib/media';
import { clamp, lum } from '../lib/util';

// Canvas renderer for exports and thumbnails (SPEC §3.8): same layout rules as the DOM view.

const imgCache = new Map<string, HTMLImageElement | null>();
async function img(id: string) {
  if (imgCache.has(id)) return imgCache.get(id)!;
  const url = await mediaUrl(id);
  const im = url ? await loadImage(url) : null;
  imgCache.set(id, im);
  return im;
}

export const ANIM_DUR = 0.6;

// Entrance animation state at time t (seconds since page start).
export function animState(el: El, t: number | undefined): { op: number; dy: number; sc: number } {
  if (t === undefined || !el.anim || el.anim === 'none') return { op: 1, dy: 0, sc: 1 };
  const p = clamp((t - (el.delay ?? 0)) / ANIM_DUR, 0, 1);
  const ease = 1 - Math.pow(1 - p, 3);
  switch (el.anim) {
    case 'fade': return { op: ease, dy: 0, sc: 1 };
    case 'slide': return { op: ease, dy: (1 - ease) * 0.12, sc: 1 };
    case 'zoom': return { op: ease, dy: 0, sc: 0.6 + 0.4 * ease };
    case 'pop': {
      const s = p < 0.7 ? 0.3 + (1.08 - 0.3) * (p / 0.7) : 1.08 - 0.08 * ((p - 0.7) / 0.3);
      return { op: Math.min(1, p / 0.5), dy: 0, sc: s };
    }
  }
  return { op: 1, dy: 0, sc: 1 };
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/(\s+)/);
    let line = '';
    for (const w of words) {
      const test = line + w;
      if (line.trim() && ctx.measureText(test.trimEnd()).width > maxW) {
        out.push(line.trimEnd());
        line = w.trimStart();
      } else line = test;
    }
    out.push(line.trimEnd());
  }
  return out;
}

export const textInk = (el: El) => el.color ?? '#0F1115';
export const bgBoxColor = (ink: string) => (lum(ink) > 0.4 ? 'rgba(15,17,21,.82)' : 'rgba(242,242,238,.9)');
export const outlineColor = (ink: string) => (lum(ink) > 0.4 ? '#0F1115' : '#FFFFFF');

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function drawEl(ctx: CanvasRenderingContext2D, el: El, t?: number) {
  if (el.hidden) return;
  const a = animState(el, t);
  if (a.op <= 0) return;
  ctx.save();
  ctx.globalAlpha = (el.opacity ?? 1) * a.op;
  const cx = el.x + el.w / 2, cy = el.y + el.h / 2 + a.dy * el.h;
  ctx.translate(cx, cy);
  if (el.rot) ctx.rotate((el.rot * Math.PI) / 180);
  if (a.sc !== 1) ctx.scale(a.sc, a.sc);
  ctx.translate(-el.w / 2, -el.h / 2);
  const { w, h } = el;
  switch (el.type) {
    case 'rect':
      ctx.fillStyle = el.fill ?? '#FFD23F';
      roundRect(ctx, 0, 0, w, h, el.radius ?? 0);
      ctx.fill();
      if (el.stroke && el.strokeW) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeW; ctx.stroke(); }
      break;
    case 'circle':
      ctx.fillStyle = el.fill ?? '#FFD23F';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'line':
      ctx.fillStyle = el.fill ?? '#0F1115';
      ctx.fillRect(0, h / 2 - Math.max(1, el.strokeW ?? 6) / 2, w, Math.max(1, el.strokeW ?? 6));
      break;
    case 'image': {
      const im = el.mediaId ? await img(el.mediaId) : null;
      ctx.save();
      roundRect(ctx, 0, 0, w, h, el.radius ?? 0);
      ctx.clip();
      if (im) {
        const fit = el.fit ?? 'cover';
        const s = fit === 'cover' ? Math.max(w / im.naturalWidth, h / im.naturalHeight) : Math.min(w / im.naturalWidth, h / im.naturalHeight);
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#2A2D31';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
      break;
    }
    case 'text': {
      const size = el.size ?? 48;
      const lh = (el.lh ?? 1.1) * size;
      const ink = textInk(el);
      ctx.font = `${el.weight ?? 700} ${size}px ${fontCss(el.font)}`;
      try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${-0.01 * size}px`; } catch { /* older engines */ }
      const raw = el.upper ? (el.text ?? '').toUpperCase() : el.text ?? '';
      const lines = wrapText(ctx, raw, w);
      if (el.fx?.bg) {
        ctx.fillStyle = bgBoxColor(ink);
        roundRect(ctx, -size * 0.2, -size * 0.1, w + size * 0.4, Math.max(h, lines.length * lh) + size * 0.2, size * 0.18);
        ctx.fill();
      }
      ctx.textBaseline = 'middle';
      const align = el.align ?? 'left';
      ctx.textAlign = align;
      const x = align === 'left' ? 0 : align === 'center' ? w / 2 : w;
      if (el.fx?.shadow) { ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * 0.16; ctx.shadowOffsetY = size * 0.04; }
      lines.forEach((ln, i) => {
        const y = lh * (i + 0.5);
        if (el.fx?.outline) {
          ctx.lineJoin = 'round';
          ctx.strokeStyle = outlineColor(ink);
          ctx.lineWidth = size * 0.12;
          ctx.strokeText(ln, x, y);
        }
        ctx.fillStyle = ink;
        ctx.fillText(ln, x, y);
      });
      break;
    }
    case 'chart':
    case 'table':
    case 'qr':
      for (const p of prims(el)) {
        if (p.t === 'rect') {
          if (p.fill !== 'transparent') { ctx.fillStyle = p.fill; roundRect(ctx, p.x, p.y, p.w, p.h, p.r ?? 0); ctx.fill(); }
          if (p.stroke) { ctx.strokeStyle = p.stroke; ctx.lineWidth = Math.max(1, w / 400); ctx.strokeRect(p.x, p.y, p.w, p.h); }
        } else {
          ctx.font = `${p.weight} ${p.size}px ${fontCss('sans')}`;
          ctx.fillStyle = p.color;
          ctx.textAlign = p.align === 'middle' ? 'center' : p.align === 'end' ? 'right' : 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(p.text, p.x, p.y);
        }
      }
      break;
  }
  ctx.restore();
}

export async function renderPage(page: Page, width: number, opts: { t?: number; transparent?: boolean; canvas?: HTMLCanvasElement } = {}): Promise<HTMLCanvasElement> {
  try { await document.fonts?.ready; } catch { /* fonts API missing */ }
  const s = width / page.w;
  const c = opts.canvas ?? document.createElement('canvas');
  c.width = Math.round(page.w * s);
  c.height = Math.round(page.h * s);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.scale(s, s);
  if (!opts.transparent) {
    ctx.fillStyle = page.bg;
    ctx.fillRect(0, 0, page.w, page.h);
  }
  for (const el of page.els) await drawEl(ctx, el, opts.t);
  return c;
}

export function canvasBlob(c: HTMLCanvasElement, type = 'image/png', q = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, q));
}

export async function pageThumb(page: Page): Promise<string | undefined> {
  try {
    const c = await renderPage(page, 320);
    return c.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  }
}

export function pageAnimDuration(page: Page) {
  const last = Math.max(0, ...page.els.filter((e) => e.anim && e.anim !== 'none').map((e) => (e.delay ?? 0) + ANIM_DUR));
  return Math.max(page.dur ?? 0, last + 1.5, 3);
}
