import { describe, expect, it } from 'vitest';
import { parseSubtitles, toSrt, toVtt, textToCaptions } from '../video/captions';
import { parseCsv, contrast, normHex } from '../lib/util';
import { qrMatrix, prims } from '../design/prims';
import { resizePage } from '../design/store';
import type { Page } from '../model/types';

describe('captions', () => {
  it('round-trips SRT', () => {
    const src = '1\n00:00:01,000 --> 00:00:02,500\nBonjour à tous\n\n2\n00:00:03,000 --> 00:00:04,000\nDeuxième ligne\n';
    const caps = parseSubtitles(src);
    expect(caps).toHaveLength(2);
    expect(caps[0].start).toBe(1);
    expect(caps[0].end).toBe(2.5);
    expect(parseSubtitles(toSrt(caps)).map((c) => c.text)).toEqual(['Bonjour à tous', 'Deuxième ligne']);
  });
  it('reads WebVTT with cue settings and tags', () => {
    const caps = parseSubtitles('WEBVTT\n\n00:01.000 --> 00:02.000 align:center\n<b>Salut</b>\n');
    expect(caps[0]).toMatchObject({ start: 1, end: 2, text: 'Salut' });
    expect(toVtt(caps).startsWith('WEBVTT')).toBe(true);
  });
  it('times free text from a start point', () => {
    const caps = textToCaptions('un deux trois quatre cinq six sept huit', 10);
    expect(caps).toHaveLength(2);
    expect(caps[0].start).toBe(10);
    expect(caps[1].start).toBeCloseTo(caps[0].end);
  });
});

describe('csv', () => {
  it('detects the separator and handles quotes', () => {
    expect(parseCsv('a;b\n1;"x;y"')).toEqual([['a', 'b'], ['1', 'x;y']]);
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('colors', () => {
  it('normalizes hex and computes WCAG contrast', () => {
    expect(normHex('#fff')).toBe('#FFFFFF');
    expect(normHex('red')).toBeNull();
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
});

describe('design', () => {
  it('encodes a real QR matrix', () => {
    const m = qrMatrix('https://exemple.com');
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect(m[0][0]).toBe(true); // finder pattern corner
    expect(prims({ id: 'q', type: 'qr', name: 'qr', x: 0, y: 0, w: 100, h: 100, qr: 'x' }).length).toBeGreaterThan(5);
  });
  it('resizes a page keeping full-bleed backgrounds and a minimum text size', () => {
    const p: Page = { id: 'p', w: 1280, h: 720, bg: '#000', els: [
      { id: 'bg', type: 'image', name: 'bg', x: 0, y: 0, w: 1280, h: 720 },
      { id: 't', type: 'text', name: 't', x: 100, y: 100, w: 400, h: 50, size: 20 },
    ] };
    const r = resizePage(p, 1080, 1920);
    expect(r.els[0]).toMatchObject({ x: 0, y: 0, w: 1080, h: 1920 });
    expect(r.els[1].size).toBeGreaterThanOrEqual(Math.round(1080 * 0.028));
    expect(r.els[1].x).toBeGreaterThanOrEqual(0);
  });
});
