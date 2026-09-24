import type { DesignData, El, ElType, FontKey, Page } from '../model/types';
import type { AgentTool } from './runner';
import { num, str, bool } from './runner';
import { newEl, resizePage } from '../design/store';
import { FORMATS } from '../model/formats';
import { FONT_KEYS } from '../model/fonts';
import { contrast, normHex, uid } from '../lib/util';
import type { BrandKit, MediaItem } from '../model/types';

export interface DataTarget<T> {
  read(): T;
  write(fn: (d: T) => void): void;
  changed: Set<string>;
  changes: string[];
}

const EL_TYPES: ElType[] = ['text', 'rect', 'circle', 'line', 'image', 'chart', 'table', 'qr'];

export function compactDesign(d: DesignData) {
  return d.pages.map((p, i) => ({
    page: i + 1, w: p.w, h: p.h, bg: p.bg,
    els: p.els.map((e) => {
      const o: Record<string, unknown> = { id: e.id, type: e.type, name: e.name, x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) };
      if (e.type === 'text') Object.assign(o, { text: e.text, size: Math.round(e.size ?? 48), weight: e.weight, color: e.color, font: e.font ?? 'sans', align: e.align ?? 'left' });
      if (['rect', 'circle', 'line', 'chart', 'qr'].includes(e.type) && e.fill) o.fill = e.fill;
      if (e.type === 'image') o.media = e.mediaId ? 'set' : 'empty';
      if (e.type === 'chart') o.data = e.data;
      if (e.type === 'table') o.rows = e.rows;
      if (e.type === 'qr') o.qr = e.qr;
      if (e.rot) o.rot = e.rot;
      if (e.hidden) o.hidden = true;
      if (e.locked) o.locked = true;
      if (e.anim && e.anim !== 'none') o.anim = e.anim;
      return o;
    }),
  }));
}

function pageAt(d: DesignData, v: unknown): Page {
  const n = num(v, 1)!;
  const p = d.pages[Math.round(n) - 1];
  if (!p) throw new Error(`Page ${n} does not exist (document has ${d.pages.length} pages).`);
  return p;
}

function applyProps(el: El, a: Record<string, unknown>) {
  for (const k of ['x', 'y', 'w', 'h', 'size', 'weight', 'rot', 'radius', 'lh', 'delay', 'strokeW'] as const) {
    const v = num(a[k]);
    if (v !== undefined) (el as unknown as Record<string, number>)[k] = k === 'w' || k === 'h' ? Math.max(4, v) : v;
  }
  const op = num(a.opacity);
  if (op !== undefined) el.opacity = Math.max(0, Math.min(1, op > 1 ? op / 100 : op));
  for (const k of ['color', 'fill', 'stroke'] as const) {
    const v = str(a[k]);
    if (v) { const h = normHex(v); if (!h) throw new Error(`${k} must be a hex color like #FFD23F`); el[k] = h; }
  }
  if (a.text !== undefined) el.text = str(a.text) ?? '';
  if (a.name !== undefined) el.name = str(a.name) ?? el.name;
  if (a.font !== undefined) { const f = str(a.font) as FontKey; if (!FONT_KEYS.includes(f)) throw new Error('font must be one of ' + FONT_KEYS.join(', ')); el.font = f; }
  if (a.align !== undefined) { const v = str(a.align); if (v === 'left' || v === 'center' || v === 'right') el.align = v; }
  if (a.upper !== undefined) el.upper = bool(a.upper);
  if (a.hidden !== undefined) el.hidden = bool(a.hidden);
  if (a.locked !== undefined) el.locked = bool(a.locked);
  if (a.shadow !== undefined || a.outline !== undefined || a.textBg !== undefined) {
    el.fx = { ...el.fx, ...(a.shadow !== undefined ? { shadow: bool(a.shadow) } : {}), ...(a.outline !== undefined ? { outline: bool(a.outline) } : {}), ...(a.textBg !== undefined ? { bg: bool(a.textBg) } : {}) };
  }
  if (a.anim !== undefined) { const v = str(a.anim); if (v && ['none', 'fade', 'slide', 'zoom', 'pop'].includes(v)) el.anim = v as El['anim']; }
  if (Array.isArray(a.data)) el.data = (a.data as unknown[]).map((r) => (Array.isArray(r) ? [String(r[0]), num(r[1], 0)!] : [String((r as { label?: string }).label ?? ''), num((r as { value?: number }).value, 0)!])) as [string, number][];
  if (Array.isArray(a.rows)) el.rows = (a.rows as unknown[]).map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]));
  if (a.qr !== undefined) el.qr = str(a.qr);
  if (a.kind !== undefined) { const v = str(a.kind); if (v === 'col' || v === 'bar') el.kind = v; }
  if (a.mediaId !== undefined) el.mediaId = str(a.mediaId);
}

