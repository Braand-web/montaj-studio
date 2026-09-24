import type { Caption } from '../model/types';
import { uid } from '../lib/util';

// SRT / WebVTT import and export (SPEC §6.5).

const stamp = (s: number, sep: string) => {
  const ms = Math.round(s * 1000);
  const hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}${sep}${String(r).padStart(3, '0')}`;
};

export function parseTime(t: string): number {
  const m = t.trim().replace(',', '.').split(':').map(Number);
  if (m.some((x) => Number.isNaN(x))) return NaN;
  return m.length === 3 ? m[0] * 3600 + m[1] * 60 + m[2] : m.length === 2 ? m[0] * 60 + m[1] : m[0];
}

export function parseSubtitles(text: string): Caption[] {
  const out: Caption[] = [];
  const blocks = text.replace(/\r/g, '').replace(/^﻿/, '').split(/\n{2,}/);
  for (const b of blocks) {
    const lines = b.split('\n').filter((l) => l.trim() !== '');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, z] = lines[i].split('-->');
    const start = parseTime(a);
    const end = parseTime(z.trim().split(/\s+/)[0]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const txt = lines.slice(i + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (txt) out.push({ id: uid('k'), start, end, text: txt });
  }
  return out.sort((x, y) => x.start - y.start);
}

export function toSrt(caps: Caption[]) {
  return caps.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n');
}

export function toVtt(caps: Caption[]) {
  return 'WEBVTT\n\n' + caps.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n');
}

// Split free text into timed captions of ~6 words at ~2.6 words/second from a start time.
export function textToCaptions(text: string, start: number, wps = 2.6): Caption[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out: Caption[] = [];
  let t = start;
  for (let i = 0; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6);
    const d = Math.max(1, chunk.length / wps);
    out.push({ id: uid('k'), start: Math.round(t * 100) / 100, end: Math.round((t + d) * 100) / 100, text: chunk.join(' ') });
    t += d;
  }
  return out;
}
