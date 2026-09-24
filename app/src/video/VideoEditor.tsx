import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2, Redo2, History, Download, Play, Pause, CloudCheck, FolderOpen, Type, Music, Captions as CapIcon, Sparkles, ArrowLeftRight, SlidersHorizontal, Camera, Plus, Upload, SkipBack, LayoutGrid } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { useVideo, V, newClip, freeTrack, trackEnd, duration, defaultFx, videoSnapshot, fmtDur } from './store';
import { Engine } from './engine';
import { Timeline } from './Timeline';
import { getDoc, createDoc, patchDoc } from '../lib/docs';
import { importBlob, importFiles, preload } from '../lib/media';
import type { Clip, ClipFx, FontKey, MediaItem, VideoData } from '../model/types';
import { Composer, useAgentRun } from '../agent/Composer';
import { videoHost, setVideoMedia } from './host';
import { useImages } from '../design/LeftPanel';
import { Chips, LogoMark, Modal, Progress, Switch } from '../ui/kit';
import { VersionsPanel } from '../ui/Versions';
import { parseSubtitles, toSrt, toVtt, textToCaptions } from './captions';
import { saveFile } from '../lib/claude';
import { recordCanvas, bestVideoMime, canRecord } from '../lib/record';
import { tc, uid, slug } from '../lib/util';
import { FONTS, FONT_KEYS } from '../model/fonts';
import { canvasBlob } from '../design/render';
import { notify as pushNotif } from '../lib/notify';

type LTab = 'media' | 'text' | 'audio' | 'captions' | 'effects' | 'transitions' | 'filters';
const LTABS: { id: LTab; fr: string; en: string; c: string; I: typeof Type }[] = [
  { id: 'media', fr: 'Médias', en: 'Media', c: '#FF9F0A', I: FolderOpen },
  { id: 'text', fr: 'Texte', en: 'Text', c: '#0A84FF', I: Type },
  { id: 'audio', fr: 'Audio', en: 'Audio', c: '#FF375F', I: Music },
  { id: 'captions', fr: 'Sous-titres', en: 'Captions', c: '#64D2FF', I: CapIcon },
  { id: 'effects', fr: 'Effets', en: 'Effects', c: '#BF5AF2', I: Sparkles },
  { id: 'transitions', fr: 'Transitions', en: 'Transitions', c: '#30D158', I: ArrowLeftRight },
  { id: 'filters', fr: 'Filtres', en: 'Filters', c: '#FFD60A', I: SlidersHorizontal },
];

let engine: Engine | null = null;
export const seekTo = (t: number) => { engine?.seek(t); useVideo.getState().setT(engine?.t ?? t); };
const togglePlay = () => {
  if (!engine) return;
  if (engine.playing) { engine.pause(); useVideo.getState().setPlaying(false); }
  else { engine.play(); useVideo.getState().setPlaying(true); }
};

