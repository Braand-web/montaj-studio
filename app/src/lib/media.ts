import { all, del, get, put } from './db';
import type { MediaItem } from '../model/types';
import { sha256, uid } from './util';

// Media pipeline (SPEC §3.7): files stay on the device, deduplicated by SHA-256.

const urls = new Map<string, string>();
const metas = new Map<string, MediaItem>();
export const mediaMetaSync = (id?: string) => (id ? metas.get(id) : undefined);
const listeners = new Set<() => void>();
export const onMediaChange = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => f());

export async function listMedia(): Promise<MediaItem[]> {
  const items = await all<MediaItem>('media');
  items.forEach((m) => metas.set(m.id, m));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export const getMedia = (id: string) => get<MediaItem>('media', id);

export async function mediaUrl(id: string): Promise<string | null> {
  const hit = urls.get(id);
  if (hit) return hit;
  const blob = await get<Blob>('blobs', id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}
export const mediaUrlSync = (id: string | undefined) => (id ? urls.get(id) ?? null : null);
export const mediaBlob = (id: string) => get<Blob>('blobs', id);

function kindOf(f: File): MediaItem['kind'] | null {
  if (f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) return 'video';
  if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.name)) return 'image';
  if (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(f.name)) return 'audio';
  return null;
}

function probe(url: string, kind: MediaItem['kind']): Promise<{ w?: number; h?: number; duration?: number; thumb?: string }> {
  return new Promise((resolve) => {
    const done = (v: { w?: number; h?: number; duration?: number; thumb?: string }) => resolve(v);
    const timer = setTimeout(() => done({}), 15000);
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => { clearTimeout(timer); done({ w: img.naturalWidth, h: img.naturalHeight, thumb: thumbFrom(img, img.naturalWidth, img.naturalHeight) }); };
      img.onerror = () => { clearTimeout(timer); done({}); };
      img.src = url;
      return;
    }
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'auto';
    el.muted = true;
    (el as HTMLVideoElement).playsInline = true;
    el.onloadedmetadata = () => {
      const duration = isFinite(el.duration) ? el.duration : undefined;
      if (kind === 'audio') { clearTimeout(timer); done({ duration }); return; }
      const v = el as HTMLVideoElement;
      v.currentTime = Math.min(1, (duration ?? 2) / 3);
      v.onseeked = () => {
        clearTimeout(timer);
        done({ w: v.videoWidth, h: v.videoHeight, duration, thumb: thumbFrom(v, v.videoWidth, v.videoHeight) });
      };
    };
    el.onerror = () => { clearTimeout(timer); done({}); };
    el.src = url;
  });
}

function thumbFrom(src: CanvasImageSource, w: number, h: number): string | undefined {
  try {
    const s = 240 / Math.max(w, h, 1);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  }
}

export async function importBlob(blob: Blob, name: string, source: MediaItem['source'] = 'import', kindHint?: MediaItem['kind']): Promise<MediaItem | null> {
  const kind = kindHint ?? kindOf(new File([blob], name, { type: blob.type }));
  if (!kind) return null;
  const hash = await sha256(blob);
  const existing = (await all<MediaItem>('media')).find((m) => m.hash === hash);
  if (existing) return existing;
  const id = uid('m');
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  const meta = await probe(url, kind);
  const item: MediaItem = {
    id, name, kind, mime: blob.type || '', size: blob.size, hash, createdAt: Date.now(), source,
    w: meta.w, h: meta.h, duration: meta.duration, thumb: meta.thumb,
  };
  await put('blobs', id, blob);
  await put('media', id, item);
  metas.set(id, item);
  emit();
  return item;
}

export async function importFiles(files: FileList | File[]): Promise<{ ok: MediaItem[]; rejected: string[] }> {
  const ok: MediaItem[] = [];
  const rejected: string[] = [];
  for (const f of Array.from(files)) {
    const m = await importBlob(f, f.name);
    if (m) ok.push(m); else rejected.push(f.name);
  }
  return { ok, rejected };
}

export async function updateMedia(item: MediaItem) {
  await put('media', item.id, item);
  emit();
}

export async function deleteMedia(id: string) {
  await del('media', id);
  await del('blobs', id);
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
  emit();
}

// Resolve every media URL a document needs before rendering it.
export async function preload(ids: (string | undefined)[]) {
  await Promise.all([...new Set(ids.filter(Boolean) as string[])].map((id) => mediaUrl(id)));
}

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
