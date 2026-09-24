import { useEffect, useMemo, useState } from 'react';
import { Undo2, Redo2, History, Scaling, Presentation, Download, Copy, Trash2, Lock, Unlock, ArrowUpToLine, ArrowDownToLine, Group, Ungroup, Component, CloudCheck, Plus, ChevronLeft, ChevronRight, Sparkles, Layers as LayersIcon, SlidersHorizontal, LayoutGrid } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { useDesign, snapshot } from './store';
import { getDoc } from '../lib/docs';
import { preload } from '../lib/media';
import type { DesignData } from '../model/types';
import { Canvas } from './Canvas';
import { LeftPanel, Rail, useImages, type LeftTab } from './LeftPanel';
import { Inspector, Layers } from './Inspector';
import { Composer, useAgentRun } from '../agent/Composer';
import { designHost, setDesignMedia } from './host';
import { ExportDesign, ResizeDialog, Present, AnimPreview } from './dialogs';
import { VersionsPanel } from '../ui/Versions';
import { PageView } from './ElementView';
import { LogoMark } from '../ui/kit';
import { dimsLabel } from '../model/formats';
import * as A from './actions';

type RightTab = 'insp' | 'layers' | 'agent';

export function DesignEditor() {
  const T = useT();
  const docId = useApp((s) => s.docId);
  const go = useApp((s) => s.go);
  const notify = useApp((s) => s.notify);
  const pending = useApp((s) => s.pendingPrompt);
  const doc = useDesign((s) => s.doc);
  const [ready, setReady] = useState(false);
  const [left, setLeft] = useState<LeftTab>('text');
  const [right, setRight] = useState<RightTab>(pending ? 'agent' : 'insp');
  const [dialog, setDialog] = useState<null | 'export' | 'resize' | 'versions' | 'present' | 'anim'>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760);
  const media = useImages();
  useEffect(() => { setDesignMedia(media); }, [media]);

  useEffect(() => {
    const r = () => setNarrow(window.innerWidth < 760);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  useEffect(() => {
    let alive = true;
    setReady(false);
    void (async () => {
      if (!docId) { go('home'); return; }
      const d = await getDoc<DesignData>(docId);
      if (!alive) return;
      if (!d) { notify(T('Document introuvable.', 'Document not found.'), 'err'); go('home'); return; }
      await preload(d.data.pages.flatMap((p) => p.els.map((e) => e.mediaId)));
      useDesign.getState().load(d);
      setReady(true);
    })();
    return () => { alive = false; void useDesign.getState().flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => { if (pending) setRight('agent'); }, [pending]);

  // Autosave version every 5 minutes while the document changes.
  useEffect(() => {
    let last = useDesign.getState().doc?.data;
    const t = setInterval(() => {
      const d = useDesign.getState().doc?.data;
      if (d && d !== last) { last = d; void snapshot('autosave', 'Autosave'); }
    }, 300_000);
    return () => clearInterval(t);
  }, [docId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable)) return;
      const st = useDesign.getState();
      if (!st.doc || st.draft || st.busy || dialog === 'present') return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); st.redo(); return; }
      if (mod && k === 'd') { e.preventDefault(); A.duplicateSel(); return; }
      if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) A.ungroup(); else A.group(); return; }
      if (mod && k === 'c') { if (A.copySel()) e.preventDefault(); return; }
      if (mod && k === 'v') { A.pasteClipboard(); return; }
      if (mod && k === 'a') { e.preventDefault(); st.select(st.page().els.filter((x) => !x.locked && !x.hidden).map((x) => x.id)); return; }
      if (k === 'delete' || k === 'backspace') { if (st.sel.length) { e.preventDefault(); A.removeSel(); } return; }
      if (k === 'escape') { st.select([]); return; }
      const step = e.shiftKey ? 10 : 1;
      if (k === 'arrowleft') { e.preventDefault(); A.nudge(-step, 0); }
      if (k === 'arrowright') { e.preventDefault(); A.nudge(step, 0); }
      if (k === 'arrowup') { e.preventDefault(); A.nudge(0, -step); }
      if (k === 'arrowdown') { e.preventDefault(); A.nudge(0, step); }
    };
    const onPaste = async (e: ClipboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      const { importFiles } = await import('../lib/media');
      const { ok } = await importFiles(files);
      ok.forEach((m) => A.addImageFromMedia(m));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('paste', onPaste);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('paste', onPaste); };
  }, [dialog]);

  const host = useMemo(() => designHost(), []);

  if (!ready || !doc) return <div className="row faint" style={{ height: '100%', justifyContent: 'center' }}><span className="pulse" />{T('Ouverture…', 'Opening…')}</div>;
  if (narrow) return <DesignMobile onExport={() => setDialog('export')} dialog={dialog} setDialog={setDialog} />;

  return (
    <div style={{ display: 'grid', gridTemplateRows: '48px minmax(0,1fr) 112px', height: '100%', minHeight: 560, position: 'relative' }}>
      <Header onDialog={setDialog} />
      <div style={{ display: 'grid', gridTemplateColumns: '64px 240px minmax(0,1fr) 320px', minHeight: 0 }}>
        <Rail tab={left} setTab={setLeft} />
        <LeftPanel tab={left} />
        <Stage />
        <aside style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div className="tabs">
            {([['insp', T('Inspecteur', 'Inspector'), SlidersHorizontal], ['layers', T('Calques', 'Layers'), LayersIcon], ['agent', T('Assistant', 'Assistant'), Sparkles]] as const).map(([id, label, I]) => (
              <button key={id} className={right === id ? 'on' : ''} onClick={() => setRight(id)}><I size={14} />{label}</button>
            ))}
          </div>
          <div style={{ display: right === 'insp' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, flex: 1 }}><Inspector onPreviewAnim={() => setDialog('anim')} /></div>
          <div style={{ display: right === 'layers' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, flex: 1 }}><Layers /></div>
          <div style={{ display: right === 'agent' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, flex: 1 }}><Composer host={host} autoPrompt={pending} /></div>
        </aside>
      </div>
      <PagesStrip />
      {dialog === 'export' && <ExportDesign onClose={() => setDialog(null)} />}
      {dialog === 'resize' && <ResizeDialog onClose={() => setDialog(null)} />}
      {dialog === 'anim' && <AnimPreview page={useDesign.getState().page()} onClose={() => setDialog(null)} />}
      {dialog === 'present' && <Present pages={doc.data.pages} start={useDesign.getState().pageIdx} onClose={() => setDialog(null)} />}
      {dialog === 'versions' && <VersionsPanel doc={doc} onClose={() => setDialog(null)} onRestore={(d) => useDesign.getState().apply((x) => { x.pages = (d as DesignData).pages; })} />}
    </div>
  );
}

