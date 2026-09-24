import { useEffect, useRef, useState } from 'react';
import type { El, Page } from '../model/types';
import { ElementView } from './ElementView';
import { useDesign } from './store';
import { fontCss } from '../model/fonts';
import { addImageFromMedia, setImageMedia } from './actions';
import { importFiles } from '../lib/media';
import { useApp, tNow } from '../store/app';

type Drag =
  | { kind: 'move'; start: { x: number; y: number }; orig: Map<string, { x: number; y: number }>; moved: boolean }
  | { kind: 'resize'; id: string; hx: number; hy: number; start: { x: number; y: number }; orig: El; ratio: boolean }
  | { kind: 'rotate'; id: string; c: { x: number; y: number } }
  | { kind: 'marquee'; start: { x: number; y: number }; cur: { x: number; y: number }; add: boolean };

const HANDLES: [number, number, string][] = [
  [-1, -1, 'nwse-resize'], [1, -1, 'nesw-resize'], [1, 1, 'nwse-resize'], [-1, 1, 'nesw-resize'],
  [1, 0, 'ew-resize'], [-1, 0, 'ew-resize'], [0, -1, 'ns-resize'], [0, 1, 'ns-resize'],
];

export function Canvas({ page, readOnly, changed, commentMode, onCanvasClick, children }: {
  page: Page;
  readOnly?: boolean;
  changed?: string[];
  commentMode?: boolean;
  onCanvasClick?: (p: { x: number; y: number }) => void;
  children?: React.ReactNode;
}) {
  const sel = useDesign((s) => s.sel);
  const guides = useDesign((s) => s.guides);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState(false);

  useEffect(() => { setEditing(null); }, [page.id]);

  const toPage = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current!.getBoundingClientRect();
    const s = r.width / page.w;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s, s };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const p = toPage(e);
      const st = useDesign.getState();
      if (d.kind === 'move') {
        let dx = p.x - d.start.x, dy = p.y - d.start.y;
        if (!d.moved && Math.hypot(dx, dy) * p.s < 3) return;
        d.moved = true;
        // Snap the selection's box to the page center and edges.
        const ids = [...d.orig.keys()];
        const els = st.page().els.filter((x) => ids.includes(x.id));
        const bx = Math.min(...els.map((x) => d.orig.get(x.id)!.x)) + dx;
        const by = Math.min(...els.map((x) => d.orig.get(x.id)!.y)) + dy;
        const bw = Math.max(...els.map((x) => d.orig.get(x.id)!.x + x.w)) - Math.min(...els.map((x) => d.orig.get(x.id)!.x));
        const bh = Math.max(...els.map((x) => d.orig.get(x.id)!.y + x.h)) - Math.min(...els.map((x) => d.orig.get(x.id)!.y));
        const th = 7 / p.s;
        let gv = false, gh = false;
        if (!e.altKey) {
          const cx = bx + bw / 2, cy = by + bh / 2;
          if (Math.abs(cx - page.w / 2) < th) { dx += page.w / 2 - cx; gv = true; }
          else if (Math.abs(bx) < th) dx -= bx;
          else if (Math.abs(bx + bw - page.w) < th) dx += page.w - (bx + bw);
          if (Math.abs(cy - page.h / 2) < th) { dy += page.h / 2 - cy; gh = true; }
          else if (Math.abs(by) < th) dy -= by;
          else if (Math.abs(by + bh - page.h) < th) dy += page.h - (by + bh);
        }
        if (gv !== st.guides.v || gh !== st.guides.h) st.setGuides({ v: gv, h: gh });
        st.live((data) => {
          const pg = data.pages[st.pageIdx];
          for (const el of pg.els) {
            const o = d.orig.get(el.id);
            if (o) { el.x = Math.round(o.x + dx); el.y = Math.round(o.y + dy); }
          }
        });
      } else if (d.kind === 'resize') {
        const o = d.orig;
        const a = ((o.rot ?? 0) * Math.PI) / 180;
        const wx = p.x - d.start.x, wy = p.y - d.start.y;
        const lx = wx * Math.cos(-a) - wy * Math.sin(-a);
        const ly = wx * Math.sin(-a) + wy * Math.cos(-a);
        let w = Math.max(8, o.w + d.hx * lx);
        let h = Math.max(8, o.h + d.hy * ly);
        const corner = d.hx !== 0 && d.hy !== 0;
        if (corner && (e.shiftKey || d.ratio)) {
          const k = Math.max(w / o.w, h / o.h);
          w = Math.max(8, o.w * k); h = Math.max(8, o.h * k);
        }
        const dw = (w - o.w) * (d.hx === 0 ? 0 : 1), dh = (h - o.h) * (d.hy === 0 ? 0 : 1);
        const scx = (d.hx * dw) / 2, scy = (d.hy * dh) / 2;
        const cx = o.x + o.w / 2 + scx * Math.cos(a) - scy * Math.sin(a);
        const cy = o.y + o.h / 2 + scx * Math.sin(a) + scy * Math.cos(a);
        st.live((data) => {
          const el = data.pages[st.pageIdx].els.find((x) => x.id === d.id);
          if (!el) return;
          el.w = Math.round(o.w + dw); el.h = Math.round(o.h + dh);
          el.x = Math.round(cx - el.w / 2); el.y = Math.round(cy - el.h / 2);
          if (el.type === 'text' && corner && o.size) el.size = Math.max(4, Math.round(o.size * (el.w / o.w) * 10) / 10);
        });
      } else if (d.kind === 'rotate') {
        let ang = (Math.atan2(p.y - d.c.y, p.x - d.c.x) * 180) / Math.PI + 90;
        if (e.shiftKey) ang = Math.round(ang / 15) * 15;
        ang = ((Math.round(ang) % 360) + 360) % 360;
        if (ang > 180) ang -= 360;
        st.live((data) => {
          const el = data.pages[st.pageIdx].els.find((x) => x.id === d.id);
          if (el) el.rot = Math.abs(ang) < 2 ? 0 : ang;
        });
      } else if (d.kind === 'marquee') {
        d.cur = { x: p.x, y: p.y };
        setMarquee({ x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) });
      }
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      const st = useDesign.getState();
      if (!d) return;
      if (d.kind === 'marquee') {
        const r = { x: Math.min(d.start.x, d.cur.x), y: Math.min(d.start.y, d.cur.y), r: Math.max(d.start.x, d.cur.x), b: Math.max(d.start.y, d.cur.y) };
        if (r.r - r.x > 4 || r.b - r.y > 4) {
          const hits = st.page().els.filter((x) => !x.hidden && !x.locked && x.x < r.r && x.x + x.w > r.x && x.y < r.b && x.y + x.h > r.y).map((x) => x.id);
          st.select(d.add ? [...new Set([...st.sel, ...hits])] : hits);
        }
        setMarquee(null);
        return;
      }
      st.setGuides({ v: false, h: false });
      st.end();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.w, page.h]);

  const onElDown = (e: React.PointerEvent, el: El) => {
    if (readOnly || commentMode) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    const st = useDesign.getState();
    let ids = st.sel;
    if (e.shiftKey) {
      ids = ids.includes(el.id) ? ids.filter((x) => x !== el.id) : [...ids, el.id];
      st.select(ids);
      return;
    }
    if (!ids.includes(el.id)) { st.select([el.id]); ids = useDesign.getState().sel; }
    if (editing && editing !== el.id) setEditing(null);
    const els = st.page().els.filter((x) => ids.includes(x.id) && !x.locked);
    if (!els.length) return;
    const p = toPage(e);
    st.begin();
    drag.current = { kind: 'move', start: { x: p.x, y: p.y }, orig: new Map(els.map((x) => [x.id, { x: x.x, y: x.y }])), moved: false };
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (commentMode && onCanvasClick) { const p = toPage(e); onCanvasClick({ x: p.x, y: p.y }); return; }
    if (readOnly || e.button !== 0) return;
    const p = toPage(e);
    if (!e.shiftKey) useDesign.getState().select([]);
    setEditing(null);
    drag.current = { kind: 'marquee', start: { x: p.x, y: p.y }, cur: { x: p.x, y: p.y }, add: e.shiftKey };
  };

  const single = sel.length === 1 ? page.els.find((x) => x.id === sel[0]) : undefined;
  const selEls = page.els.filter((x) => sel.includes(x.id));

  const startResize = (e: React.PointerEvent, hx: number, hy: number) => {
    if (!single) return;
    e.stopPropagation();
    const p = toPage(e);
    useDesign.getState().begin();
    drag.current = { kind: 'resize', id: single.id, hx, hy, start: { x: p.x, y: p.y }, orig: { ...single }, ratio: single.type === 'image' || single.type === 'circle' || single.type === 'qr' };
  };
  const startRotate = (e: React.PointerEvent) => {
    if (!single) return;
    e.stopPropagation();
    useDesign.getState().begin();
    drag.current = { kind: 'rotate', id: single.id, c: { x: single.x + single.w / 2, y: single.y + single.h / 2 } };
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHint(false);
    if (readOnly || !e.dataTransfer.files.length) return;
    const p = toPage(e);
    const { ok } = await importFiles(e.dataTransfer.files);
    const imgs = ok.filter((m) => m.kind === 'image');
    if (!imgs.length) { useApp.getState().notify(tNow('Dépose une image (PNG, JPG, WebP, SVG).', 'Drop an image (PNG, JPG, WebP, SVG).'), 'err'); return; }
    const target = page.els.slice().reverse().find((x) => x.type === 'image' && !x.locked && p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h);
    if (target) setImageMedia(target.id, imgs[0]);
    else imgs.forEach((m, i) => addImageFromMedia(m, { x: p.x + i * 30, y: p.y + i * 30 }));
  };

  const editEl = editing ? page.els.find((x) => x.id === editing) : undefined;
  const pctX = (v: number) => `${(v / page.w) * 100}%`;
  const pctY = (v: number) => `${(v / page.h) * 100}%`;

  return (
    <div
      ref={boxRef}
      onPointerDown={onBgDown}
      onDragOver={(e) => { e.preventDefault(); if (!readOnly) setDropHint(true); }}
      onDragLeave={() => setDropHint(false)}
      onDrop={onDrop}
      style={{
        position: 'relative', width: `min(100cqw, calc(100cqh * ${page.w / page.h}))`, aspectRatio: `${page.w}/${page.h}`,
        background: page.bg, containerType: 'inline-size', boxShadow: '0 0 0 1px var(--line2), 0 12px 40px rgba(0,0,0,.25)',
        cursor: commentMode ? 'crosshair' : undefined,
        outline: dropHint ? '2px dashed var(--acc)' : undefined, outlineOffset: 4,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', containerType: 'inline-size' }}>
        {page.els.map((el) => (
          <div key={el.id} onDoubleClick={() => { if (!readOnly && el.type === 'text' && !el.locked) setEditing(el.id); }} style={{ display: 'contents' }}>
            <ElementView
              el={el}
              page={page}
              dim={editing === el.id}
              outline={changed?.includes(el.id) ? '2px dashed var(--accTx)' : sel.includes(el.id) ? `1.5px solid ${el.locked ? 'var(--tx3)' : 'var(--acc)'}` : undefined}
              onPointerDown={(e) => onElDown(e, el)}
            />
          </div>
        ))}
      </div>
      {editEl && (
        <textarea
          id="inline-text-editor"
          autoFocus
          value={editEl.text ?? ''}
          onPointerDown={(e) => e.stopPropagation()}
          onFocus={(e) => { useDesign.getState().begin(); e.currentTarget.select(); }}
          onChange={(e) => {
            const v = e.target.value;
            const st = useDesign.getState();
            st.live((d) => { const x = d.pages[st.pageIdx].els.find((q) => q.id === editEl.id); if (x) x.text = v; });
          }}
          onBlur={() => { useDesign.getState().end(); setEditing(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); e.stopPropagation(); }}
          style={{
            position: 'absolute', left: pctX(editEl.x), top: pctY(editEl.y), width: pctX(editEl.w), minHeight: pctY(editEl.h), zIndex: 6,
            transform: editEl.rot ? `rotate(${editEl.rot}deg)` : undefined, background: 'rgba(10,132,255,.08)', border: 0, outline: '1.5px solid var(--acc)',
            padding: 0, margin: 0, resize: 'none', overflow: 'hidden', color: editEl.color, fontFamily: fontCss(editEl.font),
            fontSize: `${((editEl.size ?? 48) / page.w) * 100}cqw`, fontWeight: editEl.weight ?? 700, lineHeight: editEl.lh ?? 1.1,
            letterSpacing: '-.01em', textAlign: editEl.align ?? 'left', textTransform: editEl.upper ? 'uppercase' : undefined,
          }}
        />
      )}
      {!readOnly && single && !single.locked && !editing && (
        <div style={{ position: 'absolute', left: pctX(single.x), top: pctY(single.y), width: pctX(single.w), height: pctY(single.h), transform: single.rot ? `rotate(${single.rot}deg)` : undefined, pointerEvents: 'none', zIndex: 5 }}>
          {HANDLES.filter(([hx, hy]) => !(single.type === 'text' && hy !== 0 && hx === 0)).map(([hx, hy, cur]) => (
            <div key={`${hx}${hy}`} className="handle" onPointerDown={(e) => startResize(e, hx, hy)} style={{ left: `${((hx + 1) / 2) * 100}%`, top: `${((hy + 1) / 2) * 100}%`, cursor: cur, pointerEvents: 'auto', borderRadius: hx && hy ? 3 : 6 }} />
          ))}
          <div className="rot-handle" onPointerDown={startRotate} title={tNow('Pivoter (Maj : par 15°)', 'Rotate (Shift: 15° steps)')} style={{ left: '50%', top: -26, pointerEvents: 'auto' }} />
        </div>
      )}
      {!readOnly && sel.length > 1 && selEls.length > 1 && (() => {
        const x = Math.min(...selEls.map((q) => q.x)), y = Math.min(...selEls.map((q) => q.y));
        const r = Math.max(...selEls.map((q) => q.x + q.w)), b = Math.max(...selEls.map((q) => q.y + q.h));
        return <div style={{ position: 'absolute', left: pctX(x), top: pctY(y), width: pctX(r - x), height: pctY(b - y), outline: '1px dashed var(--acc)', outlineOffset: 4, pointerEvents: 'none' }} />;
      })()}
      {marquee && <div style={{ position: 'absolute', left: pctX(marquee.x), top: pctY(marquee.y), width: pctX(marquee.w), height: pctY(marquee.h), background: 'rgba(10,132,255,.12)', border: '1px solid var(--acc)', pointerEvents: 'none' }} />}
      {guides.v && <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#FF3DA5', pointerEvents: 'none' }} />}
      {guides.h && <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#FF3DA5', pointerEvents: 'none' }} />}
      {children}
    </div>
  );
}
