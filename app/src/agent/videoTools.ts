import type { Caption, CapStyle, Clip, FontKey, MediaItem, TrackId, VideoData } from '../model/types';
import type { AgentTool } from './runner';
import { num, str, bool } from './runner';
import type { DataTarget } from './designTools';
import { duration, freeTrack, newClip, TRACKS } from '../video/store';
import { textToCaptions } from '../video/captions';
import { FONT_KEYS } from '../model/fonts';
import { normHex, uid } from '../lib/util';

const r2 = (v: number) => Math.round(v * 100) / 100;

export function compactVideo(d: VideoData) {
  return {
    format: `${d.w}x${d.h}`, duration: r2(duration(d)), captionStyle: d.capStyle, markers: d.markers,
    clips: d.clips.map((c) => {
      const o: Record<string, unknown> = { id: c.id, track: c.track, kind: c.kind, name: c.name, start: r2(c.start), dur: r2(c.dur), in: r2(c.in) };
      if (c.text) o.text = c.text;
      if (c.speed && c.speed !== 1) o.speed = c.speed;
      if (c.volume !== undefined && c.volume !== 1) o.volume = c.volume;
      if (c.muted) o.muted = true;
      if (c.fx && (c.fx.filter || c.fx.bri || c.fx.con || c.fx.sat || c.fx.temp || c.fx.blur || c.fx.glow || c.fx.vignette)) o.fx = c.fx;
      if (c.trIn) o.transitionIn = c.trIn;
      if (c.trOut) o.transitionOut = c.trOut;
      return o;
    }),
    captions: d.captions.map((k) => ({ id: k.id, start: r2(k.start), end: r2(k.end), text: k.text })),
  };
}

const FILTERS = ['warm', 'cool', 'matte', 'contrast', 'bw', 'vintage', 'none'];

