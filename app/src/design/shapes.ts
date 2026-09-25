import type { Grad, ImgAdjust, ImgMask, Shadow, ShapeKind } from '../model/types';

// Vector shapes as SVG path data in the element's own box, shared by the DOM view (<path d>)
// and the canvas renderer (Path2D), so the canvas and exports always match.

const f = (n: number) => Math.round(n * 100) / 100;

function poly(pts: [number, number][]) {
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
}

export function shapePath(kind: ShapeKind, w: number, h: number): string {
  switch (kind) {
    case 'triangle': return poly([[w / 2, 0], [w, h], [0, h]]);
    case 'diamond': return poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case 'hexagon': return poly([[w * 0.25, 0], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [w * 0.25, h], [0, h / 2]]);
    case 'star':
    case 'burst': {
      const n = kind === 'star' ? 5 : 12, inner = kind === 'star' ? 0.42 : 0.72;
      const pts: [number, number][] = [];
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 ? inner : 1;
        const a = -Math.PI / 2 + (i * Math.PI) / n;
        pts.push([w / 2 + (Math.cos(a) * r * w) / 2, h / 2 + (Math.sin(a) * r * h) / 2]);
      }
      return poly(pts);
    }
    case 'arrow': return poly([[0, h * 0.3], [w * 0.62, h * 0.3], [w * 0.62, 0], [w, h / 2], [w * 0.62, h], [w * 0.62, h * 0.7], [0, h * 0.7]]);
    case 'heart':
      return `M${f(w / 2)} ${f(h)} C${f(w * 0.15)} ${f(h * 0.72)} 0 ${f(h * 0.48)} 0 ${f(h * 0.28)} C0 ${f(h * 0.1)} ${f(w * 0.14)} 0 ${f(w * 0.28)} 0 C${f(w * 0.38)} 0 ${f(w * 0.46)} ${f(h * 0.06)} ${f(w / 2)} ${f(h * 0.16)} C${f(w * 0.54)} ${f(h * 0.06)} ${f(w * 0.62)} 0 ${f(w * 0.72)} 0 C${f(w * 0.86)} 0 ${f(w)} ${f(h * 0.1)} ${f(w)} ${f(h * 0.28)} C${f(w)} ${f(h * 0.48)} ${f(w * 0.85)} ${f(h * 0.72)} ${f(w / 2)} ${f(h)} Z`;
    case 'bubble': {
      const r = Math.min(w, h) * 0.18, b = h * 0.78;
      return `M${f(r)} 0 H${f(w - r)} Q${f(w)} 0 ${f(w)} ${f(r)} V${f(b - r)} Q${f(w)} ${f(b)} ${f(w - r)} ${f(b)} H${f(w * 0.42)} L${f(w * 0.2)} ${f(h)} L${f(w * 0.26)} ${f(b)} H${f(r)} Q0 ${f(b)} 0 ${f(b - r)} V${f(r)} Q0 0 ${f(r)} 0 Z`;
    }
  }
}

export const SHAPES: { k: ShapeKind; fr: string; en: string; ratio: number }[] = [
  { k: 'triangle', fr: 'Triangle', en: 'Triangle', ratio: 1 },
  { k: 'diamond', fr: 'Losange', en: 'Diamond', ratio: 1 },
  { k: 'hexagon', fr: 'Hexagone', en: 'Hexagon', ratio: 0.87 },
  { k: 'star', fr: 'Étoile', en: 'Star', ratio: 1 },
  { k: 'burst', fr: 'Badge', en: 'Burst', ratio: 1 },
  { k: 'arrow', fr: 'Flèche', en: 'Arrow', ratio: 0.5 },
  { k: 'heart', fr: 'Cœur', en: 'Heart', ratio: 0.9 },
  { k: 'bubble', fr: 'Bulle', en: 'Speech bubble', ratio: 0.75 },
];

// CSS / canvas filter string for image adjustments (the same syntax works for both).
// Blur is expressed in page pixels (0..100 → 0..24 px) and converted by the caller's unit.
export function adjFilter(a: ImgAdjust | undefined, blurLen: (pagePx: number) => string): string | undefined {
  if (!a) return undefined;
  const parts: string[] = [];
  if (a.bri) parts.push(`brightness(${1 + a.bri / 100})`);
  if (a.con) parts.push(`contrast(${1 + a.con / 100})`);
  if (a.sat) parts.push(`saturate(${1 + a.sat / 100})`);
  if (a.hue) parts.push(`hue-rotate(${Math.round(a.hue * 1.8)}deg)`);
  if (a.gray) parts.push(`grayscale(${a.gray / 100})`);
  if (a.blur) parts.push(`blur(${blurLen((a.blur / 100) * 24)})`);
  return parts.length ? parts.join(' ') : undefined;
}

export const lsEm = (ls: number | undefined) => (ls ?? -10) / 1000;

export const cssGrad = (g: Grad) => `linear-gradient(${g.ang}deg, ${g.a}, ${g.b})`;

// Canvas gradient matching CSS linear-gradient(angle) over a w×h box.
export function canvasGrad(ctx: CanvasRenderingContext2D, g: Grad, w: number, h: number) {
  const r = (g.ang * Math.PI) / 180;
  const dx = Math.sin(r), dy = -Math.cos(r);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const gr = ctx.createLinearGradient(w / 2 - (dx * len) / 2, h / 2 - (dy * len) / 2, w / 2 + (dx * len) / 2, h / 2 + (dy * len) / 2);
  gr.addColorStop(0, g.a);
  gr.addColorStop(1, g.b);
  return gr;
}

// Mask outline for images, in the element box.
export function maskPath(m: ImgMask, w: number, h: number): string | null {
  if (m === 'none') return null;
  if (m === 'circle') return `M0 ${h / 2} A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2} A${w / 2} ${h / 2} 0 1 0 0 ${h / 2} Z`;
  return shapePath(m, w, h);
}
export function maskCss(m: ImgMask | undefined): string | undefined {
  const d = m ? maskPath(m, 100, 100) : null;
  if (!d) return undefined;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
}

export const shadowRgba = (s: Shadow) => {
  const h = s.color.replace('#', '');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) || 0;
  return `rgba(${n(0)},${n(2)},${n(4)},${Math.max(0, Math.min(1, s.op / 100))})`;
};

// Image position inside its frame (cover fit, then zoom around the focus point).
export function cropBox(w: number, h: number, iw: number, ih: number, fit: 'cover' | 'contain', crop?: { z: number; x: number; y: number }) {
  const z = crop ? Math.max(1, crop.z) : 1;
  const s = (fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih)) * z;
  const dw = iw * s, dh = ih * s;
  const px = 0.5 + (crop?.x ?? 0) / 200, py = 0.5 + (crop?.y ?? 0) / 200;
  return { x: (w - dw) * px, y: (h - dh) * py, w: dw, h: dh, px, py, z };
}