export function VideoEditor() {
  const T = useT();
  const docId = useApp((s) => s.docId);
  const go = useApp((s) => s.go);
  const notify = useApp((s) => s.notify);
  const pending = useApp((s) => s.pendingPrompt);
  const doc = useVideo((s) => s.doc);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<LTab>('media');
  const [right, setRight] = useState<'insp' | 'agent'>(pending ? 'agent' : 'insp');
  const [dialog, setDialog] = useState<null | 'export' | 'versions' | 'rec-webcam' | 'rec-screen' | 'rec-mic'>(null);
  const media = useImages();
  useEffect(() => { setVideoMedia(media); }, [media]);
  useEffect(() => { if (pending) setRight('agent'); }, [pending]);

  useEffect(() => {
    let alive = true;
    setReady(false);
    void (async () => {
      if (!docId) { go('home'); return; }
      const d = await getDoc<VideoData>(docId);
      if (!alive) return;
      if (!d) { notify(T('Document introuvable.', 'Document not found.'), 'err'); go('home'); return; }
      await preload(d.data.clips.map((c) => c.mediaId));
      useVideo.getState().load(d);
      setReady(true);
    })();
    return () => { alive = false; useVideo.getState().flush(); engine?.destroy(); engine = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    let last = useVideo.getState().doc?.data;
    const t = setInterval(() => { const d = useVideo.getState().doc?.data; if (d && d !== last) { last = d; void videoSnapshot('autosave', 'Autosave'); } }, 300_000);
    return () => clearInterval(t);
  }, [docId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
      const st = useVideo.getState();
      if (!st.doc || dialog === 'export') return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); togglePlay(); return; }
      if (st.draft || st.busy) return;
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); st.redo(); return; }
      if (!mod && k === 's') { if (st.sel && !V.split(st.sel, st.t)) notify(T('Place la tête de lecture sur le clip sélectionné pour le scinder.', 'Put the playhead over the selected clip to split it.'), 'info'); return; }
      if (!mod && k === 'm') { V.marker(st.t); return; }
      if (k === 'delete' || k === 'backspace') {
        if (st.sel) { e.preventDefault(); V.remove(st.sel); }
        else if (st.selCap) { e.preventDefault(); const id = st.selCap; st.apply((d) => { d.captions = d.captions.filter((c) => c.id !== id); }); }
        return;
      }
      if (k === 'arrowleft') { e.preventDefault(); seekTo(st.t - (e.shiftKey ? 1 : 1 / 30)); }
      if (k === 'arrowright') { e.preventDefault(); seekTo(st.t + (e.shiftKey ? 1 : 1 / 30)); }
      if (k === 'home') seekTo(0);
      if (k === 'escape') st.select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, notify, T]);

  const host = useMemo(() => videoHost(), []);
  if (!ready || !doc) return <div className="row faint" style={{ height: '100%', justifyContent: 'center' }}><span className="pulse" />{T('Ouverture…', 'Opening…')}</div>;

  return (
    <div style={{ height: '100%', overflow: 'auto', position: 'relative' }}>
      {window.innerWidth < 1100 && <div style={{ position: 'sticky', left: 0, top: 0, zIndex: 30, padding: '8px 12px', background: 'var(--accSoft)', color: 'var(--accTx)', fontSize: 12, borderBottom: '1px solid var(--line)' }}>{T('Écran étroit : la timeline complète demande au moins 1 100 px. Fais défiler horizontalement.', 'Narrow screen: the full timeline needs at least 1,100 px. Scroll sideways.')}</div>}
      <div style={{ display: 'grid', gridTemplateRows: '48px minmax(0,1fr) minmax(200px,290px)', height: '100%', minHeight: 640, minWidth: 1100 }}>
        <Header onDialog={setDialog} />
        <div style={{ display: 'grid', gridTemplateColumns: '64px 250px minmax(0,1fr) 330px', minHeight: 0 }}>
          <div className="rail">
            {LTABS.map((x) => (
              <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}>
                <span className="ic" style={{ background: tab === x.id ? x.c : `color-mix(in oklab, ${x.c} 16%, transparent)` }}><x.I size={17} color={tab === x.id ? '#fff' : x.c} /></span>
                {T(x.fr, x.en)}
              </button>
            ))}
          </div>
          <div className="side">
            <div style={{ padding: '12px 12px 8px', fontWeight: 600 }}>{T(LTABS.find((x) => x.id === tab)!.fr, LTABS.find((x) => x.id === tab)!.en)}</div>
            <div className="side-b">
              {tab === 'media' && <MediaTab media={media} onRec={(k) => setDialog(k)} kinds={['video', 'image']} />}
              {tab === 'audio' && <MediaTab media={media} kinds={['audio']} />}
              {tab === 'text' && <TextTab />}
              {tab === 'captions' && <CaptionsTab />}
              {tab === 'effects' && <LookTab kind="effects" />}
              {tab === 'transitions' && <LookTab kind="transitions" />}
              {tab === 'filters' && <LookTab kind="filters" />}
            </div>
          </div>
          <Preview />
          <aside style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div className="tabs">
              <button className={right === 'insp' ? 'on' : ''} onClick={() => setRight('insp')}><SlidersHorizontal size={14} />{T('Inspecteur', 'Inspector')}</button>
              <button className={right === 'agent' ? 'on' : ''} onClick={() => setRight('agent')}><Sparkles size={14} />{T('Assistant', 'Assistant')}</button>
            </div>
            <div style={{ display: right === 'insp' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'auto' }}><Inspector /></div>
            <div style={{ display: right === 'agent' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, flex: 1 }}><Composer host={host} autoPrompt={pending} /></div>
          </aside>
        </div>
        <Timeline onSeek={seekTo} />
      </div>
      {dialog === 'export' && <ExportVideo onClose={() => setDialog(null)} />}
      {dialog === 'versions' && <VersionsPanel doc={doc} onClose={() => setDialog(null)} onRestore={(d) => useVideo.getState().apply((x) => { Object.assign(x, d as VideoData); })} />}
      {dialog?.startsWith('rec-') && <RecordDialog kind={dialog.slice(4) as 'webcam' | 'screen' | 'mic'} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Header({ onDialog }: { onDialog(d: 'export' | 'versions'): void }) {
  const T = useT();
  const go = useApp((s) => s.go);
  const lang = useApp((s) => s.lang);
  const toggleLang = useApp((s) => s.toggleLang);
  const doc = useVideo((s) => s.doc)!;
  const past = useVideo((s) => s.past.length);
  const future = useVideo((s) => s.future.length);
  const locked = useVideo((s) => !!s.draft || s.busy);
  return (
    <header className="ed-header">
      <button className="logo-btn" onClick={() => { engine?.pause(); go('home'); }} title={T('Accueil', 'Home')}><LogoMark /></button>
      <button className="btn bare" style={{ height: 30, padding: '0 8px', flex: 'none' }} onClick={() => useApp.getState().set({ palOpen: true })} title={T('Aller à… (⌘K)', 'Go to… (⌘K)')}><LayoutGrid size={14} /><span className="mono" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: 'var(--panel2)', color: 'var(--tx3)' }}>⌘K</span></button>
      <div className="col" style={{ lineHeight: 1.2, minWidth: 0 }}>
        <input id="vdoc-name" value={doc.name} onChange={(e) => useVideo.getState().rename(e.target.value)} style={{ fontWeight: 600, border: 0, background: 'transparent', outline: 'none', padding: 0, width: 240 }} />
        <span className="faint row" style={{ fontSize: 11, gap: 4 }}><CloudCheck size={11} color="var(--accTx)" />{T('Enregistré · sur cet appareil', 'Saved · on this device')}</span>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--line2)', margin: '0 4px' }} />
      <button className="btn icon" disabled={!past || locked} onClick={() => useVideo.getState().undo()} title={T('Annuler (⌘Z)', 'Undo (⌘Z)')}><Undo2 size={14} /></button>
      <button className="btn icon" disabled={!future || locked} onClick={() => useVideo.getState().redo()} title={T('Rétablir (⌘⇧Z)', 'Redo (⌘⇧Z)')}><Redo2 size={14} /></button>
      <span className="mono muted" style={{ height: 28, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', display: 'inline-flex', alignItems: 'center', fontSize: 11 }}>{doc.data.w}×{doc.data.h} · 30 fps</span>
      <div className="grow" />
      <button className="btn" style={{ height: 28 }} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
      <button className="btn" style={{ height: 28 }} onClick={() => onDialog('versions')}><History size={13} />{T('Versions', 'Versions')}</button>
      <button className="btn primary" style={{ height: 28 }} onClick={() => { engine?.pause(); useVideo.getState().setPlaying(false); onDialog('export'); }}><Download size={13} />{T('Exporter', 'Export')}</button>
    </header>
  );
}

