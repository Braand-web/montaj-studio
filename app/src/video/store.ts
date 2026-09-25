import { create } from 'zustand';
import type { Clip, Doc, TrackId, VideoData } from '../model/types';
import { addVersion, saveDoc } from '../lib/docs';
import { debounce, deepClone, uid } from '../lib/util';
import { dimsLabel } from '../model/formats';

// Video engine state: same command/undo model as the design editor (SPEC §3.1, §3.5).

export const TRACKS: { id: TrackId; fr: string; en: string; icon: string; accepts: Clip['kind'][] }[] = [
  { id: 'text', fr: 'Titres', en: 'Titles', icon: 'type', accepts: ['text'] },
  { id: 'broll', fr: 'Superposition', en: 'Overlay', icon: 'layers', accepts: ['video', 'image'] },
  { id: 'video', fr: 'Vidéo', en: 'Video', icon: 'film', accepts: ['video', 'image'] },
  { id: 'audio', fr: 'Audio', en: 'Audio', icon: 'mic', accepts: ['audio'] },
  { id: 'music', fr: 'Musique', en: 'Music', icon: 'music', accepts: ['audio'] },
];

export const CLIP_COLORS: Record<TrackId, string> = { video: '#1F5FBF', broll: '#8E3FB8', text: '#C98A0A', audio: '#1E8A48', music: '#0E7C93' };

export function duration(d: VideoData) {
  return Math.max(0, ...d.clips.map((c) => c.start + c.dur), ...d.captions.map((c) => c.end));
}

interface VideoState {
  doc: Doc<VideoData> | null;
  past: VideoData[];
  future: VideoData[];
  draft: VideoData | null;
  changed: string[];
  busy: boolean;
  t: number;
  playing: boolean;
  sel: string | null;
  selCap: string | null;
  pps: number; // timeline pixels per second
  snap: boolean;
  loop: boolean;
  setSnap(v: boolean): void;
  setLoop(v: boolean): void;
  load(doc: Doc<VideoData>): void;
  data(): VideoData;
  view(): VideoData;
  apply(fn: (d: VideoData) => void, coalesce?: string): void;
  begin(): void;
  live(fn: (d: VideoData) => void): void;
  end(): void;
  undo(): void;
  redo(): void;
  setT(t: number): void;
  setPlaying(p: boolean): void;
  select(id: string | null): void;
  selectCap(id: string | null): void;
  setPps(p: number): void;
  rename(n: string): void;
  setDraft(d: VideoData | null, changed?: string[]): void;
  setBusy(b: boolean): void;
  flush(): void;
}

let base: VideoData | null = null;
let lastKey = '', lastAt = 0;
const persist = debounce(async (doc: Doc<VideoData>) => {
  doc.format = dimsLabel(doc.data.w, doc.data.h) + ' · ' + fmtDur(duration(doc.data));
  await saveDoc(doc);
}, 600);

export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const useVideo = create<VideoState>((set, get) => {
  const touch = (data: VideoData) => {
    const doc = get().doc;
    if (!doc) return;
    const next = { ...doc, data };
    set({ doc: next });
    persist(next);
  };
  return {
    doc: null, past: [], future: [], draft: null, changed: [], busy: false, t: 0, playing: false, sel: null, selCap: null, pps: 40, snap: true, loop: false,
    setSnap(v) { set({ snap: v }); },
    setLoop(v) { set({ loop: v }); },
    load(doc) { set({ doc, past: [], future: [], draft: null, changed: [], busy: false, t: 0, playing: false, sel: null, selCap: null }); },
    data() { return get().doc!.data; },
    view() { return get().draft ?? get().doc!.data; },
    apply(fn, coalesce) {
      const s = get();
      if (!s.doc) return;
      const cur = s.doc.data;
      const next = deepClone(cur);
      fn(next);
      const now = Date.now();
      const merge = !!coalesce && coalesce === lastKey && now - lastAt < 1200;
      lastKey = coalesce ?? ''; lastAt = now;
      if (!merge) set({ past: [...s.past.slice(-99), cur], future: [] });
      if (s.sel && !next.clips.some((c) => c.id === s.sel)) set({ sel: null });
      touch(next);
    },
    begin() { base = get().doc?.data ?? null; },
    live(fn) {
      const s = get();
      if (!s.doc) return;
      const next = deepClone(s.doc.data);
      fn(next);
      set({ doc: { ...s.doc, data: next } });
    },
    end() {
      const s = get();
      if (!s.doc || !base) return;
      if (base !== s.doc.data) { set({ past: [...s.past.slice(-99), base], future: [] }); touch(s.doc.data); }
      base = null;
    },
    undo() {
      const s = get();
      if (!s.doc || !s.past.length) return;
      const prev = s.past[s.past.length - 1];
      set({ past: s.past.slice(0, -1), future: [s.doc.data, ...s.future] });
      touch(prev);
    },
    redo() {
      const s = get();
      if (!s.doc || !s.future.length) return;
      const nxt = s.future[0];
      set({ future: s.future.slice(1), past: [...s.past, s.doc.data] });
      touch(nxt);
    },
    setT(t) { set({ t: Math.max(0, t) }); },
    setPlaying(p) { set({ playing: p }); },
    select(id) { set({ sel: id, selCap: null }); },
    selectCap(id) { set({ selCap: id, sel: null }); },
    setPps(p) { set({ pps: Math.max(4, Math.min(400, p)) }); },
    rename(n) { const doc = get().doc; if (!doc) return; const next = { ...doc, name: n }; set({ doc: next }); persist(next); },
    setDraft(d, changed = []) { set({ draft: d, changed }); },
    setBusy(b) { set({ busy: b }); },
    flush() { const doc = get().doc; if (doc) persist.flush(doc); },
  };
});