function Header({ onDialog }: { onDialog(d: 'export' | 'resize' | 'versions' | 'present'): void }) {
  const T = useT();
  const go = useApp((s) => s.go);
  const lang = useApp((s) => s.lang);
  const toggleLang = useApp((s) => s.toggleLang);
  const doc = useDesign((s) => s.doc)!;
  const past = useDesign((s) => s.past.length);
  const future = useDesign((s) => s.future.length);
  const page = useDesign((s) => s.page());
  const locked = useDesign((s) => !!s.draft || s.busy);
  return (
    <header className="ed-header">
      <button className="logo-btn" onClick={() => go('home')} title={T('Accueil', 'Home')}><LogoMark /></button>
      <button className="btn bare" style={{ height: 30, padding: '0 8px', flex: 'none' }} onClick={() => useApp.getState().set({ palOpen: true })} title={T('Aller à… (⌘K)', 'Go to… (⌘K)')}><LayoutGrid size={14} /><span className="mono" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: 'var(--panel2)', color: 'var(--tx3)' }}>⌘K</span></button>
      <div className="col" style={{ lineHeight: 1.2, minWidth: 0, maxWidth: 260 }}>
        <input id="doc-name" className="ell" value={doc.name} onChange={(e) => useDesign.getState().rename(e.target.value)} style={{ fontWeight: 600, border: 0, background: 'transparent', outline: 'none', padding: 0, width: 240 }} />
        <span className="faint row" style={{ fontSize: 11, gap: 4 }}><CloudCheck size={11} color="var(--accTx)" />{T('Enregistré · sur cet appareil', 'Saved · on this device')}</span>
      </div>
      <div style={{ width: 1, height: 20, background: 'var(--line2)', margin: '0 4px' }} />
      <button className="btn icon" disabled={!past || locked} onClick={() => useDesign.getState().undo()} title={T('Annuler (⌘Z)', 'Undo (⌘Z)')}><Undo2 size={14} /></button>
      <button className="btn icon" disabled={!future || locked} onClick={() => useDesign.getState().redo()} title={T('Rétablir (⌘⇧Z)', 'Redo (⌘⇧Z)')}><Redo2 size={14} /></button>
      <span className="mono muted" style={{ height: 28, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', display: 'inline-flex', alignItems: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>{dimsLabel(page.w, page.h)}</span>
      <div className="grow" />
      <button className="btn" style={{ height: 28 }} onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
      <button className="btn" style={{ height: 28 }} onClick={() => onDialog('versions')}><History size={13} />{T('Versions', 'Versions')}</button>
      <button className="btn" style={{ height: 28 }} disabled={locked} onClick={() => onDialog('resize')}><Scaling size={13} />{T('Décliner', 'Resize')}</button>
      <button className="btn" style={{ height: 28 }} onClick={() => onDialog('present')}><Presentation size={13} />{T('Présenter', 'Present')}</button>
      <button className="btn primary" style={{ height: 28 }} onClick={() => onDialog('export')}><Download size={13} />{T('Exporter', 'Export')}</button>
    </header>
  );
}

