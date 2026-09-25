import type { Caption, CapStyle, Clip, VideoData } from '../model/types';
import { mediaUrl, mediaUrlSync, loadImage } from '../lib/media';
import { fontCss } from '../model/fonts';
import { wrapText } from '../design/render';
import { duration } from './store';
import { clamp } from '../lib/util';
import { transformAt } from './keyframes';
import { shapePath } from '../design/shapes';

// Browser compositor (SPEC §3.8): decodes the user's media with <video>/<audio> elements,
// composites every frame on a 2D canvas, and plays audio through Web Audio so the same
// graph feeds both the speakers and the exporter.

type MediaEl = HTMLVideoElement | HTMLAudioElement;
const VISUAL_ORDER = ['video', 'broll', 'text'] as const;

export class Engine {
  data: VideoData;
  private els = new Map<string, MediaEl>();
  private imgs = new Map<string, HTMLImageElement | null>();
  private actx: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private routed = new WeakSet<MediaEl>();
  private raf = 0;
  private startWall = 0;
  private startT = 0;
  t = 0;
  playing = false;
  onTime: (t: number) => void = () => {};
  onEnd: () => void = () => {};

  constructor(public canvas: HTMLCanvasElement, data: VideoData) {
    this.data = data;
    this.sync();
  }

  setData(d: VideoData) {
    this.data = d;
    this.sync();
    if (!this.playing) this.seek(this.t);
  }

  private sync() {
    const ids = new Set(this.data.clips.map((c) => c.id));
    for (const [id, el] of this.els) if (!ids.has(id)) { el.pause(); el.removeAttribute('src'); el.load(); this.els.delete(id); }
    for (const c of this.data.clips) {
      if ((c.kind === 'video' || c.kind === 'audio') && c.mediaId && !this.els.has(c.id)) {
        const el = document.createElement(c.kind === 'video' ? 'video' : 'audio');
        el.preload = 'auto';
        (el as HTMLVideoElement).playsInline = true;
        el.crossOrigin = 'anonymous';
        const url = mediaUrlSync(c.mediaId);
        if (url) el.src = url;
        else void mediaUrl(c.mediaId).then((u) => { if (u) { el.src = u; this.seek(this.t); } });
        el.addEventListener('loadeddata', () => { if (!this.playing) this.draw(); });
        this.els.set(c.id, el);
      }
      if (c.kind === 'image' && c.mediaId && !this.imgs.has(c.mediaId)) {
        this.imgs.set(c.mediaId, null);
        const id = c.mediaId;
        void mediaUrl(id).then((u) => (u ? loadImage(u) : null)).then((im) => { this.imgs.set(id, im); if (!this.playing) this.draw(); });
      }
    }
  }

  get duration() { return duration(this.data); }

  private ensureAudio() {
    if (this.actx) return;
    try {
      this.actx = new AudioContext();
      this.dest = this.actx.createMediaStreamDestination();
    } catch { this.actx = null; }
  }

  private route(el: MediaEl) {
    if (!this.actx || this.routed.has(el)) return;
    try {
      const src = this.actx.createMediaElementSource(el);
      src.connect(this.actx.destination);
      if (this.dest) src.connect(this.dest);
      this.routed.add(el);
    } catch { /* already routed */ }
  }

  active(t: number) { return this.data.clips.filter((c) => t >= c.start && t < c.start + c.dur); }