export function videoTools(t: DataTarget<VideoData>, ctx: { media: () => MediaItem[]; playhead: () => number }): AgentTool[] {
  const clip = (d: VideoData, id: unknown) => {
    const c = d.clips.find((x) => x.id === str(id));
    if (!c) throw new Error('No clip with id ' + String(id));
    return c;
  };
  const mark = (id: string, what: string) => { t.changed.add(id); t.changes.push(what); };
  return [
    {
      name: 'get_timeline', write: false,
      description: 'Returns the video format, total duration, every clip (id, track, kind, start, dur, source in-point, effects) and the captions. Times are seconds.',
      run: () => ({ ...compactVideo(t.read()), playhead: r2(ctx.playhead()) }),
    },
    {
      name: 'list_media', write: false,
      description: "Lists the user's local media (id, kind video/image/audio, name, duration) that can be put on the timeline with add_media_clip.",
      run: () => ctx.media().slice(0, 50).map((m) => ({ id: m.id, kind: m.kind, name: m.name, duration: m.duration ? r2(m.duration) : undefined, w: m.w, h: m.h })),
    },
    {
      name: 'add_media_clip', write: true,
      description: 'Places a media item on the timeline. track: video (main), broll (overlay on top), audio, music. For images give dur (default 4 s). in = offset into the source.',
      schema: { mediaId: { type: 'string' }, track: { type: 'string', enum: TRACKS.map((x) => x.id) }, start: { type: 'number' }, dur: { type: 'number' }, in: { type: 'number' } },
      required: ['mediaId'],
      run: (a) => {
        const m = ctx.media().find((x) => x.id === str(a.mediaId));
        if (!m) throw new Error('Unknown media id');
        let id = '';
        t.write((d) => {
          const kind = m.kind;
          const inPt = Math.max(0, num(a.in, 0)!);
          const srcLeft = m.duration ? m.duration - inPt : 4;
          const dur = Math.max(0.2, Math.min(num(a.dur, kind === 'image' ? 4 : srcLeft)!, kind === 'image' ? 3600 : srcLeft));
          const pref = (str(a.track) as TrackId) ?? (kind === 'audio' ? 'audio' : 'video');
          const start = num(a.start) ?? Math.max(0, ...d.clips.filter((c) => c.track === pref).map((c) => c.start + c.dur));
          const track = TRACKS.find((x) => x.id === pref)?.accepts.includes(kind) ? pref : kind === 'audio' ? 'audio' : 'video';
          const c = newClip({ track: freeTrack(d, track, start, dur), kind, mediaId: m.id, name: m.name, start: r2(start), dur: r2(dur), in: inPt });
          d.clips.push(c);
          id = c.id;
          mark(c.id, `${m.name} ajouté à ${r2(start)} s`);
        });
        return { id };
      },
    },
    {
      name: 'add_title', write: true,
      description: 'Adds a text title clip on the Titles track. size is in px for a 1080-px frame; y is vertical position in % from the top.',
      schema: { text: { type: 'string' }, start: { type: 'number' }, dur: { type: 'number' }, size: { type: 'number' }, color: { type: 'string' }, bg: { type: 'string', description: 'optional box color hex' }, y: { type: 'number' }, font: { type: 'string', enum: FONT_KEYS }, anim: { type: 'string', enum: ['fade', 'slide', 'zoom', 'none'] } },
      required: ['text', 'start'],
      run: (a) => {
        let id = '';
        t.write((d) => {
          const c = newClip({
            track: 'text', kind: 'text', name: 'Titre', text: str(a.text) ?? '', start: r2(Math.max(0, num(a.start, 0)!)), dur: r2(Math.max(0.3, num(a.dur, 3)!)),
            style: { size: num(a.size, 84)!, color: normHex(str(a.color) ?? '') ?? '#FFFFFF', weight: 800, font: (FONT_KEYS.includes(str(a.font) as FontKey) ? str(a.font) : 'sans') as FontKey, bg: a.bg ? normHex(str(a.bg)!) ?? undefined : undefined, y: num(a.y, 20)!, anim: (str(a.anim) as 'fade') ?? 'fade' },
          });
          d.clips.push(c);
          id = c.id;
          mark(c.id, `Titre « ${c.text} » à ${c.start} s`);
        });
        return { id };
      },
    },
    {
      name: 'split_clip', write: true,
      description: 'Splits a clip at a timeline time (seconds). Returns the id of the right part.',
      schema: { id: { type: 'string' }, at: { type: 'number' } }, required: ['id', 'at'],
      run: (a) => {
        let rid = '';
        t.write((d) => {
          const c = clip(d, a.id);
          const at = num(a.at)!;
          if (at <= c.start + 0.05 || at >= c.start + c.dur - 0.05) throw new Error(`at must be inside the clip (${r2(c.start)}–${r2(c.start + c.dur)})`);
          const left = at - c.start;
          const right: Clip = { ...JSON.parse(JSON.stringify(c)), id: uid('c'), start: at, dur: c.dur - left, in: c.in + left * (c.speed ?? 1), trIn: undefined };
          c.dur = left;
          d.clips.push(right);
          rid = right.id;
          mark(right.id, `${c.name} scindé à ${r2(at)} s`);
        });
        return { rightId: rid };
      },
    },
    {
      name: 'delete_clip', write: true,
      description: 'Removes a clip. Set ripple=true to shift later clips on the same track left to close the gap.',
      schema: { id: { type: 'string' }, ripple: { type: 'boolean' } }, required: ['id'],
      run: (a) => {
        t.write((d) => {
          const c = clip(d, a.id);
          d.clips = d.clips.filter((x) => x.id !== c.id);
          if (bool(a.ripple)) for (const x of d.clips) if (x.track === c.track && x.start >= c.start + c.dur - 0.01) x.start = r2(x.start - c.dur);
          t.changes.push(`${c.name} supprimé${bool(a.ripple) ? ' (trou refermé)' : ''}`);
        });
        return { ok: true };
      },
    },
    {
      name: 'update_clip', write: true,
      description: 'Changes a clip: start, dur, in (source offset), track, speed (0.25–4), volume (0–1), muted, text (title clips), fit (cover/contain), scale, x, y (% offsets), opacity (0–1), mask (none/circle/rounded/heart/star/diamond), blend (normal/screen/multiply/overlay/lighten/darken/difference), bgBlur (blurred fill behind a contained clip), chroma ({color hex, tol 0-100} to remove a green screen, or null), kf (keyframes: array of {t seconds from clip start, x, y, scale, rot, opacity}, or [] to remove).',
      schema: { id: { type: 'string' }, start: { type: 'number' }, dur: { type: 'number' }, in: { type: 'number' }, track: { type: 'string', enum: TRACKS.map((x) => x.id) }, speed: { type: 'number' }, volume: { type: 'number' }, muted: { type: 'boolean' }, text: { type: 'string' }, fit: { type: 'string', enum: ['cover', 'contain'] }, scale: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, opacity: { type: 'number' }, mask: { type: 'string', enum: ['none', 'circle', 'rounded', 'heart', 'star', 'diamond'] }, blend: { type: 'string', enum: ['normal', 'screen', 'multiply', 'overlay', 'lighten', 'darken', 'difference'] }, bgBlur: { type: 'boolean' }, chroma: { type: 'object' }, kf: { type: 'array' } },
      required: ['id'],
      run: (a) => {
        t.write((d) => {
          const c = clip(d, a.id);
          for (const k of ['start', 'dur', 'in', 'scale', 'x', 'y', 'opacity'] as const) { const v = num(a[k]); if (v !== undefined) (c as unknown as Record<string, number>)[k] = k === 'dur' ? Math.max(0.1, v) : v; }
          const sp = num(a.speed); if (sp !== undefined) c.speed = Math.max(0.25, Math.min(4, sp));
          const vol = num(a.volume); if (vol !== undefined) c.volume = Math.max(0, Math.min(1, vol));
          if (a.muted !== undefined) c.muted = bool(a.muted);
          if (a.text !== undefined) c.text = str(a.text);
          if (a.fit !== undefined) c.fit = str(a.fit) === 'contain' ? 'contain' : 'cover';
          if (a.mask !== undefined) { const v = str(a.mask); if (v && ['none', 'circle', 'rounded', 'heart', 'star', 'diamond'].includes(v)) c.mask = v as Clip['mask']; }
          if (a.blend !== undefined) { const v = str(a.blend); if (v && ['normal', 'screen', 'multiply', 'overlay', 'lighten', 'darken', 'difference'].includes(v)) c.blend = v as Clip['blend']; }
          if (a.bgBlur !== undefined) c.bgBlur = !!a.bgBlur;
          if (a.chroma === null) delete c.chroma;
          else if (a.chroma && typeof a.chroma === 'object') { const o = a.chroma as Record<string, unknown>; c.chroma = { color: str(o.color) ?? '#00FF00', tol: Math.max(0, Math.min(100, num(o.tol) ?? 35)) }; }
          if (Array.isArray(a.kf)) {
            const kf = (a.kf as Record<string, unknown>[]).map((f) => { const o: Record<string, number> = { t: Math.max(0, Math.min(c.dur, num(f.t) ?? 0)) }; for (const k of ['x', 'y', 'scale', 'rot', 'opacity']) { const v = num(f[k]); if (v !== undefined) o[k] = v; } return o as unknown as NonNullable<Clip['kf']>[number]; }).sort((p, q) => p.t - q.t);
            if (kf.length) c.kf = kf; else delete c.kf;
          }
          const tr = str(a.track) as TrackId | undefined;
          if (tr) { const def = TRACKS.find((x) => x.id === tr); if (!def?.accepts.includes(c.kind)) throw new Error(`${c.kind} clips cannot go on track ${tr}`); c.track = tr; }
          mark(c.id, `${c.name} modifié (${Object.keys(a).filter((k) => k !== 'id').join(', ')})`);
        });
        return { ok: true };
      },
    },
    {
      name: 'set_clip_look', write: true,
      description: 'Color and effects of a video/image clip. bri, con, sat, temp: -100..100. filter: warm|cool|matte|contrast|bw|vintage|none with filterAmt 0..100. blur, glow, vignette: 0..100.',
      schema: { id: { type: 'string' }, bri: { type: 'number' }, con: { type: 'number' }, sat: { type: 'number' }, temp: { type: 'number' }, filter: { type: 'string', enum: FILTERS }, filterAmt: { type: 'number' }, blur: { type: 'number' }, glow: { type: 'number' }, vignette: { type: 'number' } },
      required: ['id'],
      run: (a) => {
        t.write((d) => {
          const c = clip(d, a.id);
          const fx = { bri: 0, con: 0, sat: 0, temp: 0, ...c.fx };
          for (const k of ['bri', 'con', 'sat', 'temp', 'filterAmt', 'blur', 'glow', 'vignette'] as const) { const v = num(a[k]); if (v !== undefined) (fx as unknown as Record<string, number>)[k] = Math.max(k === 'bri' || k === 'con' || k === 'sat' || k === 'temp' ? -100 : 0, Math.min(100, v)); }
          if (a.filter !== undefined) { const f = str(a.filter); fx.filter = f === 'none' ? undefined : (f as typeof fx.filter); }
          c.fx = fx;
          mark(c.id, `Look de ${c.name} ajusté`);
        });
        return { ok: true };
      },
    },
    {
      name: 'set_transition', write: true,
      description: 'Entrance transition of a clip (fade|dip|slide|zoom|blur|none) and optional exit (fade|dip|none), with durations in seconds.',
      schema: { id: { type: 'string' }, in: { type: 'string', enum: ['fade', 'dip', 'slide', 'zoom', 'blur', 'none'] }, inDur: { type: 'number' }, out: { type: 'string', enum: ['fade', 'dip', 'none'] }, outDur: { type: 'number' } },
      required: ['id'],
      run: (a) => {
        t.write((d) => {
          const c = clip(d, a.id);
          if (a.in !== undefined) c.trIn = str(a.in) === 'none' ? undefined : { type: str(a.in) as 'fade', dur: Math.max(0.1, num(a.inDur, 0.5)!) };
          if (a.out !== undefined) c.trOut = str(a.out) === 'none' ? undefined : { type: str(a.out) as 'fade', dur: Math.max(0.1, num(a.outDur, 0.5)!) };
          mark(c.id, `Transition sur ${c.name}`);
        });
        return { ok: true };
      },
    },
    {
      name: 'set_format', write: true,
      description: 'Changes the frame size, e.g. 1080x1920 for TikTok/Reels/Shorts, 1920x1080 for YouTube, 1080x1080 square. Visual clips are re-fitted automatically.',
      schema: { w: { type: 'number' }, h: { type: 'number' } }, required: ['w', 'h'],
      run: (a) => {
        t.write((d) => {
          const w = Math.round(num(a.w)!), h = Math.round(num(a.h)!);
          if (!(w >= 240 && h >= 240 && w <= 4096 && h <= 4096)) throw new Error('w and h must be between 240 and 4096');
          d.w = w - (w % 2); d.h = h - (h % 2);
          t.changes.push(`Format ${d.w}×${d.h}`);
        });
        return { ok: true };
      },
    },
    {
      name: 'set_captions', write: true,
      description: 'Replaces captions. Either pass items [{start,end,text}] with exact times, or text plus start to auto-time it at about 2.6 words per second. You cannot hear the audio: only caption text the user gave you.',
      schema: { items: { type: 'array', items: { type: 'object' } }, text: { type: 'string' }, start: { type: 'number' }, style: { type: 'string', enum: ['tiktok', 'karaoke', 'boxed', 'minimal'] }, y: { type: 'number' } },
      run: (a) => {
        t.write((d) => {
          let caps: Caption[] = [];
          if (Array.isArray(a.items)) caps = (a.items as Record<string, unknown>[]).map((k) => ({ id: uid('k'), start: r2(num(k.start, 0)!), end: r2(num(k.end, 0)!), text: str(k.text) ?? '' })).filter((k) => k.end > k.start && k.text);
          else if (a.text) caps = textToCaptions(str(a.text)!, num(a.start, 0)!);
          if (caps.length) d.captions = caps.sort((x, y) => x.start - y.start);
          if (a.style) d.capStyle = str(a.style) as CapStyle;
          const y = num(a.y); if (y !== undefined) d.capY = Math.max(5, Math.min(95, y));
          t.changes.push(`${d.captions.length} sous-titres · style ${d.capStyle}`);
        });
        return { ok: true };
      },
    },
    {
      name: 'edit_caption', write: true,
      description: 'Edits or deletes one caption by id (delete=true).',
      schema: { id: { type: 'string' }, text: { type: 'string' }, start: { type: 'number' }, end: { type: 'number' }, delete: { type: 'boolean' } }, required: ['id'],
      run: (a) => {
        t.write((d) => {
          const k = d.captions.find((x) => x.id === str(a.id));
          if (!k) throw new Error('No caption with that id');
          if (bool(a.delete)) { d.captions = d.captions.filter((x) => x !== k); t.changes.push('Sous-titre supprimé'); return; }
          if (a.text !== undefined) k.text = str(a.text)!;
          const s = num(a.start), e = num(a.end);
          if (s !== undefined) k.start = s;
          if (e !== undefined) k.end = e;
          t.changes.push(`Sous-titre « ${k.text.slice(0, 30)} » modifié`);
        });
        return { ok: true };
      },
    },
    {
      name: 'add_marker', write: true,
      description: 'Adds a marker at a time (seconds).',
      schema: { at: { type: 'number' } }, required: ['at'],
      run: (a) => { t.write((d) => { d.markers.push(r2(num(a.at, 0)!)); t.changes.push(`Marqueur à ${r2(num(a.at, 0)!)} s`); }); return { ok: true }; },
    },
    {
      name: 'set_background', write: true,
      description: 'Sets the frame background color (hex), visible where no clip covers the frame.',
      schema: { color: { type: 'string' } }, required: ['color'],
      run: (a) => { t.write((d) => { const h = normHex(str(a.color) ?? ''); if (!h) throw new Error('hex color expected'); d.bg = h; t.changes.push(`Fond ${h}`); }); return { ok: true }; },
    },
  ];
}