function Stage() {
  const T = useT();
  const sel = useDesign((s) => s.sel);
  const draft = useDesign((s) => s.draft);
  const changed = useDesign((s) => s.changed);
  const busy = useDesign((s) => s.busy);
  const page = useDesign((s) => s.page());
  const running = useAgentRun((s) => s.running);
  const selEls = page.els.filter((e) => sel.includes(e.id));
  const allLocked = selEls.length > 0 && selEls.every((e) => e.locked);
  const grouped = selEls.some((e) => e.groupId);
  const single = selEls.length === 1 ? selEls[0] : undefined;
  const ctx: { label: string; icon: React.ReactNode; go(): void; danger?: boolean; show?: boolean }[] = [
    { label: T('Dupliquer', 'Duplicate'), icon: <Copy size={12} />, go: A.duplicateSel },
    { label: T('Premier plan', 'Bring to front'), icon: <ArrowUpToLine size={12} />, go: () => A.arrange('front') },
    { label: T('Arrière-plan', 'Send to back'), icon: <ArrowDownToLine size={12} />, go: () => A.arrange('back') },
    { label: grouped ? T('Dégrouper', 'Ungroup') : T('Grouper', 'Group'), icon: grouped ? <Ungroup size={12} /> : <Group size={12} />, go: grouped ? A.ungroup : A.group, show: selEls.length > 1 || grouped },
    { label: single?.compId ? T('Détacher', 'Detach') : T('Créer un composant', 'Make component'), icon: <Component size={12} />, go: single?.compId ? A.detachComponent : A.makeComponent, show: !!single },
    { label: allLocked ? T('Déverrouiller', 'Unlock') : T('Verrouiller', 'Lock'), icon: allLocked ? <Unlock size={12} /> : <Lock size={12} />, go: A.toggleLock },
    { label: T('Supprimer', 'Delete'), icon: <Trash2 size={12} />, go: A.removeSel, danger: true },
  ];
  return (
    <div className="dots" style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 12px' }}>
        {busy || (running && !draft) ? (
          <div className="row" style={{ gap: 10, padding: '4px 4px 4px 12px', borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--accTx)', whiteSpace: 'nowrap' }}>
            <span className="pulse" /><span style={{ fontSize: 12 }}>{T("L'assistant modifie le document…", 'The assistant is editing the document…')}</span>
            <button className="btn sm" onClick={() => useAgentRun.getState().abort?.()}>{T('Stop', 'Stop')}</button>
          </div>
        ) : draft ? (
          <div className="row" style={{ gap: 8, padding: '5px 12px', borderRadius: 10, background: 'var(--acc)', color: 'var(--accInk)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {T('Aperçu de la proposition · contours pointillés = changements', 'Proposal preview · dashed outlines = changes')}
          </div>
        ) : sel.length ? (
          <div className="row" style={{ gap: 2, padding: 4, borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--panel)', overflowX: 'auto', maxWidth: '100%' }}>
            {ctx.filter((c) => c.show !== false).map((c) => (
              <button key={c.label} className="btn bare" style={{ height: 26, padding: '0 8px', color: c.danger ? 'var(--warn)' : 'var(--tx)' }} onClick={c.go}>{c.icon}{c.label}</button>
            ))}
          </div>
        ) : (
          <span className="faint ell" style={{ fontSize: 11 }}>{T('Clique un élément pour le sélectionner · glisse pour déplacer · double-clic pour modifier un texte · dépose une image sur la page', 'Click to select · drag to move · double-click to edit text · drop an image on the page')}</span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '0 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', containerType: 'size' }}>
        <Canvas page={page} readOnly={!!draft || busy || running} changed={draft ? changed : undefined} />
      </div>
    </div>
  );
}

function PagesStrip() {
  const T = useT();
  const pages = useDesign((s) => (s.draft ?? s.doc!.data).pages);
  const idx = useDesign((s) => s.pageIdx);
  const locked = useDesign((s) => !!s.draft || s.busy);
  const notify = useApp((s) => s.notify);
  return (
    <div style={{ borderTop: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', overflowX: 'auto' }}>
      {pages.map((p, i) => (
        <div key={p.id} className="col" style={{ gap: 4, flex: 'none' }}>
          <button onClick={() => useDesign.getState().setPage(i)} style={{ padding: 0, border: 0, background: 'transparent', width: Math.round(72 * (p.w / p.h)), maxWidth: 170, outline: i === idx ? '2px solid var(--acc)' : '1px solid var(--line2)', outlineOffset: 2, borderRadius: 3, overflow: 'hidden' }} title={`${T('Page', 'Page')} ${i + 1}`}>
            <div style={{ pointerEvents: 'none' }}><PageView page={p} style={{ maxHeight: 72 }} /></div>
          </button>
          <div className="row" style={{ gap: 2, fontSize: 11, color: 'var(--tx2)' }}>
            <span style={{ marginRight: 'auto' }}>{i + 1}</span>
            {i === idx && !locked && (
              <>
                <button className="btn bare icon" style={{ width: 18, height: 18 }} title={T('Déplacer à gauche', 'Move left')} onClick={() => A.movePage(i, -1)}><ChevronLeft size={11} /></button>
                <button className="btn bare icon" style={{ width: 18, height: 18 }} title={T('Déplacer à droite', 'Move right')} onClick={() => A.movePage(i, 1)}><ChevronRight size={11} /></button>
                <button className="btn bare icon" style={{ width: 18, height: 18 }} title={T('Dupliquer la page', 'Duplicate page')} onClick={() => A.duplicatePage(i)}><Copy size={11} /></button>
                <button className="btn bare icon" style={{ width: 18, height: 18 }} title={T('Supprimer la page', 'Delete page')} onClick={() => { if (!A.deletePage(i)) notify(T('Un document garde au moins une page.', 'A document keeps at least one page.'), 'err'); }}><Trash2 size={11} /></button>
              </>
            )}
          </div>
        </div>
      ))}
      <button disabled={locked} onClick={() => A.addPage()} style={{ flex: 'none', width: 110, height: 72, borderRadius: 3, border: '1px dashed var(--line2)', background: 'transparent', color: 'var(--tx2)', fontSize: 12, marginBottom: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Plus size={13} />{T('Page', 'Page')}</button>
    </div>
  );
}

function DesignMobile({ onExport, dialog, setDialog }: { onExport(): void; dialog: string | null; setDialog(d: null | 'export'): void }) {
  const T = useT();
  const go = useApp((s) => s.go);
  const doc = useDesign((s) => s.doc)!;
  const page = useDesign((s) => s.page());
  const sel = useDesign((s) => s.sel);
  const idx = useDesign((s) => s.pageIdx);
  const brand = useApp((s) => s.brand);
  const cur = sel.length === 1 ? page.els.find((e) => e.id === sel[0]) : undefined;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div className="row" style={{ height: 52, flex: 'none', padding: '0 10px', borderBottom: '1px solid var(--line)', background: 'var(--panel)' }}>
        <button className="logo-btn" onClick={() => go('home')}><LogoMark /></button>
        <span className="grow ell" style={{ fontWeight: 600 }}>{doc.name}</span>
        <button className="btn icon" style={{ width: 36, height: 36 }} onClick={() => useDesign.getState().undo()} aria-label={T('Annuler', 'Undo')}><Undo2 size={14} /></button>
        <button className="btn primary" style={{ height: 36 }} onClick={onExport}><Download size={13} />{T('Exporter', 'Export')}</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, containerType: 'size' }}>
        <Canvas page={page} />
      </div>
      {cur && (
        <div className="col" style={{ flex: 'none', borderTop: '1px solid var(--line)', background: 'var(--panel)', padding: '10px 12px', gap: 10 }}>
          {cur.type === 'text' && <input id="mob-text" className="input lg" value={cur.text ?? ''} onChange={(e) => A.updateEls([cur.id], { text: e.target.value })} style={{ height: 44, fontSize: 15 }} />}
          <div className="row" style={{ gap: 8 }}>
            {brand.colors.slice(0, 5).map((c) => <button key={c} onClick={() => A.updateEls([cur.id], cur.type === 'text' ? { color: c } : { fill: c })} style={{ width: 40, height: 40, borderRadius: 14, border: '1px solid var(--line2)', background: c, flex: 'none' }} />)}
            <div className="grow" />
            <button className="btn ghost danger" style={{ height: 40 }} onClick={A.removeSel}>{T('Supprimer', 'Delete')}</button>
          </div>
        </div>
      )}
      <div className="row" style={{ flex: 'none', gap: 10, padding: '10px 12px', overflowX: 'auto', borderTop: '1px solid var(--line)', background: 'var(--panel)' }}>
        {doc.data.pages.map((p, i) => (
          <button key={p.id} onClick={() => useDesign.getState().setPage(i)} style={{ flex: 'none', padding: 0, border: 0, width: Math.round(56 * (p.w / p.h)), outline: i === idx ? '2px solid var(--acc)' : '1px solid var(--line2)', outlineOffset: 2 }}>
            <div style={{ pointerEvents: 'none' }}><PageView page={p} /></div>
          </button>
        ))}
      </div>
      <div style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid var(--line)', background: 'var(--panel)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button className="btn bare" style={{ height: 56, color: 'var(--tx)' }} onClick={() => A.addText('title')}>{T('+ Texte', '+ Text')}</button>
        <label className="btn bare" style={{ height: 56, color: 'var(--tx)', cursor: 'pointer' }}>{T('+ Photo', '+ Photo')}
          <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files; if (!f?.length) return; const { importFiles } = await import('../lib/media'); const { ok } = await importFiles(f); ok.forEach((m) => A.addImageFromMedia(m)); e.target.value = ''; }} />
        </label>
        <button className="btn bare" style={{ height: 56, color: 'var(--tx)' }} onClick={() => { const cs = brand.colors; const i = cs.indexOf(page.bg); A.setPageBg(cs[(i + 1) % cs.length]); }}>{T('Fond', 'Background')}</button>
        <button className="btn bare" style={{ height: 56, color: 'var(--tx)' }} onClick={() => A.addPage()}>{T('+ Page', '+ Page')}</button>
      </div>
      {dialog === 'export' && <ExportDesign onClose={() => setDialog(null)} />}
    </div>
  );
}