  // Bring every media element to the state it must have at time t.
  private syncMedia(t: number, playing: boolean) {
    for (const c of this.data.clips) {
      const el = this.els.get(c.id);
      if (!el) continue;
      const on = t >= c.start && t < c.start + c.dur;
      const speed = c.speed ?? 1;
      const src = c.in + (t - c.start) * speed;
      if (!on) { if (!el.paused) el.pause(); continue; }
      el.playbackRate = speed;
      const fi = c.fadeIn ?? 0, fo = c.fadeOut ?? 0;
      let g = clamp(c.volume ?? 1, 0, 1);
      if (fi > 0) g *= clamp((t - c.start) / fi, 0, 1);
      if (fo > 0) g *= clamp((c.start + c.dur - t) / fo, 0, 1);
      el.volume = c.muted ? 0 : g;
      el.muted = !!c.muted;
      if (playing) {
        this.route(el);
        if (Math.abs(el.currentTime - src) > 0.3) el.currentTime = src;
        if (el.paused) void el.play().catch(() => undefined);
      } else {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - src) > 0.02) el.currentTime = src;
      }
    }
  }

  seek(t: number) {
    this.t = clamp(t, 0, Math.max(this.duration, 0));
    if (this.playing) { this.startWall = performance.now(); this.startT = this.t; }
    this.syncMedia(this.t, this.playing);
    const waits = this.active(this.t).map((c) => this.els.get(c.id)).filter((e): e is HTMLVideoElement => e instanceof HTMLVideoElement && e.seeking);
    waits.forEach((e) => e.addEventListener('seeked', () => this.draw(), { once: true }));
    this.draw();
  }

  play() {
    if (this.playing) return;
    this.ensureAudio();
    void this.actx?.resume();
    if (this.t >= this.duration - 0.05) this.t = 0;
    this.playing = true;
    this.startWall = performance.now();
    this.startT = this.t;
    const loop = () => {
      if (!this.playing) return;
      this.t = this.startT + (performance.now() - this.startWall) / 1000;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this.pause();
        this.onEnd();
        return;
      }
      this.syncMedia(this.t, true);
      this.draw();
      this.onTime(this.t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.syncMedia(this.t, false);
    this.draw();
    this.onTime(this.t);
  }

  destroy() {
    this.pause();
    for (const el of this.els.values()) { el.pause(); el.removeAttribute('src'); el.load(); }
    this.els.clear();
    void this.actx?.close();
  }

  draw() { this.drawTo(this.canvas, this.t); }

  drawTo(canvas: HTMLCanvasElement, t: number) {
    const { w: W, h: H } = this.data;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.fillStyle = this.data.bg || '#000';
    ctx.fillRect(0, 0, W, H);
    const act = this.active(t);
    for (const tr of VISUAL_ORDER) {
      for (const c of act.filter((x) => x.track === tr)) {
        if (c.kind === 'text') this.drawText(ctx, c, t, W, H);
        else if (c.kind === 'video' || c.kind === 'image') this.drawVisual(ctx, c, t, W, H);
      }
    }
    const cap = this.data.captions.find((c) => t >= c.start && t < c.end);
    if (cap) drawCaption(ctx, cap, t, this.data.capStyle, this.data.capY, W, H);
  }

  private drawVisual(ctx: CanvasRenderingContext2D, c: Clip, t: number, W: number, H: number) {
    let src: CanvasImageSource | null = null;
    let sw = 0, sh = 0;
    if (c.kind === 'video') {
      const el = this.els.get(c.id) as HTMLVideoElement | undefined;
      if (!el || el.readyState < 2) return;
      src = el; sw = el.videoWidth; sh = el.videoHeight;
    } else {
      const im = c.mediaId ? this.imgs.get(c.mediaId) : null;
      if (!im) return;
      src = im; sw = im.naturalWidth; sh = im.naturalHeight;
    }
    if (!sw || !sh) return;
    const local = t - c.start;
    const tf = transformAt(c, local);
    let alpha = tf.opacity;
    let scale = tf.scale;
    let dx = (tf.x / 100) * W, dy = (tf.y / 100) * H;
    let blur = 0;
    let dip = 0;
    if (c.trIn && local < c.trIn.dur) {
      const p = clamp(local / c.trIn.dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      if (c.trIn.type === 'fade') alpha *= e;
      if (c.trIn.type === 'dip') dip = 1 - e;
      if (c.trIn.type === 'slide') dx += (1 - e) * W;
      if (c.trIn.type === 'zoom') { scale *= 1.25 - 0.25 * e; alpha *= e; }
      if (c.trIn.type === 'blur') blur = (1 - e) * 24;
    }
    if (c.trOut && c.dur - local < c.trOut.dur) {
      const p = clamp((c.dur - local) / c.trOut.dur, 0, 1);
      if (c.trOut.type === 'fade') alpha *= p; else dip = Math.max(dip, 1 - p);
    }
    const fit = c.fit ?? (c.track === 'broll' && c.kind === 'image' ? 'contain' : 'cover');
    const s = (fit === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh)) * scale;
    const dw = sw * s, dh = sh * s;
    if (c.bgBlur && fit === 'contain') {
      // Blurred, darkened copy filling the frame behind the clip (vertical video from landscape footage).
      const cs = Math.max(W / sw, H / sh) * 1.08;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.filter = `blur(${Math.round(Math.min(W, H) / 28)}px) brightness(.75)`;
      ctx.drawImage(src, (W - sw * cs) / 2, (H - sh * cs) / 2, sw * cs, sh * cs);
      ctx.restore();
    }
    if (c.chroma) { const k = this.keyed(src, sw, sh, c.chroma); if (k) { src = k; } }
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(W / 2 + dx, H / 2 + dy);
    if (tf.rot) ctx.rotate((tf.rot * Math.PI) / 180);
    if (c.mask && c.mask !== 'none') {
      const m = Math.min(dw, dh);
      if (c.mask === 'circle') { ctx.beginPath(); ctx.ellipse(0, 0, m / 2, m / 2, 0, 0, Math.PI * 2); ctx.clip(); }
      else if (c.mask === 'rounded') { roundRect(ctx, -dw / 2, -dh / 2, dw, dh, m * 0.12); ctx.clip(); }
      else { const p = new Path2D(); p.addPath(new Path2D(shapePath(c.mask, m, m)), new DOMMatrix().translate(-m / 2, -m / 2)); ctx.clip(p); }
    }
    if (c.blend && c.blend !== 'normal') ctx.globalCompositeOperation = c.blend;
    ctx.filter = fxFilter(c, blur);
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    const fx = c.fx;
    if (fx?.glow) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = clamp(alpha, 0, 1) * (fx.glow / 100) * 0.6;
      ctx.filter = `blur(${Math.round(W / 80)}px) brightness(1.2)`;
      ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
    if (fx?.temp) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = (Math.abs(fx.temp) / 100) * 0.55 * clamp(alpha, 0, 1);
      ctx.fillStyle = fx.temp > 0 ? '#FF9A3C' : '#3C8CFF';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (fx?.vignette) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${(fx.vignette / 100) * 0.85})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    if (dip > 0) { ctx.fillStyle = `rgba(0,0,0,${dip})`; ctx.fillRect(0, 0, W, H); }
  }

  private keyCanvas: HTMLCanvasElement | null = null;
  // Green screen: removes pixels close to the key color (soft edge), at up to 960 px wide.
  private keyed(src: CanvasImageSource, sw: number, sh: number, ck: { color: string; tol: number }): HTMLCanvasElement | null {
    try {
      const k = Math.min(1, 960 / sw);
      const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
      const cv = this.keyCanvas ?? (this.keyCanvas = document.createElement('canvas'));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const x = cv.getContext('2d', { willReadFrequently: true })!;
      x.clearRect(0, 0, w, h);
      x.drawImage(src, 0, 0, w, h);
      const img = x.getImageData(0, 0, w, h), d = img.data;
      const hex = ck.color.replace('#', '');
      const kr = parseInt(hex.slice(0, 2), 16), kg = parseInt(hex.slice(2, 4), 16), kb = parseInt(hex.slice(4, 6), 16);
      const t0 = 30 + ck.tol * 1.6, t1 = t0 + 40;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.hypot(d[i] - kr, d[i + 1] - kg, d[i + 2] - kb);
        if (dist < t0) d[i + 3] = 0;
        else if (dist < t1) {
          d[i + 3] = Math.round(d[i + 3] * ((dist - t0) / (t1 - t0)));
          // Spill suppression: pull the dominant key channel down on the edge.
          if (kg >= kr && kg >= kb) d[i + 1] = Math.min(d[i + 1], (d[i] + d[i + 2]) / 2 + 10);
          else if (kb >= kr) d[i + 2] = Math.min(d[i + 2], (d[i] + d[i + 1]) / 2 + 10);
        }
      }
      x.putImageData(img, 0, 0);
      return cv;
    } catch { return null; }
  }

  private drawText(ctx: CanvasRenderingContext2D, c: Clip, t: number, W: number, H: number) {
    const st = c.style ?? { size: 72, color: '#FFFFFF', weight: 800, font: 'sans', y: 50 };
    const k = Math.min(W, H) / 1080;
    const size = st.size * k;
    const local = t - c.start;
    let alpha = 1, dy = 0, sc = 1;
    const a = st.anim ?? 'fade';
    const inP = clamp(local / 0.4, 0, 1), outP = clamp((c.dur - local) / 0.3, 0, 1);
    const e = 1 - Math.pow(1 - inP, 3);
    if (a === 'fade') alpha = e;
    if (a === 'slide') { alpha = e; dy = (1 - e) * size; }
    if (a === 'zoom' || a === 'pop') { alpha = e; sc = 0.7 + 0.3 * e; }
    alpha *= outP;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${st.weight} ${size}px ${fontCss(st.font)}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, c.text ?? '', W * 0.86);
    const lh = size * 1.12;
    const cy = (st.y / 100) * H + dy;
    ctx.translate(W / 2, cy);
    ctx.scale(sc, sc);
    const top = -((lines.length - 1) * lh) / 2;
    if (st.bg) {
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 0.8;
      ctx.fillStyle = st.bg;
      roundRect(ctx, -bw / 2, top - lh / 2 - size * 0.15, bw, lines.length * lh + size * 0.3, size * 0.25);
      ctx.fill();
    } else {
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = size * 0.2;
    }
    ctx.fillStyle = st.color;
    lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lh));
    ctx.restore();
  }

  // Real-time export: plays the timeline from 0 and records canvas + audio.
  async exportTo(canvas: HTMLCanvasElement, record: (dur: number, draw: (t: number) => void, audio?: MediaStream) => Promise<Blob>): Promise<Blob> {
    this.pause();
    this.ensureAudio();
    await this.actx?.resume();
    const dur = this.duration;
    this.t = 0;
    this.syncMedia(0, false);
    await new Promise((r) => setTimeout(r, 300));
    for (const el of this.els.values()) this.route(el);
    let started = false;
    try {
      return await record(dur, (t) => {
        if (!started) { started = true; }
        this.syncMedia(t, true);
        this.drawTo(canvas, t);
      }, this.dest?.stream);
    } finally {
      for (const el of this.els.values()) el.pause();
      this.t = 0;
      this.seek(0);
    }
  }
}