export async function videoSnapshot(origin: 'user' | 'agent' | 'autosave' | 'restore', label: string) {
  const doc = useVideo.getState().doc;
  if (doc) await addVersion(doc, origin, label);
}

export const defaultFx = () => ({ bri: 0, con: 0, sat: 0, temp: 0 });

export function newClip(p: Partial<Clip> & Pick<Clip, 'track' | 'kind' | 'name' | 'start' | 'dur'>): Clip {
  return { id: uid('c'), in: 0, volume: 1, speed: 1, ...p };
}

// Commands used by the UI, the shortcuts and the assistant.
export const V = {
  split(id: string, at: number) {
    let ok = false;
    useVideo.getState().apply((d) => {
      const c = d.clips.find((x) => x.id === id);
      if (!c || at <= c.start + 0.05 || at >= c.start + c.dur - 0.05) return;
      const left = at - c.start;
      const right: Clip = { ...deepClone(c), id: uid('c'), start: at, dur: c.dur - left, in: c.in + left * (c.speed ?? 1), trIn: undefined };
      c.dur = left;
      c.trOut = undefined;
      d.clips.push(right);
      ok = true;
    });
    return ok;
  },
  remove(id: string) { useVideo.getState().apply((d) => { d.clips = d.clips.filter((c) => c.id !== id); }); },
  update(id: string, patch: Partial<Clip> | ((c: Clip) => void), coalesce?: string) {
    useVideo.getState().apply((d) => {
      const c = d.clips.find((x) => x.id === id);
      if (!c) return;
      if (typeof patch === 'function') patch(c); else Object.assign(c, patch);
    }, coalesce ?? (typeof patch === 'object' ? id + Object.keys(patch).join() : undefined));
  },
  add(c: Clip) { useVideo.getState().apply((d) => { d.clips.push(c); }); useVideo.getState().select(c.id); return c.id; },
  duplicate(id: string) {
    const st = useVideo.getState();
    const c = st.data().clips.find((x) => x.id === id);
    if (!c) return null;
    const copy: Clip = { ...deepClone(c), id: uid('c') };
    // Right after the original on the same track, or the first free track at that time.
    copy.start = Math.round((c.start + c.dur) * 100) / 100;
    copy.track = freeTrack(st.data(), c.track, copy.start, copy.dur);
    st.apply((d) => {
      // Push later clips on that track to make room.
      if (copy.track === c.track) for (const x of d.clips) if (x.track === c.track && x.id !== c.id && x.start >= copy.start - 0.01) x.start = Math.round((x.start + copy.dur) * 100) / 100;
      d.clips.push(copy);
    });
    st.select(copy.id);
    return copy.id;
  },
  // Delete a clip and pull the following clips of the same track left to close the gap.
  rippleDelete(id: string) {
    useVideo.getState().apply((d) => {
      const c = d.clips.find((x) => x.id === id);
      if (!c) return;
      d.clips = d.clips.filter((x) => x.id !== id);
      for (const x of d.clips) if (x.track === c.track && x.start >= c.start + c.dur - 0.01) x.start = Math.round((x.start - c.dur) * 100) / 100;
    });
  },
  // Packs the clips of a track one after another from 0, removing every gap.
  closeGaps(track: TrackId) {
    let moved = 0;
    useVideo.getState().apply((d) => {
      const cs = d.clips.filter((x) => x.track === track).sort((a, b) => a.start - b.start);
      let t = cs.length ? Math.min(cs[0].start, 0) : 0;
      for (const c of cs) { if (Math.abs(c.start - t) > 0.01) moved++; c.start = Math.round(t * 100) / 100; t += c.dur; }
    });
    return moved;
  },
  marker(at: number) {
    useVideo.getState().apply((d) => {
      const i = d.markers.findIndex((m) => Math.abs(m - at) < 0.05);
      if (i >= 0) d.markers.splice(i, 1); else d.markers.push(Math.round(at * 100) / 100);
    });
  },
};

// Track that an item can go to at a given time: the preferred one if free, otherwise the overlay.
export function freeTrack(d: VideoData, pref: TrackId, start: number, dur: number): TrackId {
  const busy = (tr: TrackId) => d.clips.some((c) => c.track === tr && c.start < start + dur - 0.01 && c.start + c.dur > start + 0.01);
  if (!busy(pref)) return pref;
  if (pref === 'video' && !busy('broll')) return 'broll';
  if (pref === 'audio' && !busy('music')) return 'music';
  return pref;
}

export function trackEnd(d: VideoData, tr: TrackId) {
  return Math.max(0, ...d.clips.filter((c) => c.track === tr).map((c) => c.start + c.dur));
}

// Set by the preview while it is mounted: renders the frame under the playhead for the assistant.
export const frameGrab: { fn: (() => Promise<Blob | null>) | null } = { fn: null };