function Preview() {
  const T = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useVideo((s) => s.view());
  const t = useVideo((s) => s.t);
  const playing = useVideo((s) => s.playing);
  const draft = useVideo((s) => s.draft);
  const busy = useVideo((s) => s.busy);
  const running = useAgentRun((s) => s.running);
  const notify = useApp((s) => s.notify);
  const go = useApp((s) => s.go);
  const [safe, setSafe] = useState(false);
  const [drop, setDrop] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    engine = new Engine(canvasRef.current, useVideo.getState().view());
    engine.onTime = (x) => useVideo.getState().setT(x);
    engine.onEnd = () => useVideo.getState().setPlaying(false);
    engine.seek(useVideo.getState().t);
    return () => { saveThumb(); engine?.destroy(); engine = null; };
  }, []);
  useEffect(() => {
    engine?.setData(view);
    const t = setTimeout(saveThumb, 2500);
    return () => clearTimeout(t);
  }, [view]);

  const dur = duration(view);

  const capture = async () => {
    if (!engine) return;
    const c = document.createElement('canvas');
    engine.drawTo(c, engine.t);
    const blob = await canvasBlob(c, 'image/jpeg', 0.94);
    const name = `frame_${tc(engine.t).replace(/:/g, '')}.jpg`;
    const m = await importBlob(blob, name, 'capture', 'image');
    if (!m) return;
    const d = useVideo.getState().doc!;
    const W = view.w >= view.h ? 1280 : 1080, H = view.w >= view.h ? 720 : 1920;
    const doc = await createDoc('design', `${d.name} — ${useApp.getState().lang === 'fr' ? 'miniature' : 'thumbnail'}`, `${W}×${H}`, {
      pages: [{ id: uid('p'), w: W, h: H, bg: '#0F1115', els: [{ id: uid('e'), type: 'image', name, mediaId: m.id, x: 0, y: 0, w: W, h: H, fit: 'cover' }] }],
    });
    notify(T('Image capturée : nouveau document design créé.', 'Frame captured: new design document created.'));
    engine.pause();
    go('design', doc.id);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDrop(false);
    if (!e.dataTransfer.files.length) return;
    const { ok } = await importFiles(e.dataTransfer.files);
    ok.forEach((m) => addMediaAtPlayhead(m));
  };

  return (
    <div className="dots" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
      onDragOver={(e) => { e.preventDefault(); setDrop(true); }} onDragLeave={() => setDrop(false)} onDrop={onDrop}>
      {(busy || (running && !draft)) && (
        <div className="row" style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 5, gap: 10, padding: '6px 6px 6px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--accTx)', whiteSpace: 'nowrap' }}>
          <span className="pulse" /><span style={{ fontSize: 12 }}>{T("L'assistant modifie le document…", 'The assistant is editing the document…')}</span>
          <button className="btn sm" onClick={() => useAgentRun.getState().abort?.()}>Stop</button>
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', containerType: 'size' }}>
        <div style={{ position: 'relative', width: `min(100cqw, calc(100cqh * ${view.w / view.h}))`, aspectRatio: `${view.w}/${view.h}`, outline: drop ? '2px dashed var(--acc)' : undefined, outlineOffset: 4 }}>
          <canvas ref={canvasRef} onClick={togglePlay} style={{ width: '100%', height: '100%', display: 'block', background: '#000', boxShadow: '0 0 0 1px var(--line2)' }} />
          {view.clips.length === 0 && (
            <div className="col" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 8, color: '#C9CCD1', textAlign: 'center', padding: 20, pointerEvents: 'none' }}>
              <Upload size={22} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{T('Dépose tes vidéos, photos ou sons ici', 'Drop your videos, photos or sounds here')}</span>
              <span style={{ fontSize: 11 }}>{T('ou importe-les depuis l’onglet Médias. Tout reste sur cet appareil.', 'or import them from the Media tab. Everything stays on this device.')}</span>
            </div>
          )}
          {safe && <div style={{ position: 'absolute', top: '12%', bottom: '20%', left: '6%', right: view.h > view.w ? '15%' : '6%', border: '1px dashed var(--accTx)', pointerEvents: 'none' }} />}
          {draft && <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 4, background: 'var(--acc)', color: 'var(--accInk)', fontSize: 11, fontWeight: 600 }}>{T('Aperçu de la proposition', 'Proposal preview')}</div>}
        </div>
      </div>
      <div className="row" style={{ height: 42, flex: 'none', gap: 10, padding: '0 14px', borderTop: '1px solid var(--line)' }}>
        <button className="btn icon" onClick={() => seekTo(0)} title={T('Début', 'Start')}><SkipBack size={13} /></button>
        <button className="btn icon" style={{ width: 34 }} onClick={togglePlay} title={T('Lecture / pause (Espace)', 'Play / pause (Space)')}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <span className="mono tnum" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{tc(t)} <span className="faint">/ {tc(dur)}</span></span>
        <div className="grow" />
        <button className="btn ghost" style={{ height: 28 }} disabled={!view.clips.length} onClick={() => void capture()}><Camera size={13} />{T('Capturer en design', 'Capture as design')}</button>
        <button className={'btn ghost'} style={{ height: 28, borderColor: safe ? 'var(--accTx)' : undefined }} onClick={() => setSafe(!safe)}>{T('Zones de sécurité', 'Safe zones')}</button>
      </div>
    </div>
  );
}

// Small preview of the current frame for the home screen.
function saveThumb() {
  const doc = useVideo.getState().doc;
  if (!engine || !doc || !doc.data.clips.length) return;
  try {
    const src = engine.canvas;
    const s = 320 / Math.max(src.width, src.height);
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * s); c.height = Math.round(src.height * s);
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    const thumb = c.toDataURL('image/jpeg', 0.7);
    useVideo.setState((st) => (st.doc && st.doc.id === doc.id ? { doc: { ...st.doc, thumb } } : {}));
    void patchDoc(doc.id, { thumb });
  } catch { /* canvas not ready */ }
}

export function addMediaAtPlayhead(m: MediaItem) {
  const st = useVideo.getState();
  const d = st.data();
  const at = st.t;
  const kind = m.kind;
  const dur = kind === 'image' ? 4 : Math.max(0.5, m.duration ?? 5);
  const pref = kind === 'audio' ? (/music|musique|song|lofi|beat/i.test(m.name) ? 'music' : 'audio') : 'video';
  // On the main track, append right after the last clip when the playhead is past its end.
  let start = at;
  if (pref === 'video') { const end = trackEnd(d, 'video'); if (end <= at + 0.01) start = end; }
  const track = freeTrack(d, pref, start, dur);
  V.add(newClip({ track, kind, mediaId: m.id, name: m.name, start: Math.round(start * 100) / 100, dur: Math.round(dur * 100) / 100 }));
}