const PROPS = {
  x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
  text: { type: 'string' }, size: { type: 'number', description: 'font size in page pixels' }, weight: { type: 'number' },
  color: { type: 'string', description: 'text color hex' }, fill: { type: 'string', description: 'shape/chart color hex' },
  font: { type: 'string', enum: FONT_KEYS }, align: { type: 'string', enum: ['left', 'center', 'right'] },
  upper: { type: 'boolean' }, shadow: { type: 'boolean' }, outline: { type: 'boolean' }, textBg: { type: 'boolean' },
  radius: { type: 'number' }, rot: { type: 'number' }, opacity: { type: 'number' }, name: { type: 'string' },
  anim: { type: 'string', enum: ['none', 'fade', 'slide', 'zoom', 'pop'] }, delay: { type: 'number' },
  data: { type: 'array', description: 'chart rows as [label, value] pairs' },
  rows: { type: 'array', description: 'table cells, array of rows of strings' },
  qr: { type: 'string' }, kind: { type: 'string', enum: ['col', 'bar'] },
  mediaId: { type: 'string', description: 'id of an image from list_media' },
};

export function designTools(t: DataTarget<DesignData>, ctx: { brand: BrandKit; media: () => MediaItem[] }): AgentTool[] {
  const mark = (id: string, what: string) => { t.changed.add(id); t.changes.push(what); };
  return [
    {
      name: 'get_document', write: false,
      description: 'Returns every page (1-based index, size in px, background) and its elements with ids, geometry and style. Call it before editing.',
      run: () => ({ pages: compactDesign(t.read()) }),
    },
    {
      name: 'list_media', write: false,
      description: "Lists the user's local images (id, name, size) that can be placed with add_element type=image and mediaId.",
      run: () => ctx.media().filter((m) => m.kind === 'image').slice(0, 40).map((m) => ({ id: m.id, name: m.name, w: m.w, h: m.h })),
    },
    {
      name: 'add_element', write: true,
      description: 'Adds an element to a page. type: text | rect | circle | line | image | chart | table | qr. Geometry in page pixels (origin top-left). Returns the new id.',
      schema: { page: { type: 'number' }, type: { type: 'string', enum: EL_TYPES }, ...PROPS },
      required: ['page', 'type'],
      run: (a) => {
        let id = '';
        t.write((d) => {
          const p = pageAt(d, a.page);
          const type = str(a.type) as ElType;
          if (!EL_TYPES.includes(type)) throw new Error('Unknown type ' + type);
          const el = newEl({ type, name: str(a.name) ?? type }, p);
          if (type === 'text') Object.assign(el, { text: 'Texte', size: Math.round(p.w * 0.06), weight: 700, color: '#0F1115', lh: 1.1, h: Math.round(p.w * 0.1) });
          if (type === 'rect' || type === 'circle') el.fill = ctx.brand.colors[2] ?? '#FFD23F';
          if (type === 'chart') Object.assign(el, { data: [['A', 3], ['B', 5], ['C', 8]], kind: 'col', fill: ctx.brand.colors[3] ?? '#2E6BFF', color: '#0F1115' });
          if (type === 'table') el.rows = [['Colonne 1', 'Colonne 2'], ['—', '—']];
          if (type === 'qr') { el.qr = 'https://exemple.com'; el.w = el.h = Math.round(Math.min(p.w, p.h) * 0.25); }
          applyProps(el, a);
          p.els.push(el);
          id = el.id;
          mark(el.id, `${type} « ${el.name} » ajouté page ${a.page}`);
        });
        return { id };
      },
    },
    {
      name: 'update_element', write: true,
      description: 'Changes properties of one element by id (only the fields you pass). Colors are hex strings.',
      schema: { id: { type: 'string' }, ...PROPS },
      required: ['id'],
      run: (a) => {
        const id = str(a.id)!;
        t.write((d) => {
          const el = d.pages.flatMap((p) => p.els).find((e) => e.id === id);
          if (!el) throw new Error('No element with id ' + id);
          applyProps(el, a);
          mark(id, `« ${el.name} » modifié (${Object.keys(a).filter((k) => k !== 'id').join(', ')})`);
        });
        return { ok: true };
      },
    },
    {
      name: 'delete_element', write: true,
      description: 'Deletes one element by id.',
      schema: { id: { type: 'string' } }, required: ['id'],
      run: (a) => {
        const id = str(a.id)!;
        t.write((d) => {
          for (const p of d.pages) {
            const i = p.els.findIndex((e) => e.id === id);
            if (i >= 0) { t.changes.push(`« ${p.els[i].name} » supprimé`); p.els.splice(i, 1); return; }
          }
          throw new Error('No element with id ' + id);
        });
        return { ok: true };
      },
    },
    {
      name: 'arrange_element', write: true,
      description: 'Moves an element in the stacking order: front, back, forward or backward.',
      schema: { id: { type: 'string' }, to: { type: 'string', enum: ['front', 'back', 'forward', 'backward'] } }, required: ['id', 'to'],
      run: (a) => {
        const id = str(a.id)!;
        t.write((d) => {
          const p = d.pages.find((pg) => pg.els.some((e) => e.id === id));
          if (!p) throw new Error('No element with id ' + id);
          const i = p.els.findIndex((e) => e.id === id);
          const [el] = p.els.splice(i, 1);
          const to = str(a.to);
          const j = to === 'front' ? p.els.length : to === 'back' ? 0 : to === 'forward' ? Math.min(p.els.length, i + 1) : Math.max(0, i - 1);
          p.els.splice(j, 0, el);
          mark(id, `« ${el.name} » déplacé (${to})`);
        });
        return { ok: true };
      },
    },
    {
      name: 'set_page', write: true,
      description: 'Sets a page background color (hex) and/or its animated-export duration in seconds.',
      schema: { page: { type: 'number' }, bg: { type: 'string' }, dur: { type: 'number' } }, required: ['page'],
      run: (a) => {
        t.write((d) => {
          const p = pageAt(d, a.page);
          if (a.bg !== undefined) { const h = normHex(str(a.bg) ?? ''); if (!h) throw new Error('bg must be hex'); p.bg = h; }
          const dur = num(a.dur);
          if (dur !== undefined) p.dur = Math.max(1, Math.min(60, dur));
          t.changes.push(`Page ${a.page} : fond ${p.bg}`);
        });
        return { ok: true };
      },
    },
    {
      name: 'add_page', write: true,
      description: 'Adds a blank page at the end. Give a format id (' + FORMATS.filter((f) => f.kind === 'design').map((f) => f.id).join(', ') + ') or w and h in px. Returns its 1-based index.',
      schema: { format: { type: 'string' }, w: { type: 'number' }, h: { type: 'number' }, bg: { type: 'string' } },
      run: (a) => {
        let idx = 0;
        t.write((d) => {
          const f = FORMATS.find((x) => x.id === str(a.format));
          const ref = d.pages[d.pages.length - 1];
          const w = f?.w ?? num(a.w) ?? ref?.w ?? 1080, h = f?.h ?? num(a.h) ?? ref?.h ?? 1080;
          d.pages.push({ id: uid('p'), w, h, bg: normHex(str(a.bg) ?? '') ?? '#FFFFFF', els: [] });
          idx = d.pages.length;
          t.changes.push(`Page ${idx} ajoutée (${w}×${h})`);
        });
        return { page: idx };
      },
    },
    {
      name: 'duplicate_page_as_format', write: true,
      description: 'Copies a page into another size (scales and centers content, stretches full-page backgrounds). Use for resizing a design to story, post, etc. Returns the new page index.',
      schema: { page: { type: 'number' }, format: { type: 'string' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['page'],
      run: (a) => {
        let idx = 0;
        t.write((d) => {
          const p = pageAt(d, a.page);
          const f = FORMATS.find((x) => x.id === str(a.format));
          const w = f?.w ?? num(a.w), h = f?.h ?? num(a.h);
          if (!w || !h) throw new Error('Give a format id or w and h');
          const np = resizePage(p, w, h);
          d.pages.push(np);
          np.els.forEach((e) => t.changed.add(e.id));
          idx = d.pages.length;
          t.changes.push(`Page ${a.page} déclinée en ${w}×${h} (page ${idx})`);
        });
        return { page: idx };
      },
    },
    {
      name: 'delete_page', write: true,
      description: 'Deletes a page (the document keeps at least one page).',
      schema: { page: { type: 'number' } }, required: ['page'],
      run: (a) => {
        t.write((d) => {
          if (d.pages.length <= 1) throw new Error('Cannot delete the only page');
          const i = Math.round(num(a.page, 1)!) - 1;
          if (!d.pages[i]) throw new Error('No such page');
          d.pages.splice(i, 1);
          t.changes.push(`Page ${i + 1} supprimée`);
        });
        return { ok: true };
      },
    },
    {
      name: 'check_design', write: false,
      description: 'Checks text contrast against the page background (WCAG) and elements outside the page. Returns a list of issues.',
      schema: { page: { type: 'number' } },
      run: (a) => {
        const d = t.read();
        const pages = a.page ? [pageAt(d, a.page)] : d.pages;
        const issues: string[] = [];
        pages.forEach((p) => {
          const pi = d.pages.indexOf(p) + 1;
          p.els.forEach((e) => {
            if (e.type === 'text' && !e.fx?.bg && !e.fx?.outline) {
              const r = contrast(e.color ?? '#0F1115', p.bg);
              if (r < 4.5) issues.push(`page ${pi}: text "${(e.text ?? '').slice(0, 30)}" (${e.id}) contrast ${r.toFixed(1)}:1 on ${p.bg}`);
            }
            if (e.x + e.w < 0 || e.y + e.h < 0 || e.x > p.w || e.y > p.h) issues.push(`page ${pi}: ${e.name} (${e.id}) is outside the page`);
          });
        });
        return { issues };
      },
    },
  ];
}
