import { create } from 'zustand';
import type { DesignData, Doc, El, Page } from '../model/types';
import { addVersion, saveDoc } from '../lib/docs';
import { debounce, deepClone, uid } from '../lib/util';
import { pageThumb } from './render';
import { dimsLabel } from '../model/formats';

// Design engine state. Every change goes through `apply` (one undo step) or through a
// gesture (`begin` + `live` + `end`), which is also one undo step (SPEC §3.2, §3.5).

interface DesignState {
  doc: Doc<DesignData> | null;
  pageIdx: number;
  sel: string[];
  past: DesignData[];
  future: DesignData[];
  draft: DesignData | null; // Assist-mode proposal shown on a copy
  changed: string[]; // element ids touched by the assistant
  busy: boolean; // assistant is editing in Agent mode
  guides: { v: boolean; h: boolean };
  load(doc: Doc<DesignData>): void;
  data(): DesignData;
  page(): Page;
  apply(fn: (d: DesignData) => void, opts?: { keepSel?: boolean }): void;
  begin(): void;
  live(fn: (d: DesignData) => void): void;
  end(): void;
  undo(): void;
  redo(): void;
  select(ids: string[]): void;
  setPage(i: number): void;
  rename(name: string): void;
  setDraft(d: DesignData | null, changed?: string[]): void;
  setBusy(b: boolean): void;
  setGuides(g: { v: boolean; h: boolean }): void;
  flush(): Promise<void>;
}

let gestureBase: DesignData | null = null;

const persist = debounce(async (doc: Doc<DesignData>) => {
  const p0 = doc.data.pages[0];
  if (p0) doc.format = dimsLabel(p0.w, p0.h) + (doc.data.pages.length > 1 ? ` · ${doc.data.pages.length} p.` : '');
  await saveDoc(doc);
}, 600);
const thumb = debounce(async (doc: Doc<DesignData>) => {
  const p0 = doc.data.pages[0];
  if (!p0) return;
  doc.thumb = await pageThumb(p0);
  await saveDoc(doc);
}, 2500);

export const useDesign = create<DesignState>((set, get) => {
  const touch = (data: DesignData) => {
    const doc = get().doc;
    if (!doc) return;
    const next = { ...doc, data };
    set({ doc: next });
    persist(next);
    thumb(next);
  };
  return {
    doc: null, pageIdx: 0, sel: [], past: [], future: [], draft: null, changed: [], busy: false, guides: { v: false, h: false },
    load(doc) {
      set({ doc, pageIdx: 0, sel: [], past: [], future: [], draft: null, changed: [], busy: false });
    },
    data() { return get().doc!.data; },
    page() {
      const s = get();
      const d = s.draft ?? s.doc!.data;
      return d.pages[Math.min(s.pageIdx, d.pages.length - 1)];
    },
    apply(fn, opts) {
      const s = get();
      if (!s.doc) return;
      const cur = s.doc.data;
      const next = deepClone(cur);
      fn(next);
      set({ past: [...s.past.slice(-99), cur], future: [] });
      if (!opts?.keepSel) {
        const ids = new Set(next.pages.flatMap((p) => p.els.map((e) => e.id)));
        set({ sel: s.sel.filter((id) => ids.has(id)) });
      }
      if (s.pageIdx >= next.pages.length) set({ pageIdx: next.pages.length - 1 });
      touch(next);
    },
    begin() { gestureBase = get().doc?.data ?? null; },
    live(fn) {
      const s = get();
      if (!s.doc) return;
      const next = deepClone(s.doc.data);
      fn(next);
      set({ doc: { ...s.doc, data: next } });
    },
    end() {
      const s = get();
      if (!s.doc || !gestureBase) return;
      if (gestureBase !== s.doc.data) {
        set({ past: [...s.past.slice(-99), gestureBase], future: [] });
        touch(s.doc.data);
      }
      gestureBase = null;
    },
    undo() {
      const s = get();
      if (!s.doc || !s.past.length) return;
      const prev = s.past[s.past.length - 1];
      set({ past: s.past.slice(0, -1), future: [s.doc.data, ...s.future], pageIdx: Math.min(s.pageIdx, prev.pages.length - 1) });
      touch(prev);
    },
    redo() {
      const s = get();
      if (!s.doc || !s.future.length) return;
      const nxt = s.future[0];
      set({ future: s.future.slice(1), past: [...s.past, s.doc.data], pageIdx: Math.min(s.pageIdx, nxt.pages.length - 1) });
      touch(nxt);
    },
    select(ids) {
      // Selecting one member of a group selects the whole group.
      const pg = get().page();
      const groups = new Set(pg.els.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId));
      const all = new Set(ids);
      pg.els.forEach((e) => { if (e.groupId && groups.has(e.groupId)) all.add(e.id); });
      set({ sel: [...all] });
    },
    setPage(i) { set({ pageIdx: i, sel: [] }); },
    rename(name) {
      const doc = get().doc;
      if (!doc) return;
      const next = { ...doc, name };
      set({ doc: next });
      persist(next);
    },
    setDraft(d, changed = []) { set({ draft: d, changed, sel: [] }); },
    setBusy(b) { set({ busy: b }); },
    setGuides(g) { set({ guides: g }); },
    async flush() {
      const doc = get().doc;
      if (doc) { persist.flush(doc); }
    },
  };
});

export async function snapshot(origin: 'user' | 'agent' | 'autosave' | 'restore', label: string) {
  const doc = useDesign.getState().doc;
  if (doc) await addVersion(doc, origin, label);
}

// Helpers used by the UI and by the assistant tools.
export function findEl(d: DesignData, id: string): { page: Page; el: El; pi: number } | null {
  for (let pi = 0; pi < d.pages.length; pi++) {
    const el = d.pages[pi].els.find((e) => e.id === id);
    if (el) return { page: d.pages[pi], el, pi };
  }
  return null;
}

export function newEl(p: Partial<El> & Pick<El, 'type'>, page: Page): El {
  const w = p.w ?? Math.round(page.w * 0.4);
  const h = p.h ?? Math.round(page.h * 0.2);
  return {
    id: uid('e'),
    name: p.name ?? p.type,
    x: p.x ?? Math.round((page.w - w) / 2),
    y: p.y ?? Math.round((page.h - h) / 2),
    w, h,
    ...p,
  } as El;
}

// "Décliner": copy a page into another format — scale uniformly, center, stretch full-page
// backgrounds, keep a minimum text size (prototype `rzPage`).
export function resizePage(p: Page, W: number, H: number): Page {
  const s = Math.min(W / p.w, H / p.h);
  const ox = (W - p.w * s) / 2, oy = (H - p.h * s) / 2;
  return {
    id: uid('p'), w: W, h: H, bg: p.bg, label: p.label,
    els: p.els.map((e) => {
      const full = e.x <= 1 && e.y <= 1 && e.w >= p.w - 2 && e.h >= p.h - 2;
      if (full) return { ...e, id: uid('e'), x: 0, y: 0, w: W, h: H };
      const n: El = { ...e, id: uid('e'), x: Math.round(ox + e.x * s), y: Math.round(oy + e.y * s), w: Math.round(e.w * s), h: Math.round(e.h * s) };
      if (e.type === 'text' && e.size) n.size = Math.max(Math.round(e.size * s), Math.round(Math.min(W, H) * 0.028));
      if (e.radius) n.radius = e.radius * s;
      return n;
    }),
  };
}
