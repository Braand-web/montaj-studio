import { SHAPES } from './shapes';
import type { ShapeKind } from '../model/types';
import type { DesignData, El, Page } from '../model/types';
import { useDesign, newEl, resizePage } from './store';
import { deepClone, uid } from '../lib/util';
import type { MediaItem } from '../model/types';
import { useApp } from '../store/app';

// Commands of the design editor. UI, shortcuts and templates all call these (SPEC §3.2).

const S = () => useDesign.getState();
const cur = (d: DesignData) => d.pages[Math.min(S().pageIdx, d.pages.length - 1)];

export function addElement(p: Partial<El> & Pick<El, 'type'>) {
  let id = '';
  S().apply((d) => {
    const page = cur(d);
    const el = newEl(p, page);
    page.els.push(el);
    id = el.id;
  });
  S().select([id]);
  return id;
}

export function addText(kind: 'title' | 'subtitle' | 'body') {
  const page = S().page();
  const brand = useApp.getState().brand;
  const k = Math.min(page.w, page.h);
  const spec = {
    title: { text: useApp.getState().lang === 'fr' ? 'Ajoute un titre' : 'Add a heading', size: Math.round(k * 0.11), weight: 800, font: brand.fonts.heading },
    subtitle: { text: useApp.getState().lang === 'fr' ? 'Ajoute un sous-titre' : 'Add a subheading', size: Math.round(k * 0.06), weight: 600, font: brand.fonts.heading },
    body: { text: useApp.getState().lang === 'fr' ? 'Ajoute du texte courant' : 'Add body text', size: Math.round(k * 0.035), weight: 400, font: brand.fonts.body },
  }[kind];
  const lines = kind === 'body' ? 3 : 1;
  const w = Math.round(page.w * 0.7);
  const h = Math.round(spec.size * 1.15 * lines);
  const bgDark = isDark(page.bg);
  return addElement({ type: 'text', name: kind === 'title' ? 'Titre' : kind === 'subtitle' ? 'Sous-titre' : 'Texte', w, h, lh: 1.15, align: 'left', color: bgDark ? '#F2F2EE' : '#0F1115', ...spec });
}

