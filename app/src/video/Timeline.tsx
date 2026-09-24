import { useEffect, useRef } from 'react';
import { Film, Layers, Mic, Music, Type, Captions, Scissors, Trash2, Bookmark, ZoomIn, ZoomOut } from 'lucide-react';
import { useT } from '../store/app';
import { useVideo, TRACKS, CLIP_COLORS, duration, V } from './store';
import type { Clip, TrackId } from '../model/types';
import { mmss } from '../lib/util';
import { mediaMetaSync } from '../lib/media';

const ROW = 38, RULER = 22;
const ICONS: Record<string, typeof Film> = { type: Type, layers: Layers, film: Film, mic: Mic, music: Music };

type Drag =
  | { kind: 'move'; id: string; dx0: number; start0: number; track0: TrackId; moved: boolean }
  | { kind: 'trimL' | 'trimR'; id: string; x0: number; orig: Clip }
  | { kind: 'cap'; id: string; dx0: number; orig: { start: number; end: number } }
  | { kind: 'seek' };

export function Timeline({ onSeek }: { onSeek(t: number): void }) {
  const T = useT();
  const data = useVideo((s) => s.view());
  const sel = useVideo((s) => s.sel);
  const selCap = useVideo((s) => s.selCap);
  const pps = useVideo((s) => s.pps);
  const changed = useVideo((s) => s.changed);
  const draft = useVideo((s) => s.draft);
  const locked = useVideo((s) => !!s.draft || s.busy);
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const dur = duration(data);
  const width = Math.max((dur + 10) * pps, 600);

  const timeAt = (clientX: number) => {
    const r = body.current!.getBoundingClientRect();
    return Math.max(0, (clientX - r.left) / useVideo.getState().pps);
  };

  const snap = (t: number, exclude?: string) => {
    const st = useVideo.getState();
    const d = st.data();
    const pts = [0, st.t, ...d.markers, ...d.clips.filter((c) => c.id !== exclude).flatMap((c) => [c.start, c.start + c.dur])];
    const th = 8 / st.pps;
    let best = t, bd = th;
    for (const p of pts) { const dd = Math.abs(p - t); if (dd < bd) { bd = dd; best = p; } }
    return best;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const st = useVideo.getState();
      const t = timeAt(e.clientX);
      if (d.kind === 'seek') { onSeek(t); return; }
      if (d.kind === 'move') {
        const c = st.data().clips.find((x) => x.id === d.id);
        if (!c) return;
        let start = Math.max(0, t - d.dx0);
        const a = snap(start, d.id);
        const b = snap(start + c.dur, d.id) - c.dur;
        start = Math.abs(a - start) <= Math.abs(b - start) ? a : b;
        // Row under the pointer decides the track, if it accepts this clip kind.
        const r = body.current!.getBoundingClientRect();
        const row = Math.floor((e.clientY - r.top - RULER) / ROW);
        const tr = TRACKS[row];
        const track = tr && tr.accepts.includes(c.kind) ? tr.id : c.track;
        if (!d.moved && Math.abs(start - d.start0) * st.pps < 3 && track === d.track0) return;
        d.moved = true;
        st.live((x) => { const cc = x.clips.find((q) => q.id === d.id)!; cc.start = Math.round(Math.max(0, start) * 100) / 100; cc.track = track; });
      } else if (d.kind === 'trimL') {
        const o = d.orig;
        const sp = o.speed ?? 1;
        let ns = snap(Math.max(0, t), o.id);
        ns = Math.min(ns, o.start + o.dur - 0.1);
        let nin = o.in + (ns - o.start) * sp;
        if (nin < 0 && o.kind !== 'image' && o.kind !== 'text') { ns = o.start - o.in / sp; nin = 0; }
        if (o.kind === 'image' || o.kind === 'text') nin = 0;
        st.live((x) => { const cc = x.clips.find((q) => q.id === o.id)!; cc.start = Math.round(ns * 100) / 100; cc.dur = Math.round((o.start + o.dur - ns) * 100) / 100; cc.in = Math.max(0, nin); });
      } else if (d.kind === 'trimR') {
        const o = d.orig;
        let ne = snap(t, o.id);
        ne = Math.max(o.start + 0.1, ne);
        const src = mediaMetaSync(o.mediaId)?.duration;
        if (src && (o.kind === 'video' || o.kind === 'audio')) ne = Math.min(ne, o.start + (src - o.in) / (o.speed ?? 1));
        st.live((x) => { const cc = x.clips.find((q) => q.id === o.id)!; cc.dur = Math.round((ne - o.start) * 100) / 100; });
      } else if (d.kind === 'cap') {
        const len = d.orig.end - d.orig.start;
        const s = Math.max(0, snap(t - d.dx0));
        st.live((x) => { const k = x.captions.find((q) => q.id === d.id); if (k) { k.start = Math.round(s * 100) / 100; k.end = Math.round((s + len) * 100) / 100; } });
      }
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      if (d && d.kind !== 'seek') {
        const st = useVideo.getState();
        st.end();
        if (d.kind === 'cap') st.live((x) => { x.captions.sort((a, b) => a.start - b.start); });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clipDown = (e: React.PointerEvent, c: Clip, kind: 'move' | 'trimL' | 'trimR') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const st = useVideo.getState();
    st.select(c.id);
    if (locked) return;
    st.begin();
    if (kind === 'move') drag.current = { kind, id: c.id, dx0: timeAt(e.clientX) - c.start, start0: c.start, track0: c.track, moved: false };
    else drag.current = { kind, id: c.id, x0: e.clientX, orig: { ...c } };
  };

  const tickStep = pps > 120 ? 1 : pps > 50 ? 2 : pps > 20 ? 5 : pps > 8 ? 10 : 30;
  const ticks: number[] = [];
  for (let s = 0; s <= dur + 10; s += tickStep) ticks.push(s);

  const tools = [
    { l: T('Scinder', 'Split'), k: 'S', I: Scissors, go: () => { const st = useVideo.getState(); if (st.sel && !V.split(st.sel, st.t)) { /* playhead outside */ } } },
    { l: T('Supprimer', 'Delete'), k: T('Suppr', 'Del'), I: Trash2, go: () => { const st = useVideo.getState(); if (st.sel) V.remove(st.sel); } },
    { l: T('Marqueur', 'Marker'), k: 'M', I: Bookmark, go: () => V.marker(useVideo.getState().t) },
  ];

  return (
    <section style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)', display: 'grid', gridTemplateRows: '34px minmax(0,1fr)', minHeight: 0 }}>
      <div className="row" style={{ gap: 6, padding: '0 10px', borderBottom: '1px solid var(--line)' }}>
        {tools.map((x) => (
          <button key={x.k} className="btn sm" disabled={locked || ((x.k === 'S' || x.k.startsWith('Suppr') || x.k === 'Del') && !sel)} onClick={x.go}>
            <x.I size={12} />{x.l} <span className="mono faint" style={{ fontSize: 10 }}>{x.k}</span>
          </button>
        ))}
        {draft && <span className="acc" style={{ marginLeft: 10, fontSize: 11 }}>{T("Proposition de l'assistant · contours pointillés = changements", "Assistant's proposal · dashed outlines = changes")}</span>}
        <div className="grow" />
        <button className="btn bare icon" onClick={() => useVideo.getState().setPps(pps / 1.5)} title={T('Dézoomer', 'Zoom out')}><ZoomOut size={14} /></button>
        <button className="btn bare icon" onClick={() => useVideo.getState().setPps(pps * 1.5)} title={T('Zoomer', 'Zoom in')}><ZoomIn size={14} /></button>
        <span className="mono muted" style={{ fontSize: 11 }}>{mmss(dur)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '128px minmax(0,1fr)', minHeight: 0, overflow: 'auto' }}>
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', position: 'sticky', left: 0, background: 'var(--panel)', zIndex: 3 }}>
          <div style={{ height: RULER, borderBottom: '1px solid var(--line)', flex: 'none' }} />
          {TRACKS.map((tr) => {
            const I = ICONS[tr.icon];
            return <div key={tr.id} className="row muted" style={{ height: ROW, flex: 'none', padding: '0 10px', borderBottom: '1px solid var(--line)', fontSize: 11, gap: 6 }}><I size={12} color="var(--tx3)" />{T(tr.fr, tr.en)}</div>;
          })}
          <div className="row muted" style={{ height: ROW, flex: 'none', padding: '0 10px', borderBottom: '1px solid var(--line)', fontSize: 11, gap: 6 }}><Captions size={12} color="var(--tx3)" />{T('Sous-titres', 'Captions')}</div>
        </div>
        <div ref={scroller} style={{ minWidth: 0 }} onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); useVideo.getState().setPps(pps * (e.deltaY < 0 ? 1.15 : 0.87)); } }}>
          <div ref={body} style={{ position: 'relative', width }}>
            <div onPointerDown={(e) => { drag.current = { kind: 'seek' }; onSeek(timeAt(e.clientX)); }} style={{ height: RULER, position: 'relative', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              {ticks.map((s) => <div key={s} className="mono" style={{ position: 'absolute', top: 0, bottom: 0, left: s * pps, borderLeft: '1px solid var(--line2)', paddingLeft: 4, fontSize: 9, color: 'var(--tx3)', lineHeight: `${RULER}px`, pointerEvents: 'none' }}>{mmss(s)}</div>)}
              {data.markers.map((m) => <div key={m} title={mmss(m)} style={{ position: 'absolute', top: 11, left: m * pps, width: 8, height: 8, marginLeft: -4, background: '#FFD23F', transform: 'rotate(45deg)', pointerEvents: 'none' }} />)}
            </div>
            {TRACKS.map((tr) => (
              <div key={tr.id} style={{ height: ROW, position: 'relative', borderBottom: '1px solid var(--line)' }} onPointerDown={(e) => { if (e.target === e.currentTarget) { useVideo.getState().select(null); onSeek(timeAt(e.clientX)); } }}>
                {data.clips.filter((c) => c.track === tr.id).map((c) => (
                  <div key={c.id} onPointerDown={(e) => clipDown(e, c, 'move')} title={c.name}
                    style={{
                      position: 'absolute', top: 4, bottom: 4, left: c.start * pps, width: Math.max(4, c.dur * pps), background: CLIP_COLORS[c.track], borderRadius: 4,
                      outline: changed.includes(c.id) ? '2px dashed #FFFFFF' : sel === c.id ? '2px solid #FFFFFF' : undefined, outlineOffset: -1,
                      color: '#fff', fontSize: 10, padding: '0 8px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', cursor: locked ? 'default' : 'grab', userSelect: 'none', touchAction: 'none',
                    }}>
                    {c.trIn ? '◧ ' : ''}{c.kind === 'text' ? '“' + (c.text ?? '') + '”' : c.name}{c.fx && (c.fx.filter || c.fx.blur || c.fx.glow || c.fx.vignette || c.fx.bri || c.fx.con || c.fx.sat || c.fx.temp) ? ' · fx' : ''}{c.speed && c.speed !== 1 ? ` · ${c.speed}×` : ''}
                    {!locked && <>
                      <span onPointerDown={(e) => clipDown(e, c, 'trimL')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, cursor: 'ew-resize', background: 'rgba(255,255,255,.22)' }} />
                      <span onPointerDown={(e) => clipDown(e, c, 'trimR')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 7, cursor: 'ew-resize', background: 'rgba(255,255,255,.22)' }} />
                    </>}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ height: ROW, position: 'relative', borderBottom: '1px solid var(--line)' }}>
              {data.captions.map((k) => (
                <div key={k.id} title={k.text}
                  onPointerDown={(e) => { e.stopPropagation(); const st = useVideo.getState(); st.selectCap(k.id); onSeek(k.start); if (!locked) { st.begin(); drag.current = { kind: 'cap', id: k.id, dx0: timeAt(e.clientX) - k.start, orig: { start: k.start, end: k.end } }; } }}
                  style={{ position: 'absolute', top: 6, bottom: 6, left: k.start * pps, width: Math.max(3, (k.end - k.start) * pps - 1), background: '#64D2FF', color: '#0F1115', borderRadius: 4, fontSize: 9, padding: '0 5px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', outline: selCap === k.id ? '2px solid #FFFFFF' : undefined, outlineOffset: -1, cursor: 'grab', touchAction: 'none' }}>
                  {k.text}
                </div>
              ))}
            </div>
            <Playhead pps={pps} scroller={scroller} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Playhead({ pps, scroller }: { pps: number; scroller: React.RefObject<HTMLDivElement> }) {
  const t = useVideo((s) => s.t);
  const playing = useVideo((s) => s.playing);
  useEffect(() => {
    const sc = scroller.current?.parentElement;
    if (!playing || !sc) return;
    const x = t * pps + 128;
    if (x > sc.scrollLeft + sc.clientWidth - 40 || x < sc.scrollLeft + 128) sc.scrollLeft = x - 200;
  }, [t, pps, playing, scroller]);
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: t * pps, width: 1, background: 'var(--accTx)', pointerEvents: 'none', zIndex: 2 }}>
      <div style={{ position: 'absolute', top: 0, left: -5, width: 11, height: 10, background: 'var(--accTx)', clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />
    </div>
  );
}