function MediaTab({ media, kinds, onRec }: { media: MediaItem[]; kinds: MediaItem['kind'][]; onRec?: (k: 'rec-webcam' | 'rec-screen' | 'rec-mic') => void }) {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const items = media.filter((m) => kinds.includes(m.kind));
  const accept = kinds.includes('audio') && kinds.length === 1 ? 'audio/*' : 'video/*,image/*,audio/*';
  const onFiles = async (f: FileList | null) => {
    if (!f?.length) return;
    const { ok, rejected } = await importFiles(f);
    ok.forEach((m) => addMediaAtPlayhead(m));
    if (ok.length) notify(T(`${ok.length} média(s) ajouté(s) à la timeline.`, `${ok.length} media added to the timeline.`));
    if (rejected.length) notify(T('Format non pris en charge : ', 'Unsupported format: ') + rejected.join(', '), 'err');
  };
  return (
    <>
      <label style={{ padding: '14px 10px', borderRadius: 10, border: '1px dashed var(--line2)', color: 'var(--tx2)', fontSize: 12, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Upload size={16} />{T('Importer (MP4, MOV, WebM, JPG, PNG, MP3, WAV…) ou déposer sur l’aperçu', 'Import (MP4, MOV, WebM, JPG, PNG, MP3, WAV…) or drop on the preview')}
        <input id={'vimport-' + kinds.join('')} type="file" accept={accept} multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
      </label>
      {onRec && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
          <button className="btn sm" style={{ height: 30 }} onClick={() => onRec('rec-webcam')}>{T('Webcam', 'Webcam')}</button>
          <button className="btn sm" style={{ height: 30 }} onClick={() => onRec('rec-screen')}>{T('Écran', 'Screen')}</button>
          <button className="btn sm" style={{ height: 30 }} onClick={() => onRec('rec-mic')}>{T('Micro', 'Mic')}</button>
        </div>
      )}
      {items.length === 0 && <span className="faint pretty" style={{ fontSize: 11 }}>{T('Rien ici pour l’instant.', 'Nothing here yet.')}</span>}
      {items.map((m) => (
        <div key={m.id} className="list-item" title={m.name}>
          <div style={{ width: 52, height: 32, borderRadius: 8, flex: 'none', background: m.thumb ? `url(${m.thumb}) center/cover` : 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{!m.thumb && <Music size={13} color="var(--tx3)" />}</div>
          <div className="col grow"><span className="ell" style={{ fontSize: 12 }}>{m.name}</span><span className="faint" style={{ fontSize: 11 }}>{m.kind === 'image' ? `${m.w}×${m.h}` : fmtDur(m.duration ?? 0)}</span></div>
          <button className="btn icon" style={{ width: 26, height: 26 }} title={T('Ajouter à la tête de lecture', 'Add at playhead')} onClick={() => addMediaAtPlayhead(m)}><Plus size={13} /></button>
        </div>
      ))}
    </>
  );
}

function TextTab() {
  const T = useT();
  const presets = [
    { l: T('Titre', 'Title'), style: { size: 110, color: '#FFFFFF', weight: 800, font: 'sans' as FontKey, y: 45, anim: 'zoom' as const }, text: T('Ton titre', 'Your title') },
    { l: T('Sous-titre', 'Subtitle'), style: { size: 64, color: '#FFFFFF', weight: 700, font: 'sans' as FontKey, y: 60, anim: 'slide' as const }, text: T('Un sous-titre', 'A subtitle') },
    { l: T('Bandeau bas', 'Lower third'), style: { size: 48, color: '#0F1115', weight: 700, font: 'sans' as FontKey, y: 82, bg: '#FFD23F', anim: 'slide' as const }, text: T('Prénom Nom · rôle', 'First Last · role') },
    { l: T('Accroche', 'Hook'), style: { size: 96, color: '#FFD23F', weight: 800, font: 'anton' as FontKey, y: 22, anim: 'pop' as const }, text: T('ATTENDS LA FIN…', 'WAIT FOR IT…') },
  ];
  return (
    <>
      {presets.map((p) => (
        <button key={p.l} onClick={() => { const t = useVideo.getState().t; V.add(newClip({ track: 'text', kind: 'text', name: p.l, text: p.text, start: Math.round(t * 100) / 100, dur: 3, style: p.style })); }}
          style={{ textAlign: 'left', padding: 10, borderRadius: 10, border: '1px solid transparent', background: 'var(--panel2)', fontFamily: FONTS[p.style.font].css, fontWeight: p.style.weight, fontSize: 14 }}>{p.l}</button>
      ))}
      <span className="faint pretty" style={{ fontSize: 11 }}>{T('Le texte est ajouté à la tête de lecture pour 3 s. Modifie-le dans l’inspecteur.', 'Text is added at the playhead for 3 s. Edit it in the inspector.')}</span>
    </>
  );
}

function CaptionsTab() {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const data = useVideo((s) => s.view());
  const selCap = useVideo((s) => s.selCap);
  const [find, setFind] = useState('');
  const [repl, setRepl] = useState('');
  const [script, setScript] = useState('');
  const caps = data.captions;
  const hits = find ? caps.reduce((n, c) => n + (c.text.toLowerCase().split(find.toLowerCase()).length - 1), 0) : 0;
  const exp = async (kind: 'srt' | 'vtt') => {
    const body = kind === 'srt' ? toSrt(caps) : toVtt(caps);
    const name = slug(useVideo.getState().doc!.name);
    let r = await saveFile(`${name}.${kind}`, new Blob([body], { type: 'text/plain' }));
    if (r === 'failed') r = await saveFile(`${name}.${kind}.txt`, new Blob([body], { type: 'text/plain' }));
    if (r === 'saved') notify(T('Fichier enregistré.', 'File saved.'));
    else if (r === 'failed') { try { await navigator.clipboard.writeText(body); notify(T('Téléchargement indisponible : sous-titres copiés dans le presse-papiers.', 'Download unavailable: captions copied to the clipboard.'), 'info'); } catch { notify(T('Enregistrement impossible dans cette vue.', 'Saving is not possible in this view.'), 'err'); } }
  };
  return (
    <>
      <div className="col" style={{ gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('Style', 'Style')}</span>
        <Chips small value={data.capStyle} onChange={(v) => useVideo.getState().apply((d) => { d.capStyle = v; })} options={[{ id: 'tiktok' as const, label: 'TikTok' }, { id: 'karaoke' as const, label: T('Karaoké', 'Karaoke') }, { id: 'boxed' as const, label: T('Encadré', 'Boxed') }, { id: 'minimal' as const, label: 'Minimal' }]} />
        <label className="field"><span>{T('Position verticale', 'Vertical position')} · {Math.round(data.capY)} %</span><input type="range" min={8} max={92} value={data.capY} onChange={(e) => useVideo.getState().apply((d) => { d.capY = Number(e.target.value); }, 'capY')} /></label>
      </div>
      <label className="btn" style={{ cursor: 'pointer' }}>{T('Importer SRT / VTT', 'Import SRT / VTT')}
        <input type="file" accept=".srt,.vtt,text/vtt" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          const list = parseSubtitles(await f.text());
          if (!list.length) { notify(T('Fichier non reconnu (SRT ou VTT attendu).', 'Unrecognized file (SRT or VTT expected).'), 'err'); return; }
          useVideo.getState().apply((d) => { d.captions = list; });
          notify(T(`${list.length} sous-titres importés.`, `${list.length} captions imported.`));
        }} />
      </label>
      <details>
        <summary style={{ fontSize: 12, cursor: 'pointer', color: 'var(--tx2)' }}>{T('Créer à partir d’un texte', 'Create from text')}</summary>
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          <textarea id="cap-script" className="input" rows={4} value={script} onChange={(e) => setScript(e.target.value)} placeholder={T('Colle ton script : il est découpé en phrases de 6 mots, calées à partir de la tête de lecture.', 'Paste your script: it is split into 6-word lines, timed from the playhead.')} />
          <button className="btn" disabled={!script.trim()} onClick={() => { const add = textToCaptions(script, useVideo.getState().t); useVideo.getState().apply((d) => { d.captions = [...d.captions, ...add].sort((a, b) => a.start - b.start); }); setScript(''); }}>{T('Ajouter', 'Add')}</button>
        </div>
      </details>
      <span className="faint pretty" style={{ fontSize: 11 }}>{T('Transcription automatique (Whisper local) : bientôt. Le modèle n’est pas encore embarqué dans cette version.', 'Automatic transcription (local Whisper): coming soon. The model is not bundled in this version yet.')}</span>
      {caps.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: 4 }}>
            <input className="input" style={{ height: 28, fontSize: 11 }} placeholder={T('Rechercher', 'Find')} value={find} onChange={(e) => setFind(e.target.value)} />
            <input className="input" style={{ height: 28, fontSize: 11 }} placeholder={T('Remplacer par', 'Replace with')} value={repl} onChange={(e) => setRepl(e.target.value)} />
            <button className="btn sm" style={{ height: 28 }} disabled={!hits} onClick={() => { const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); useVideo.getState().apply((d) => { d.captions.forEach((c) => { c.text = c.text.replace(re, repl); }); }); notify(T(`${hits} remplacement(s).`, `${hits} replacement(s).`)); }}>{T('Remplacer', 'Replace')} {hits ? `(${hits})` : ''}</button>
          </div>
          {caps.map((c) => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) 18px', gap: 6, alignItems: 'start', padding: 6, borderRadius: 10, border: `1px solid ${selCap === c.id ? 'var(--accTx)' : 'var(--line)'}` }}>
              <button className="mono" onClick={() => { useVideo.getState().selectCap(c.id); seekTo(c.start); }} style={{ border: 0, background: 'transparent', padding: '2px 0', fontSize: 10, color: 'var(--tx2)', textAlign: 'left', lineHeight: 1.4 }}>{tc(c.start)}<br />{tc(c.end)}</button>
              <textarea className="input" rows={2} value={c.text} onChange={(e) => { const v = e.target.value; useVideo.getState().apply((d) => { const k = d.captions.find((x) => x.id === c.id); if (k) k.text = v; }, 'cap' + c.id); }} style={{ padding: '4px 6px', fontSize: 11, resize: 'none' }} />
              <button onClick={() => useVideo.getState().apply((d) => { d.captions = d.captions.filter((x) => x.id !== c.id); })} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0, fontSize: 14 }} aria-label={T('Supprimer', 'Delete')}>×</button>
            </div>
          ))}
          <div className="row" style={{ gap: 4 }}>
            <button className="btn sm" style={{ height: 28 }} onClick={() => void exp('srt')}>{T('Exporter SRT', 'Export SRT')}</button>
            <button className="btn sm" style={{ height: 28 }} onClick={() => void exp('vtt')}>{T('Exporter VTT', 'Export VTT')}</button>
            <button className="btn sm danger" style={{ height: 28 }} onClick={() => useVideo.getState().apply((d) => { d.captions = []; })}>{T('Tout effacer', 'Clear all')}</button>
          </div>
        </>
      )}
    </>
  );
}

