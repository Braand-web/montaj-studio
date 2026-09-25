import { useEffect, useState } from 'react';
import { mediaBlob } from '../lib/media';

// Audio peaks for the timeline, decoded once per media file (100 buckets per second of source).
export const PEAKS_PER_SEC = 100;
const cache = new Map<string, Float32Array | null>();
const pending = new Map<string, Promise<Float32Array | null>>();

async function decode(id: string): Promise<Float32Array | null> {
  try {
    const blob = await mediaBlob(id);
    if (!blob || blob.size > 400 * 1024 * 1024) return null;
    const AC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const ctx = new AC(1, 1, 44100);
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const n = Math.max(1, Math.ceil(buf.duration * PEAKS_PER_SEC));
    const step = buf.sampleRate / PEAKS_PER_SEC;
    const out = new Float32Array(n);
    const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    let max = 0;
    for (let i = 0; i < n; i++) {
      let m = 0;
      const a = Math.floor(i * step), b = Math.min(buf.length, Math.floor((i + 1) * step));
      for (const ch of chans) for (let j = a; j < b; j += 4) { const v = Math.abs(ch[j]); if (v > m) m = v; }
      out[i] = m; if (m > max) max = m;
    }
    if (max > 0) for (let i = 0; i < n; i++) out[i] /= max;
    return out;
  } catch {
    return null; // no audio track, or a codec the browser cannot decode
  }
}

export function usePeaks(id: string | undefined): Float32Array | null {
  const [peaks, setPeaks] = useState<Float32Array | null>(() => (id ? cache.get(id) ?? null : null));
  useEffect(() => {
    if (!id) return;
    if (cache.has(id)) { setPeaks(cache.get(id)!); return; }
    let alive = true;
    let p = pending.get(id);
    if (!p) { p = decode(id).then((r) => { cache.set(id, r); pending.delete(id); return r; }); pending.set(id, p); }
    void p.then((r) => { if (alive) setPeaks(r); });
    return () => { alive = false; };
  }, [id]);
  return peaks;
}

// SVG path of mirrored bars for the visible part of a clip.
export function wavePath(peaks: Float32Array, inSec: number, durSec: number, speed: number, widthPx: number, heightPx: number): string {
  const bars = Math.max(1, Math.floor(widthPx / 3));
  const mid = heightPx / 2;
  let d = '';
  for (let i = 0; i < bars; i++) {
    const t0 = inSec + ((i / bars) * durSec) * speed, t1 = inSec + (((i + 1) / bars) * durSec) * speed;
    const a = Math.floor(t0 * PEAKS_PER_SEC), b = Math.max(a + 1, Math.floor(t1 * PEAKS_PER_SEC));
    let m = 0;
    for (let j = a; j < b && j < peaks.length; j++) if (peaks[j] > m) m = peaks[j];
    const hh = Math.max(0.5, m * (mid - 1));
    d += `M${i * 3 + 1} ${(mid - hh).toFixed(1)}v${(hh * 2).toFixed(1)}`;
  }
  return d;
}
