import type { DocKind } from './types';

export interface Format {
  id: string;
  fr: string;
  en: string;
  w: number;
  h: number;
  dims: string; // label as shown to the user
  kind: DocKind;
  cat: 'social' | 'video' | 'print' | 'office';
}

// Print formats are laid out at 300 DPI so exports are print-ready.
const mm = (v: number) => Math.round((v / 25.4) * 300);

export const FORMATS: Format[] = [
  { id: 'ig-square', fr: 'Post Instagram carré', en: 'Instagram square post', w: 1080, h: 1080, dims: '1080×1080', kind: 'design', cat: 'social' },
  { id: 'ig-45', fr: 'Post Instagram 4:5', en: 'Instagram post 4:5', w: 1080, h: 1350, dims: '1080×1350', kind: 'design', cat: 'social' },
  { id: 'story', fr: 'Story', en: 'Story', w: 1080, h: 1920, dims: '1080×1920', kind: 'design', cat: 'social' },
  { id: 'yt-thumb', fr: 'Miniature YouTube', en: 'YouTube thumbnail', w: 1280, h: 720, dims: '1280×720', kind: 'design', cat: 'social' },
  { id: 'yt-banner', fr: 'Bannière YouTube', en: 'YouTube banner', w: 2560, h: 1440, dims: '2560×1440', kind: 'design', cat: 'social' },
  { id: 'linkedin', fr: 'Post LinkedIn', en: 'LinkedIn post', w: 1200, h: 1200, dims: '1200×1200', kind: 'design', cat: 'social' },
  { id: 'v-youtube', fr: 'YouTube 16:9', en: 'YouTube 16:9', w: 1920, h: 1080, dims: '1920×1080', kind: 'video', cat: 'video' },
  { id: 'v-shorts', fr: 'Shorts', en: 'Shorts', w: 1080, h: 1920, dims: '1080×1920', kind: 'video', cat: 'video' },
  { id: 'v-reels', fr: 'Reels', en: 'Reels', w: 1080, h: 1920, dims: '1080×1920', kind: 'video', cat: 'video' },
  { id: 'v-tiktok', fr: 'TikTok', en: 'TikTok', w: 1080, h: 1920, dims: '1080×1920', kind: 'video', cat: 'video' },
  { id: 'v-square', fr: 'Vidéo carrée', en: 'Square video', w: 1080, h: 1080, dims: '1080×1080', kind: 'video', cat: 'video' },
  { id: 'a5', fr: 'Flyer A5', en: 'A5 flyer', w: mm(148), h: mm(210), dims: '148×210 mm', kind: 'design', cat: 'print' },
  { id: 'a3', fr: 'Affiche A3', en: 'A3 poster', w: mm(297), h: mm(420), dims: '297×420 mm', kind: 'design', cat: 'print' },
  { id: 'card', fr: 'Carte de visite', en: 'Business card', w: mm(85), h: mm(55), dims: '85×55 mm', kind: 'design', cat: 'print' },
  { id: 'slides', fr: 'Présentation 16:9', en: 'Presentation 16:9', w: 1920, h: 1080, dims: '1920×1080', kind: 'design', cat: 'office' },
  { id: 'a4', fr: 'Document A4', en: 'A4 document', w: mm(210), h: mm(297), dims: '210×297 mm', kind: 'design', cat: 'office' },
];

export const CATS: { id: Format['cat']; fr: string; en: string }[] = [
  { id: 'social', fr: 'Réseaux sociaux', en: 'Social media' },
  { id: 'video', fr: 'Vidéo', en: 'Video' },
  { id: 'print', fr: 'Impression', en: 'Print' },
  { id: 'office', fr: 'Bureau', en: 'Office' },
];

export const fmt = (id: string) => FORMATS.find((f) => f.id === id)!;

export function dimsLabel(w: number, h: number) {
  const f = FORMATS.find((x) => x.w === w && x.h === h);
  return f ? f.dims : `${w}×${h}`;
}

export function ratioLabel(w: number, h: number) {
  const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
  const d = g(w, h);
  const a = w / d, b = h / d;
  return a <= 32 && b <= 32 ? `${a}:${b}` : (w / h).toFixed(2);
}