const EFFECTS: { k: 'blur' | 'glow' | 'vignette'; fr: string; en: string; v: number }[] = [
  { k: 'blur', fr: 'Flou gaussien', en: 'Gaussian blur', v: 35 },
  { k: 'glow', fr: 'Glow', en: 'Glow', v: 50 },
  { k: 'vignette', fr: 'Vignette', en: 'Vignette', v: 55 },
];
const FILTERS: { k: ClipFx['filter'] | 'none'; fr: string; en: string }[] = [
  { k: 'none', fr: 'Neutre', en: 'Neutral' }, { k: 'warm', fr: 'Chaud', en: 'Warm' }, { k: 'cool', fr: 'Froid', en: 'Cool' }, { k: 'matte', fr: 'Mat', en: 'Matte' },
  { k: 'contrast', fr: 'Contraste fort', en: 'High contrast' }, { k: 'bw', fr: 'Noir et blanc', en: 'Black & white' }, { k: 'vintage', fr: 'Vintage', en: 'Vintage' },
];
const TRANS: { k: NonNullable<Clip['trIn']>['type'] | 'none'; fr: string; en: string }[] = [
  { k: 'none', fr: 'Aucune', en: 'None' }, { k: 'fade', fr: 'Fondu enchaîné', en: 'Crossfade' }, { k: 'dip', fr: 'Fondu au noir', en: 'Dip to black' },
  { k: 'slide', fr: 'Glissement', en: 'Slide' }, { k: 'zoom', fr: 'Zoom', en: 'Zoom' }, { k: 'blur', fr: 'Flou', en: 'Blur' },
];

function LookTab({ kind }: { kind: 'effects' | 'filters' | 'transitions' }) {
  const T = useT();
  const sel = useVideo((s) => s.sel);
  const clip = useVideo((s) => s.view().clips.find((c) => c.id === s.sel));
  const notify = useApp((s) => s.notify);
  const visual = clip && (clip.kind === 'video' || clip.kind === 'image');
  const need = () => { notify(T('Sélectionne d’abord un clip vidéo ou image sur la timeline.', 'Select a video or image clip on the timeline first.'), 'info'); };
  const item: React.CSSProperties = { textAlign: 'left', padding: '9px 10px', borderRadius: 10, border: '1px solid transparent', background: 'var(--panel2)', fontSize: 12, display: 'flex', justifyContent: 'space-between' };
  return (
    <>
      {!visual && <span className="faint pretty" style={{ fontSize: 11 }}>{T('Sélectionne un clip vidéo ou image, puis clique un réglage. Les curseurs sont dans l’inspecteur.', 'Select a video or image clip, then click a setting. Sliders are in the inspector.')}</span>}
      {kind === 'effects' && EFFECTS.map((e) => (
        <button key={e.k} style={{ ...item, borderColor: clip?.fx?.[e.k] ? 'var(--accTx)' : 'transparent' }} onClick={() => { if (!visual || !sel) return need(); V.update(sel, (c) => { c.fx = { ...defaultFx(), ...c.fx, [e.k]: c.fx?.[e.k] ? 0 : e.v }; }); }}>
          <span>{T(e.fr, e.en)}</span><span className="acc" style={{ fontSize: 10 }}>{T('Gratuit · local', 'Free · local')}</span>
        </button>
      ))}
      {kind === 'filters' && FILTERS.map((f) => (
        <button key={f.k} style={{ ...item, borderColor: (clip?.fx?.filter ?? 'none') === f.k && visual ? 'var(--accTx)' : 'transparent' }} onClick={() => { if (!visual || !sel) return need(); V.update(sel, (c) => { c.fx = { ...defaultFx(), ...c.fx, filter: f.k === 'none' ? undefined : f.k, filterAmt: c.fx?.filterAmt ?? 100 }; }); }}>
          <span>{T(f.fr, f.en)}</span>
        </button>
      ))}
      {kind === 'transitions' && TRANS.map((x) => (
        <button key={x.k} style={{ ...item, borderColor: (clip?.trIn?.type ?? 'none') === x.k && visual ? 'var(--accTx)' : 'transparent' }} onClick={() => { if (!visual || !sel) return need(); V.update(sel, { trIn: x.k === 'none' ? undefined : { type: x.k, dur: clip?.trIn?.dur ?? 0.5 } }); }}>
          <span>{T(x.fr, x.en)}</span><span className="faint" style={{ fontSize: 10 }}>{T('entrée du clip', 'clip entrance')}</span>
        </button>
      ))}
    </>
  );
}

function Slider({ label, value, min, max, step = 1, onChange, suffix = '', id }: { label: string; value: number; min: number; max: number; step?: number; onChange(v: number): void; suffix?: string; id: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) 44px', gap: 6, alignItems: 'center' }}>
      <label htmlFor={id} className="ell" style={{ fontSize: 11 }}>{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="mono muted" style={{ fontSize: 10, textAlign: 'right' }}>{Math.round(value * 100) / 100}{suffix}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="col" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 10 }}><span className="eyebrow">{title}</span>{children}</div>;
}