export function fxFilter(c: Clip, extraBlur = 0) {
  const fx = c.fx;
  const parts: string[] = [];
  if (fx) {
    if (fx.bri) parts.push(`brightness(${1 + fx.bri / 100})`);
    if (fx.con) parts.push(`contrast(${1 + fx.con / 100})`);
    if (fx.sat) parts.push(`saturate(${1 + fx.sat / 100})`);
    const a = (fx.filterAmt ?? 100) / 100;
    switch (fx.filter) {
      case 'warm': parts.push(`sepia(${0.25 * a})`, `saturate(${1 + 0.2 * a})`); break;
      case 'cool': parts.push(`hue-rotate(${-12 * a}deg)`, `saturate(${1 - 0.1 * a})`); break;
      case 'matte': parts.push(`contrast(${1 - 0.18 * a})`, `brightness(${1 + 0.06 * a})`, `saturate(${1 - 0.15 * a})`); break;
      case 'contrast': parts.push(`contrast(${1 + 0.35 * a})`); break;
      case 'bw': parts.push(`grayscale(${a})`); break;
      case 'vintage': parts.push(`sepia(${0.55 * a})`, `contrast(${1 - 0.1 * a})`); break;
    }
    if (fx.blur) parts.push(`blur(${(fx.blur / 100) * 16}px)`);
  }
  if (extraBlur) parts.push(`blur(${extraBlur}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Captions: word timing is spread evenly over the caption (no audio alignment available).
export function drawCaption(ctx: CanvasRenderingContext2D, cap: Caption, t: number, style: CapStyle, yPct: number, W: number, H: number) {
  const k = Math.min(W, H) / 1080;
  const words = cap.text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const prog = clamp((t - cap.start) / Math.max(0.1, cap.end - cap.start), 0, 1);
  const active = Math.min(words.length - 1, Math.floor(prog * words.length));
  const size = (style === 'minimal' ? 46 : 62) * k;
  const weight = style === 'minimal' ? 600 : 800;
  const upper = style === 'tiktok';
  ctx.save();
  ctx.font = `${weight} ${size}px ${fontCss('sans')}`;
  ctx.textBaseline = 'middle';
  const space = ctx.measureText(' ').width;
  const ws = words.map((w) => (upper ? w.toUpperCase() : w));
  const maxW = W * 0.84;
  const lines: { w: string; i: number; width: number }[][] = [[]];
  let lw = 0;
  ws.forEach((w, i) => {
    const wd = ctx.measureText(w).width;
    if (lw && lw + space + wd > maxW) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push({ w, i, width: wd });
    lw += (lw ? space : 0) + wd;
  });
  const lh = size * 1.2;
  const cy = (yPct / 100) * H;
  const top = cy - ((lines.length - 1) * lh) / 2;
  if (style === 'boxed') {
    const bw = Math.max(...lines.map((l) => l.reduce((s, x) => s + x.width, 0) + space * (l.length - 1))) + size * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    roundRect(ctx, W / 2 - bw / 2, top - lh / 2 - size * 0.12, bw, lines.length * lh + size * 0.24, size * 0.22);
    ctx.fill();
  }
  lines.forEach((line, li) => {
    const total = line.reduce((s, x) => s + x.width, 0) + space * (line.length - 1);
    let x = W / 2 - total / 2;
    const y = top + li * lh;
    for (const wd of line) {
      let color = '#FFFFFF';
      if (style === 'tiktok' && wd.i === active) color = '#FFD23F';
      if (style === 'karaoke') color = wd.i <= active ? '#FFD23F' : '#FFFFFF';
      if (style !== 'boxed') {
        ctx.lineJoin = 'round';
        ctx.lineWidth = size * (style === 'minimal' ? 0.08 : 0.16);
        ctx.strokeStyle = 'rgba(0,0,0,.85)';
        ctx.strokeText(wd.w, x, y);
      }
      ctx.fillStyle = color;
      ctx.fillText(wd.w, x, y);
      x += wd.width + space;
    }
  });
  ctx.restore();
}