export function isDark(hex: string) {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export function addShape(type: 'rect' | 'circle' | 'line' | 'image' | 'chart' | 'table' | 'qr') {
  const page = S().page();
  const brand = useApp.getState().brand;
  const k = Math.min(page.w, page.h);
  const fr = useApp.getState().lang === 'fr';
  switch (type) {
    case 'rect': return addElement({ type, name: fr ? 'Rectangle' : 'Rectangle', w: Math.round(k * 0.4), h: Math.round(k * 0.25), fill: brand.colors[2] ?? '#FFD23F', radius: Math.round(k * 0.015) });
    case 'circle': return addElement({ type, name: fr ? 'Cercle' : 'Circle', w: Math.round(k * 0.3), h: Math.round(k * 0.3), fill: brand.colors[3] ?? '#2E6BFF' });
    case 'line': return addElement({ type, name: fr ? 'Trait' : 'Line', w: Math.round(k * 0.5), h: Math.round(k * 0.04), fill: brand.colors[0] ?? '#0F1115', strokeW: Math.max(2, Math.round(k * 0.008)) });
    case 'image': return addElement({ type, name: fr ? 'Cadre photo' : 'Photo frame', w: Math.round(k * 0.45), h: Math.round(k * 0.45) });
    case 'chart': return addElement({ type, name: fr ? 'Graphique' : 'Chart', w: Math.round(k * 0.6), h: Math.round(k * 0.4), kind: 'col', fill: brand.colors[3] ?? '#2E6BFF', color: isDark(page.bg) ? '#F2F2EE' : '#0F1115', data: [['T1', 12], ['T2', 19], ['T3', 27], ['T4', 31]] });
    case 'table': return addElement({ type, name: fr ? 'Tableau' : 'Table', w: Math.round(k * 0.6), h: Math.round(k * 0.3), fill: brand.colors[2] ?? '#FFD23F', color: isDark(page.bg) ? '#F2F2EE' : '#0F1115', rows: fr ? [['Offre', 'Prix'], ['Découverte', '0 €'], ['Pro', '0 €']] : [['Plan', 'Price'], ['Starter', '$0'], ['Pro', '$0']] });
    case 'qr': return addElement({ type, name: 'QR code', w: Math.round(k * 0.25), h: Math.round(k * 0.25), qr: 'https://exemple.com', fill: '#0F1115' });
  }
}

export function addImageFromMedia(m: MediaItem, at?: { x: number; y: number }) {
  const page = S().page();
  const iw = m.w || 800, ih = m.h || 600;
  const s = Math.min((page.w * 0.6) / iw, (page.h * 0.6) / ih);
  const w = Math.round(iw * s), h = Math.round(ih * s);
  return addElement({
    type: 'image', name: m.name.replace(/\.[a-z0-9]+$/i, ''), mediaId: m.id, w, h,
    x: at ? Math.round(at.x - w / 2) : undefined, y: at ? Math.round(at.y - h / 2) : undefined,
  });
}

export function setImageMedia(id: string, m: MediaItem) {
  S().apply((d) => {
    const el = d.pages.flatMap((p) => p.els).find((e) => e.id === id);
    if (el) { el.mediaId = m.id; if (!el.name || el.name.endsWith('photo') || el.name.startsWith('Cadre') || el.name === 'Photo') el.name = m.name.replace(/\.[a-z0-9]+$/i, ''); }
  }, { keepSel: true });
}

export function updateEls(ids: string[], patch: Partial<El> | ((e: El) => void)) {
  S().apply((d) => {
    for (const p of d.pages) for (const e of p.els) if (ids.includes(e.id)) {
      if (typeof patch === 'function') patch(e); else Object.assign(e, patch);
    }
    syncComponents(d, ids);
  }, { keepSel: true, coalesce: typeof patch === 'object' ? ids.join() + ':' + Object.keys(patch).join() : undefined });
}

// Linked components: editing one instance's content updates every instance (addendum #11).
function syncComponents(d: DesignData, ids: string[]) {
  const all = d.pages.flatMap((p) => p.els);
  for (const id of ids) {
    const src = all.find((e) => e.id === id);
    if (!src?.compId) continue;
    for (const e of all) {
      if (e.compId === src.compId && e.id !== src.id) {
        e.text = src.text; e.color = src.color; e.fill = src.fill; e.size = src.size; e.weight = src.weight; e.font = src.font;
        e.mediaId = src.mediaId; e.fx = src.fx ? { ...src.fx } : undefined; e.align = src.align; e.upper = src.upper;
      }
    }
  }
}

export function removeSel() {
  const sel = S().sel;
  if (!sel.length) return;
  S().apply((d) => { const p = cur(d); p.els = p.els.filter((e) => !sel.includes(e.id) || e.locked); });
}

export function duplicateSel() {
  const sel = S().sel;
  if (!sel.length) return;
  const newIds: string[] = [];
  S().apply((d) => {
    const p = cur(d);
    const gmap = new Map<string, string>();
    const copies = p.els.filter((e) => sel.includes(e.id)).map((e) => {
      const c = deepClone(e);
      c.id = uid('e');
      c.x += Math.round(p.w * 0.02);
      c.y += Math.round(p.w * 0.02);
      c.locked = false;
      if (c.groupId) { if (!gmap.has(c.groupId)) gmap.set(c.groupId, uid('g')); c.groupId = gmap.get(c.groupId); }
      newIds.push(c.id);
      return c;
    });
    p.els.push(...copies);
  });
  S().select(newIds);
}

let clipboard: El[] = [];
export function copySel() {
  const p = S().page();
  clipboard = deepClone(p.els.filter((e) => S().sel.includes(e.id)));
  return clipboard.length;
}
export function pasteClipboard() {
  if (!clipboard.length) return;
  const ids: string[] = [];
  S().apply((d) => {
    const p = cur(d);
    for (const e of clipboard) {
      const c = { ...deepClone(e), id: uid('e') };
      c.x = Math.min(c.x + 20, p.w - 10);
      c.y = Math.min(c.y + 20, p.h - 10);
      p.els.push(c);
      ids.push(c.id);
    }
  });
  S().select(ids);
}

export function arrange(to: 'front' | 'back' | 'forward' | 'backward') {
  const sel = S().sel;
  if (!sel.length) return;
  S().apply((d) => {
    const p = cur(d);
    const picked = p.els.filter((e) => sel.includes(e.id));
    const rest = p.els.filter((e) => !sel.includes(e.id));
    if (to === 'front') p.els = [...rest, ...picked];
    else if (to === 'back') p.els = [...picked, ...rest];
    else {
      const idx = p.els.findIndex((e) => e.id === sel[0]);
      const j = to === 'forward' ? Math.min(p.els.length - 1, idx + 1) : Math.max(0, idx - 1);
      const [el] = p.els.splice(idx, 1);
      p.els.splice(j, 0, el);
    }
  }, { keepSel: true });
}

export function flip(axis: 'x' | 'y') {
  const sel = S().sel;
  if (!sel.length) return;
  updateEls(sel, (e) => { if (e.locked) return; if (axis === 'x') e.flipX = !e.flipX; else e.flipY = !e.flipY; });
}

export function addVector(shape: ShapeKind) {
  const page = S().page();
  const brand = useApp.getState().brand;
  const k = Math.min(page.w, page.h) * 0.32;
  const def = SHAPES.find((x) => x.k === shape)!;
  return addElement({ type: 'shape', shape, name: useApp.getState().lang === 'fr' ? def.fr : def.en, w: Math.round(def.ratio < 1 ? k : k), h: Math.round(k * def.ratio), fill: brand.colors[3] ?? '#2E6BFF' });
}

export function toggleLock() {
  const sel = S().sel;
  const p = S().page();
  const lock = !p.els.filter((e) => sel.includes(e.id)).every((e) => e.locked);
  updateEls(sel, { locked: lock });
}

export function group() {
  const sel = S().sel;
  if (sel.length < 2) return;
  const g = uid('g');
  updateEls(sel, { groupId: g });
}
export function ungroup() {
  updateEls(S().sel, (e) => { delete e.groupId; });
}

export function makeComponent() {
  const sel = S().sel;
  if (sel.length !== 1) return;
  const c = uid('c');
  updateEls(sel, { compId: c });
}
export function insertComponent(compId: string) {
  const d = S().doc!.data;
  const src = d.pages.flatMap((p) => p.els).find((e) => e.compId === compId);
  if (!src) return;
  const copy = deepClone(src);
  copy.id = uid('e');
  addElement(copy);
}
export function detachComponent() {
  updateEls(S().sel, (e) => { delete e.compId; });
}

type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';
export function align(kind: AlignKind, toPage: boolean) {
  const sel = S().sel;
  if (!sel.length) return;
  S().apply((d) => {
    const p = cur(d);
    const els = p.els.filter((e) => sel.includes(e.id) && !e.locked);
    const box = toPage || els.length < 2
      ? { x: 0, y: 0, r: p.w, b: p.h }
      : { x: Math.min(...els.map((e) => e.x)), y: Math.min(...els.map((e) => e.y)), r: Math.max(...els.map((e) => e.x + e.w)), b: Math.max(...els.map((e) => e.y + e.h)) };
    for (const e of els) {
      if (kind === 'left') e.x = box.x;
      if (kind === 'hcenter') e.x = Math.round((box.x + box.r) / 2 - e.w / 2);
      if (kind === 'right') e.x = box.r - e.w;
      if (kind === 'top') e.y = box.y;
      if (kind === 'vcenter') e.y = Math.round((box.y + box.b) / 2 - e.h / 2);
      if (kind === 'bottom') e.y = box.b - e.h;
    }
  }, { keepSel: true });
}

export function distribute(axis: 'h' | 'v') {
  const sel = S().sel;
  if (sel.length < 3) return;
  S().apply((d) => {
    const p = cur(d);
    const els = p.els.filter((e) => sel.includes(e.id)).sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
    const first = els[0], last = els[els.length - 1];
    const total = els.reduce((s, e) => s + (axis === 'h' ? e.w : e.h), 0);
    const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y;
    const gap = (span - total) / (els.length - 1);
    let pos = axis === 'h' ? first.x : first.y;
    for (const e of els) {
      if (axis === 'h') { e.x = Math.round(pos); pos += e.w + gap; } else { e.y = Math.round(pos); pos += e.h + gap; }
    }
  }, { keepSel: true });
}

export function nudge(dx: number, dy: number) {
  const sel = S().sel;
  if (!sel.length) return;
  updateEls(sel, (e) => { if (!e.locked) { e.x += dx; e.y += dy; } });
}

export function addPage(after?: number) {
  const s = S();
  const ref = s.page();
  const idx = after ?? s.pageIdx;
  s.apply((d) => { d.pages.splice(idx + 1, 0, { id: uid('p'), w: ref.w, h: ref.h, bg: '#FFFFFF', els: [] }); });
  S().setPage(idx + 1);
}
export function duplicatePage(i: number) {
  S().apply((d) => {
    const c = deepClone(d.pages[i]);
    c.id = uid('p');
    c.els = c.els.map((e) => ({ ...e, id: uid('e') }));
    d.pages.splice(i + 1, 0, c);
  });
  S().setPage(i + 1);
}
export function deletePage(i: number) {
  if (S().doc!.data.pages.length <= 1) return false;
  S().apply((d) => { d.pages.splice(i, 1); });
  S().setPage(Math.max(0, i - 1));
  return true;
}
export function movePage(i: number, dir: -1 | 1) {
  const j = i + dir;
  const n = S().doc!.data.pages.length;
  if (j < 0 || j >= n) return;
  S().apply((d) => { const [p] = d.pages.splice(i, 1); d.pages.splice(j, 0, p); });
  S().setPage(j);
}
export function setPageBg(color: string) {
  const i = S().pageIdx;
  S().apply((d) => { d.pages[i].bg = color; }, { keepSel: true });
}

export function resizeTo(formats: { w: number; h: number }[]) {
  const s = S();
  const src = s.page();
  s.apply((d) => { for (const f of formats) d.pages.push(resizePage(src, f.w, f.h)); });
  return formats.length;
}

export function animatePage(p: Page) {
  const kinds: El['anim'][] = ['fade', 'slide', 'zoom'];
  const ids = p.els.map((e) => e.id);
  S().apply((d) => {
    const pg = d.pages.find((x) => x.id === p.id)!;
    pg.els.forEach((e, i) => {
      if (!ids.includes(e.id)) return;
      const full = e.w >= pg.w * 0.95 && e.h >= pg.h * 0.95;
      e.anim = full ? 'fade' : e.type === 'text' ? 'slide' : kinds[i % kinds.length];
      e.delay = Math.round(i * 0.15 * 100) / 100;
    });
  }, { keepSel: true });
}