function Inspector() {
  const T = useT();
  const sel = useVideo((s) => s.sel);
  const selCap = useVideo((s) => s.selCap);
  const view = useVideo((s) => s.view());
  const locked = useVideo((s) => !!s.draft || s.busy);
  const c = view.clips.find((x) => x.id === sel);
  const cap = view.captions.find((x) => x.id === selCap);
  const brand = useApp((s) => s.brand);

  if (locked) return <div className="muted pretty" style={{ padding: 14, fontSize: 12 }}>{T("L'assistant travaille sur le document. Applique ou refuse sa proposition pour reprendre la main.", 'The assistant is working on the document. Apply or refuse its proposal to take back control.')}</div>;

  if (cap) {
    return (
      <div className="col" style={{ padding: 14, gap: 12 }}>
        <span className="eyebrow">{T('Sous-titre', 'Caption')}</span>
        <textarea className="input" rows={3} value={cap.text} onChange={(e) => { const v = e.target.value; useVideo.getState().apply((d) => { const k = d.captions.find((x) => x.id === cap.id); if (k) k.text = v; }, 'cap' + cap.id); }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(['start', 'end'] as const).map((k) => (
            <label key={k} className="field"><span>{k === 'start' ? T('Début (s)', 'Start (s)') : T('Fin (s)', 'End (s)')}</span>
              <input className="input mono" type="number" step={0.1} value={cap[k]} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) useVideo.getState().apply((d) => { const x = d.captions.find((q) => q.id === cap.id); if (x) x[k] = Math.max(0, v); }, 'capt' + cap.id + k); }} style={{ height: 28 }} />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (!c) {
    const formats: { id: string; w: number; h: number; l: string }[] = [
      { id: '169', w: 1920, h: 1080, l: '16:9' }, { id: '916', w: 1080, h: 1920, l: '9:16' }, { id: '11', w: 1080, h: 1080, l: '1:1' }, { id: '45', w: 1080, h: 1350, l: '4:5' },
    ];
    const cur = formats.find((f) => f.w === view.w && f.h === view.h)?.id;
    return (
      <div className="col" style={{ padding: 14, gap: 14 }}>
        <span className="eyebrow">{T('Projet', 'Project')}</span>
        <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('Format', 'Format')}</span>
          <Chips value={cur} onChange={(id) => { const f = formats.find((x) => x.id === id)!; useVideo.getState().apply((d) => { d.w = f.w; d.h = f.h; }); }} options={formats.map((f) => ({ id: f.id, label: `${f.l} · ${f.w}×${f.h}` }))} />
          <span className="faint pretty" style={{ fontSize: 11 }}>{T('Les clips sont recadrés automatiquement (remplir). Ajuste l’échelle et la position de chaque clip dans l’inspecteur.', 'Clips are refitted automatically (fill). Adjust each clip’s scale and position in the inspector.')}</span>
        </div>
        <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('Fond', 'Background')}</span>
          <div className="row wrap" style={{ gap: 6 }}>{['#000000', ...brand.colors].map((h) => <button key={h} onClick={() => useVideo.getState().apply((d) => { d.bg = h; })} style={{ width: 28, height: 28, borderRadius: 10, border: view.bg === h ? '2px solid var(--acc)' : '1px solid var(--line2)', background: h }} title={h} />)}</div>
        </div>
        <span className="muted pretty" style={{ fontSize: 12 }}>{T('Sélectionne un clip pour régler sa couleur, ses effets, son filtre et sa transition. Raccourcis : Espace lecture, S scinder, Suppr supprimer, M marqueur, ← → image par image.', 'Select a clip to adjust its color, effects, filter and transition. Shortcuts: Space play, S split, Del delete, M marker, ← → frame by frame.')}</span>
      </div>
    );
  }

  const up = (p: Partial<Clip> | ((c: Clip) => void), key?: string) => V.update(c.id, p, key);
  const fx = { ...defaultFx(), ...c.fx };
  const setFx = (k: keyof ClipFx, v: number) => up((x) => { x.fx = { ...defaultFx(), ...x.fx, [k]: v }; }, 'fx' + c.id + k);
  const visual = c.kind === 'video' || c.kind === 'image';
  const hasAudio = c.kind === 'video' || c.kind === 'audio';
  return (
    <div className="col" style={{ padding: 14, gap: 12 }}>
      <div className="col" style={{ gap: 2 }}><span className="eyebrow">{T('Sélection', 'Selection')}</span><span className="mono ell" style={{ fontSize: 12 }}>{c.name}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['start', 'dur'] as const).map((k) => (
          <label key={k} className="field"><span>{k === 'start' ? T('Début (s)', 'Start (s)') : T('Durée (s)', 'Duration (s)')}</span>
            <input className="input mono" type="number" step={0.1} value={Math.round(c[k] * 100) / 100} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) up({ [k]: k === 'dur' ? Math.max(0.1, v) : Math.max(0, v) }); }} style={{ height: 28 }} />
          </label>
        ))}
      </div>
      {c.kind === 'text' && c.style && (
        <Section title={T('Texte', 'Text')}>
          <textarea className="input" rows={2} value={c.text ?? ''} onChange={(e) => up({ text: e.target.value })} />
          <select className="input" value={c.style.font} onChange={(e) => up((x) => { x.style = { ...x.style!, font: e.target.value as FontKey }; })} style={{ height: 28 }}>
            {FONT_KEYS.map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
          </select>
          <Slider id="t-size" label={T('Taille', 'Size')} value={c.style.size} min={20} max={220} onChange={(v) => up((x) => { x.style = { ...x.style!, size: v }; }, 'ts' + c.id)} />
          <Slider id="t-y" label={T('Position', 'Position')} value={c.style.y} min={5} max={95} suffix="%" onChange={(v) => up((x) => { x.style = { ...x.style!, y: v }; }, 'ty' + c.id)} />
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('Couleur', 'Color')}</span>
          <div className="row wrap" style={{ gap: 6 }}>{['#FFFFFF', ...brand.colors].map((h) => <button key={h} onClick={() => up((x) => { x.style = { ...x.style!, color: h }; })} style={{ width: 26, height: 26, borderRadius: 8, border: c.style!.color === h ? '2px solid var(--acc)' : '1px solid var(--line2)', background: h }} />)}</div>
          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('Fond du texte', 'Text box')}</span>
          <div className="row wrap" style={{ gap: 6 }}>
            <button className={'chip sm' + (!c.style.bg ? ' on' : '')} onClick={() => up((x) => { x.style = { ...x.style!, bg: undefined }; })}>{T('Aucun', 'None')}</button>
            {brand.colors.map((h) => <button key={h} onClick={() => up((x) => { x.style = { ...x.style!, bg: h }; })} style={{ width: 24, height: 24, borderRadius: 8, border: c.style!.bg === h ? '2px solid var(--acc)' : '1px solid var(--line2)', background: h }} />)}
          </div>
          <Chips small value={c.style.anim ?? 'fade'} onChange={(v) => up((x) => { x.style = { ...x.style!, anim: v }; })} options={[{ id: 'none' as const, label: T('Sans', 'None') }, { id: 'fade' as const, label: T('Fondu', 'Fade') }, { id: 'slide' as const, label: T('Glissement', 'Slide') }, { id: 'zoom' as const, label: 'Zoom' }, { id: 'pop' as const, label: T('Rebond', 'Pop') }]} />
        </Section>
      )}
      {visual && (
        <>
          <Section title={T('Cadrage', 'Framing')}>
            <Chips small value={c.fit ?? 'cover'} onChange={(v) => up({ fit: v })} options={[{ id: 'cover' as const, label: T('Remplir', 'Fill') }, { id: 'contain' as const, label: T('Contenir', 'Fit') }]} />
            <Slider id="c-scale" label={T('Échelle', 'Scale')} value={c.scale ?? 1} min={0.2} max={3} step={0.01} suffix="×" onChange={(v) => up({ scale: v }, 'sc' + c.id)} />
            <Slider id="c-x" label="X" value={c.x ?? 0} min={-100} max={100} suffix="%" onChange={(v) => up({ x: v }, 'x' + c.id)} />
            <Slider id="c-y" label="Y" value={c.y ?? 0} min={-100} max={100} suffix="%" onChange={(v) => up({ y: v }, 'y' + c.id)} />
            <Slider id="c-rot" label={T('Rotation', 'Rotation')} value={c.rot ?? 0} min={-180} max={180} suffix="°" onChange={(v) => up({ rot: v }, 'r' + c.id)} />
            <Slider id="c-op" label={T('Opacité', 'Opacity')} value={Math.round((c.opacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(v) => up({ opacity: v / 100 }, 'o' + c.id)} />
          </Section>
          <Section title={T('Couleur', 'Color')}>
            <Slider id="fx-bri" label={T('Luminosité', 'Brightness')} value={fx.bri} min={-100} max={100} onChange={(v) => setFx('bri', v)} />
            <Slider id="fx-con" label={T('Contraste', 'Contrast')} value={fx.con} min={-100} max={100} onChange={(v) => setFx('con', v)} />
            <Slider id="fx-sat" label={T('Saturation', 'Saturation')} value={fx.sat} min={-100} max={100} onChange={(v) => setFx('sat', v)} />
            <Slider id="fx-temp" label={T('Température', 'Temperature')} value={fx.temp} min={-100} max={100} onChange={(v) => setFx('temp', v)} />
          </Section>
          <Section title={T('Filtre et effets', 'Filter and effects')}>
            {fx.filter ? <Slider id="fx-famt" label={T('Filtre ', 'Filter ') + FILTERS.find((f) => f.k === fx.filter)?.[useApp.getState().lang]} value={fx.filterAmt ?? 100} min={0} max={100} onChange={(v) => setFx('filterAmt', v)} /> : <span className="faint" style={{ fontSize: 11 }}>{T('Aucun filtre. Choisis-en un dans l’onglet Filtres.', 'No filter. Pick one in the Filters tab.')}</span>}
            {EFFECTS.map((e) => <Slider key={e.k} id={'fx-' + e.k} label={T(e.fr, e.en)} value={fx[e.k] ?? 0} min={0} max={100} onChange={(v) => setFx(e.k, v)} />)}
          </Section>
          <Section title={T('Transitions', 'Transitions')}>
            <select className="input" value={c.trIn?.type ?? 'none'} onChange={(e) => up({ trIn: e.target.value === 'none' ? undefined : { type: e.target.value as 'fade', dur: c.trIn?.dur ?? 0.5 } })} style={{ height: 28 }}>
              {TRANS.map((x) => <option key={x.k} value={x.k}>{T('Entrée : ', 'In: ')}{T(x.fr, x.en)}</option>)}
            </select>
            {c.trIn && <Slider id="tr-in" label={T('Durée entrée', 'In duration')} value={c.trIn.dur} min={0.1} max={2} step={0.1} suffix=" s" onChange={(v) => up({ trIn: { ...c.trIn!, dur: v } }, 'tri' + c.id)} />}
            <select className="input" value={c.trOut?.type ?? 'none'} onChange={(e) => up({ trOut: e.target.value === 'none' ? undefined : { type: e.target.value as 'fade', dur: c.trOut?.dur ?? 0.5 } })} style={{ height: 28 }}>
              <option value="none">{T('Sortie : aucune', 'Out: none')}</option>
              <option value="fade">{T('Sortie : fondu', 'Out: fade')}</option>
              <option value="dip">{T('Sortie : fondu au noir', 'Out: dip to black')}</option>
            </select>
          </Section>
        </>
      )}
      {c.kind !== 'text' && c.kind !== 'image' && (
        <Section title={T('Vitesse', 'Speed')}>
          <Chips small value={c.speed ?? 1} onChange={(v) => { const old = c.speed ?? 1; up({ speed: v, dur: Math.round(((c.dur * old) / v) * 100) / 100 }); }} options={[0.25, 0.5, 1, 1.5, 2, 4].map((v) => ({ id: v, label: `${v}×` }))} />
        </Section>
      )}
      {hasAudio && (
        <Section title="Audio">
          <div className="row"><Switch on={!c.muted} onChange={(v) => up({ muted: !v })} /><span style={{ fontSize: 12 }}>{T('Son activé', 'Sound on')}</span></div>
          <Slider id="a-vol" label={T('Volume', 'Volume')} value={Math.round((c.volume ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(v) => up({ volume: v / 100 }, 'v' + c.id)} />
          <Slider id="a-fi" label={T('Fondu entrée', 'Fade in')} value={c.fadeIn ?? 0} min={0} max={5} step={0.1} suffix=" s" onChange={(v) => up({ fadeIn: v }, 'fi' + c.id)} />
          <Slider id="a-fo" label={T('Fondu sortie', 'Fade out')} value={c.fadeOut ?? 0} min={0} max={5} step={0.1} suffix=" s" onChange={(v) => up({ fadeOut: v }, 'fo' + c.id)} />
        </Section>
      )}
    </div>
  );
}

function ExportVideo({ onClose }: { onClose(): void }) {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const doc = useVideo((s) => s.doc)!;
  const [name, setName] = useState(doc.name);
  const [q, setQ] = useState<4 | 8 | 16>(8);
  const [st, setSt] = useState<{ phase: 'idle' | 'run' | 'done'; pct: number; blob?: Blob; file?: string }>({ phase: 'idle', pct: 0 });
  const cancel = useRef(false);
  const vm = bestVideoMime();
  const dur = duration(doc.data);
  const run = async () => {
    if (!engine) return;
    if (dur <= 0) { notify(T('La timeline est vide.', 'The timeline is empty.'), 'err'); return; }
    cancel.current = false;
    setSt({ phase: 'run', pct: 0 });
    try {
      const c = document.createElement('canvas');
      const blob = await engine.exportTo(c, (d, draw, audio) => recordCanvas(c, d, draw, (pct) => setSt((s) => ({ ...s, pct })), () => cancel.current, audio, 30, q * 1_000_000));
      setSt({ phase: 'done', pct: 100, blob, file: `${slug(name)}.${vm.ext}` });
      pushNotif({ kind: 'export', text: T(`Vidéo exportée : ${slug(name)}.${vm.ext}`, `Video exported: ${slug(name)}.${vm.ext}`), to: 'video' });
    } catch (e) {
      if ((e as Error).message !== 'cancel') notify(T('L’export a échoué : ', 'Export failed: ') + (e as Error).message, 'err');
      setSt({ phase: 'idle', pct: 0 });
    }
  };
  const save = async () => {
    if (!st.blob || !st.file) return;
    const r = await saveFile(st.file, st.blob);
    if (r === 'saved') notify(T('Fichier enregistré.', 'File saved.'));
    else if (r === 'failed') notify(T('Enregistrement impossible dans cette vue.', 'Saving is not possible in this view.'), 'err');
  };
  return (
    <Modal title={T('Exporter la vidéo', 'Export video')} onClose={() => { cancel.current = true; onClose(); }}
      footer={st.phase === 'idle'
        ? <><span className="faint pretty grow" style={{ fontSize: 11 }}>{T('Seules les combinaisons que ce navigateur sait encoder sont proposées. Aucun filigrane.', 'Only combinations this browser can encode are offered. No watermark.')}</span><button className="btn primary md" disabled={!canRecord()} onClick={() => void run()}>{T('Exporter', 'Export')}</button></>
        : st.phase === 'done'
          ? <><button className="btn md" onClick={() => setSt({ phase: 'idle', pct: 0 })}>{T('Retour', 'Back')}</button><button className="btn primary md" onClick={() => void save()}>{T('Télécharger', 'Download')}</button></>
          : <button className="btn md" onClick={() => { cancel.current = true; }}>{T('Annuler', 'Cancel')}</button>}>
      {st.phase === 'idle' && (
        <>
          <label className="field"><span className="eyebrow">{T('Nom', 'Name')}</span><input id="vex-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Qualité', 'Quality')}</span>
            <Chips value={q} onChange={setQ} options={[{ id: 4 as const, label: T('Standard · 4 Mb/s', 'Standard · 4 Mb/s') }, { id: 8 as const, label: T('Élevée · 8 Mb/s', 'High · 8 Mb/s') }, { id: 16 as const, label: T('Maximale · 16 Mb/s', 'Maximum · 16 Mb/s') }]} />
          </div>
          <div className="mono muted" style={{ fontSize: 11, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>{vm.ext.toUpperCase()} · {doc.data.w}×{doc.data.h} · 30 fps · {fmtDur(dur)} · ≈ {((q * dur) / 8).toFixed(0)} Mo</div>
          <span className="faint pretty" style={{ fontSize: 12 }}>{T('L’export se fait en temps réel dans ce navigateur (la durée de l’export égale celle de la vidéo). Garde l’onglet au premier plan.', 'Export runs in real time in this browser (it takes as long as the video). Keep the tab in the foreground.')}</span>
          {!canRecord() && <span className="warn" style={{ fontSize: 12 }}>{T('Ce navigateur ne sait pas encoder de vidéo (MediaRecorder absent).', 'This browser cannot encode video (MediaRecorder missing).')}</span>}
        </>
      )}
      {st.phase === 'run' && <div style={{ padding: '18px 0' }}><Progress label={T('Export en cours', 'Exporting')} pct={st.pct} /></div>}
      {st.phase === 'done' && (
        <div className="col" style={{ gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{T('Export terminé', 'Export complete')}</span>
          <video src={URL.createObjectURL(st.blob!)} controls style={{ width: '100%', maxHeight: 280, background: '#000', borderRadius: 10 }} />
          <div className="mono muted" style={{ fontSize: 11 }}>{st.file} · {((st.blob?.size ?? 0) / 1024 / 1024).toFixed(1)} Mo</div>
        </div>
      )}
    </Modal>
  );
}

function RecordDialog({ kind, onClose }: { kind: 'webcam' | 'screen' | 'mic'; onClose(): void }) {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const vid = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState('');
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    let s: MediaStream | null = null;
    void (async () => {
      try {
        s = kind === 'screen' ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }) : await navigator.mediaDevices.getUserMedia(kind === 'mic' ? { audio: true } : { video: true, audio: true });
        setStream(s);
        if (vid.current && kind !== 'mic') { vid.current.srcObject = s; void vid.current.play().catch(() => undefined); }
      } catch (e) {
        setErr((e as Error).message || String(e));
      }
    })();
    return () => { s?.getTracks().forEach((t) => t.stop()); };
  }, [kind]);
  useEffect(() => { if (!rec) return; const i = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(i); }, [rec]);
  const start = () => {
    if (!stream) return;
    const chunks: Blob[] = [];
    const mime = kind === 'mic' ? (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '') : bestVideoMime().mime;
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => setBlob(new Blob(chunks, { type: r.mimeType }));
    r.start(500);
    setSecs(0);
    setRec(r);
  };
  const add = async () => {
    if (!blob) return;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const name = `${kind === 'mic' ? T('voix', 'voice') : kind}_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`;
    const m = await importBlob(blob, name, 'recording', kind === 'mic' ? 'audio' : 'video');
    if (m) { addMediaAtPlayhead(m); notify(T('Enregistrement ajouté à la timeline.', 'Recording added to the timeline.')); }
    onClose();
  };
  const title = { webcam: T('Enregistrer la webcam', 'Record webcam'), screen: T('Enregistrer l’écran', 'Record screen'), mic: T('Enregistrer le micro', 'Record microphone') }[kind];
  return (
    <Modal title={title} onClose={onClose}
      footer={<>
        <span className="mono grow" style={{ fontSize: 13, color: rec && !blob ? '#E84A2F' : 'var(--tx2)' }}>{String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}</span>
        {stream && !rec && <button className="btn primary md" onClick={start}>{T('● Démarrer', '● Start')}</button>}
        {rec && !blob && <button className="btn primary md" style={{ background: '#E84A2F', borderColor: '#E84A2F' }} onClick={() => rec.stop()}>{T('■ Arrêter', '■ Stop')}</button>}
        {blob && <button className="btn primary md" onClick={() => void add()}>{T('Ajouter à la timeline', 'Add to timeline')}</button>}
        <button className="btn md" onClick={onClose}>{T('Fermer', 'Close')}</button>
      </>}>
      {!stream && !err && <span className="muted" style={{ fontSize: 12 }}>{T('Autorise l’accès dans la fenêtre du navigateur…', 'Allow access in the browser prompt…')}</span>}
      {err && <div className="warn pretty" style={{ padding: 12, borderRadius: 10, background: 'var(--panel2)', fontSize: 12 }}>{T('Accès refusé ou indisponible ici : ', 'Access denied or unavailable here: ')}{err}. {T('Dans claude.ai, la caméra, le micro et la capture d’écran sont bloqués : enregistre avec ton appareil puis importe le fichier.', 'Inside claude.ai, camera, microphone and screen capture are blocked: record with your device, then import the file.')}</div>}
      {kind !== 'mic' && !blob && <video ref={vid} muted playsInline style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 10, display: stream ? 'block' : 'none' }} />}
      {kind === 'mic' && stream && !blob && <div className="row" style={{ height: 90, borderRadius: 10, background: 'var(--panel2)', justifyContent: 'center', gap: 10, fontSize: 12 }}><span className="pulse" />{T('Micro actif', 'Microphone live')}</div>}
      {blob && (kind === 'mic' ? <audio src={URL.createObjectURL(blob)} controls style={{ width: '100%' }} /> : <video src={URL.createObjectURL(blob)} controls style={{ width: '100%', maxHeight: 300, background: '#000', borderRadius: 10 }} />)}
      <span className="faint pretty" style={{ fontSize: 11 }}>{T('L’enregistrement reste sur cet appareil et rejoint la médiathèque.', 'The recording stays on this device and joins the media library.')}</span>
    </Modal>
  );
}
