import { useEffect, useRef, useState } from 'react';
import { zipSync } from 'fflate';
import { jsPDF } from 'jspdf';
import { useApp, useT } from '../store/app';
import { useDesign } from './store';
import { Chips, Modal, Progress, Switch } from '../ui/kit';
import { canvasBlob, pageAnimDuration, renderPage } from './render';
import { saveFile } from '../lib/claude';
import { resizeTo } from './actions';
import { PageView } from './ElementView';
import { FORMATS } from '../model/formats';
import { slug } from '../lib/util';
import { recordCanvas, bestVideoMime } from '../lib/record';
import { notify as pushNotif } from '../lib/notify';
import type { Page } from '../model/types';

// Export (SPEC §5.14): PNG / JPG / PDF / animated video, no watermark, done in the browser.

type Fmt = 'png' | 'jpg' | 'pdf' | 'video';

export function ExportDesign({ onClose }: { onClose(): void }) {
  const T = useT();
  const doc = useDesign((s) => s.doc)!;
  const pageIdx = useDesign((s) => s.pageIdx);
  const notify = useApp((s) => s.notify);
  const pages = doc.data.pages;
  const [fmt, setFmt] = useState<Fmt>('png');
  const [scope, setScope] = useState<'current' | 'all'>(pages.length > 1 ? 'all' : 'current');
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(false);
  const [name, setName] = useState(doc.name);
  const [state, setState] = useState<{ phase: 'idle' | 'run' | 'done'; pct: number; file?: string; blob?: Blob; mime?: string }>({ phase: 'idle', pct: 0 });
  const cancel = useRef(false);
  const vmime = bestVideoMime();
  const sel: Page[] = scope === 'all' ? pages : [pages[pageIdx]];
  const p0 = sel[0];
  const maxSide = Math.max(p0.w, p0.h) * scale;

  const run = async () => {
    cancel.current = false;
    setState({ phase: 'run', pct: 0 });
    const base = slug(name);
    try {
      let blob: Blob;
      let file: string;
      if (fmt === 'pdf') {
        const first = sel[0];
        const pdf = new jsPDF({ orientation: first.w > first.h ? 'l' : 'p', unit: 'px', format: [first.w, first.h], hotfixes: ['px_scaling'], compress: true });
        for (let i = 0; i < sel.length; i++) {
          if (cancel.current) throw new Error('cancel');
          const p = sel[i];
          if (i > 0) pdf.addPage([p.w, p.h], p.w > p.h ? 'l' : 'p');
          const c = await renderPage(p, Math.min(p.w * scale, 6000));
          pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, p.w, p.h);
          setState((s) => ({ ...s, pct: ((i + 1) / sel.length) * 100 }));
        }
        blob = pdf.output('blob');
        file = `${base}.pdf`;
      } else if (fmt === 'video') {
        const p = sel[0];
        const W = Math.round(Math.min(1920, p.w) / 2) * 2;
        const c = document.createElement('canvas');
        const dur = pageAnimDuration(p);
        await renderPage(p, W, { canvas: c, t: 0 });
        blob = await recordCanvas(c, dur, async (t) => { await renderPage(p, W, { canvas: c, t }); }, (pct) => setState((s) => ({ ...s, pct })), () => cancel.current);
        file = `${base}.${vmime.ext}`;
      } else {
        const type = fmt === 'png' ? 'image/png' : 'image/jpeg';
        const files: Record<string, Uint8Array> = {};
        let single: Blob | null = null;
        for (let i = 0; i < sel.length; i++) {
          if (cancel.current) throw new Error('cancel');
          const p = sel[i];
          const c = await renderPage(p, Math.round(p.w * scale), { transparent: fmt === 'png' && transparent });
          const b = await canvasBlob(c, type, 0.92);
          if (sel.length === 1) single = b;
          else files[`${base}-${String(i + 1).padStart(2, '0')}.${fmt}`] = new Uint8Array(await b.arrayBuffer());
          setState((s) => ({ ...s, pct: ((i + 1) / sel.length) * 100 }));
        }
        if (single) { blob = single; file = `${base}.${fmt}`; }
        else { blob = new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }); file = `${base}.zip`; }
      }
      setState({ phase: 'done', pct: 100, file, blob });
      pushNotif({ kind: 'export', text: T(`Export terminé : ${file}`, `Export complete: ${file}`), to: 'design' });
    } catch (e) {
      if ((e as Error).message === 'cancel') { setState({ phase: 'idle', pct: 0 }); return; }
      notify(T('L’export a échoué : ', 'Export failed: ') + (e as Error).message, 'err');
      setState({ phase: 'idle', pct: 0 });
    }
  };

  const save = async () => {
    if (!state.blob || !state.file) return;
    const r = await saveFile(state.file, state.blob);
    if (r === 'saved') notify(T('Fichier enregistré.', 'File saved.'));
    else if (r === 'failed') notify(T('Enregistrement impossible dans cette vue.', 'Saving is not possible in this view.'), 'err');
  };

  const fmtOpts: { id: Fmt; label: string }[] = [
    { id: 'png', label: 'PNG' }, { id: 'jpg', label: 'JPG' }, { id: 'pdf', label: 'PDF' },
    { id: 'video', label: T('Vidéo animée', 'Animated video') + ` (${vmime.ext.toUpperCase()})` },
  ];
  return (
    <Modal title={T('Exporter', 'Export')} onClose={onClose}
      footer={state.phase === 'idle'
        ? <><span className="faint pretty grow" style={{ fontSize: 11 }}>{T('Aucun filigrane. Le fichier est produit sur cet appareil.', 'No watermark. The file is produced on this device.')}</span><button className="btn primary md" onClick={() => void run()}>{T('Exporter', 'Export')}</button></>
        : state.phase === 'done'
          ? <><button className="btn md" onClick={() => setState({ phase: 'idle', pct: 0 })}>{T('Autre export', 'Another export')}</button><button className="btn primary md" onClick={() => void save()}>{T('Télécharger', 'Download')}</button></>
          : <button className="btn md" onClick={() => { cancel.current = true; }}>{T('Annuler', 'Cancel')}</button>}>
      {state.phase === 'idle' && (
        <>
          <label className="field"><span className="eyebrow">{T('Nom', 'Name')}</span><input id="ex-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Format', 'Format')}</span><Chips value={fmt} onChange={setFmt} options={fmtOpts} /></div>
          {fmt !== 'video' && pages.length > 1 && (
            <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Pages', 'Pages')}</span>
              <Chips value={scope} onChange={setScope} options={[{ id: 'current' as const, label: T(`Page ${pageIdx + 1}`, `Page ${pageIdx + 1}`) }, { id: 'all' as const, label: T(`Toutes (${pages.length})`, `All (${pages.length})`) }]} />
            </div>
          )}
          {fmt !== 'video' && (
            <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Taille', 'Size')}</span>
              <Chips value={scale} onChange={setScale} options={[0.5, 1, 2].map((s) => ({ id: s, label: `${s}× · ${Math.round(p0.w * s)}×${Math.round(p0.h * s)}`, disabled: Math.max(p0.w, p0.h) * s > 8000 }))} />
            </div>
          )}
          {fmt === 'png' && <div className="row"><Switch on={transparent} onChange={setTransparent} /><span style={{ fontSize: 12 }}>{T('Fond transparent', 'Transparent background')}</span></div>}
          {fmt === 'video' && <span className="muted pretty" style={{ fontSize: 12 }}>{T(`Page ${pageIdx + 1} avec ses animations d’entrée, ${pageAnimDuration(pages[pageIdx]).toFixed(1)} s, enregistrée en temps réel.`, `Page ${pageIdx + 1} with its entrance animations, ${pageAnimDuration(pages[pageIdx]).toFixed(1)} s, recorded in real time.`)}</span>}
          {fmt === 'pdf' && <span className="faint pretty" style={{ fontSize: 12 }}>{T('PDF en RVB, une page par page du document, images à la résolution choisie. Le CMJN n’est pas géré dans cette version.', 'RGB PDF, one page per document page, images at the chosen resolution. CMYK is not supported in this version.')}</span>}
          <div className="mono muted" style={{ fontSize: 11, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>
            {fmt === 'video' ? `${vmime.ext.toUpperCase()} · ${Math.min(1920, p0.w)}px · 30 fps` : `${fmt.toUpperCase()} · ${sel.length} page(s) · ${Math.round(maxSide)} px ${T('max', 'max')}${sel.length > 1 && fmt !== 'pdf' ? ' · zip' : ''}`}
          </div>
        </>
      )}
      {state.phase === 'run' && <div style={{ padding: '18px 0' }}><Progress label={T('Export en cours', 'Exporting')} pct={state.pct} /></div>}
      {state.phase === 'done' && (
        <div className="col" style={{ gap: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{T('Export terminé', 'Export complete')}</span>
          <div className="mono muted" style={{ fontSize: 11, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}>{state.file} · {((state.blob?.size ?? 0) / 1024 / 1024).toFixed(2)} Mo</div>
        </div>
      )}
    </Modal>
  );
}

export function ResizeDialog({ onClose }: { onClose(): void }) {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const page = useDesign((s) => s.page());
  const opts = FORMATS.filter((f) => f.kind === 'design' && !(f.w === page.w && f.h === page.h));
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <Modal title={T('Décliner la page', 'Resize the page')} onClose={onClose} width={520}
      footer={<><button className="btn md" onClick={onClose}>{T('Annuler', 'Cancel')}</button><button className="btn primary md" disabled={!picked.length} onClick={() => { const n = resizeTo(FORMATS.filter((f) => picked.includes(f.id))); notify(T(`${n} page(s) ajoutée(s) à la fin du document.`, `${n} page(s) added at the end of the document.`)); onClose(); }}>{T('Décliner', 'Resize')} {picked.length ? `(${picked.length})` : ''}</button></>}>
      <span className="muted pretty" style={{ fontSize: 12 }}>{T('Crée une copie de la page dans chaque format choisi : mise à l’échelle, centrage, fonds pleine page étirés, taille de texte minimale. Pour réorganiser la mise en page, demande ensuite à l’assistant.', 'Creates a copy of the page in each selected format: scaled, centered, full-page backgrounds stretched, minimum text size. To rearrange the layout, ask the assistant afterwards.')}</span>
      <div className="col" style={{ gap: 6 }}>
        {opts.map((f) => {
          const on = picked.includes(f.id);
          return (
            <button key={f.id} onClick={() => setPicked(on ? picked.filter((x) => x !== f.id) : [...picked, f.id])} className="row" style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${on ? 'var(--accTx)' : 'var(--line2)'}`, background: on ? 'var(--accSoft)' : 'transparent', textAlign: 'left', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid var(--line2)', background: on ? 'var(--acc)' : 'transparent', flex: 'none' }} />
              <span className="grow">{T(f.fr, f.en)}</span><span className="mono faint" style={{ fontSize: 11 }}>{f.dims}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function Present({ pages, start, onClose }: { pages: Page[]; start: number; onClose(): void }) {
  const T = useT();
  const [i, setI] = useState(start);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.requestFullscreen?.().catch(() => undefined);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); setI((x) => Math.min(pages.length - 1, x + 1)); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setI((x) => Math.max(0, x - 1));
    };
    const fs = () => { if (!document.fullscreenElement) onClose(); };
    window.addEventListener('keydown', key, true);
    document.addEventListener('fullscreenchange', fs);
    return () => {
      window.removeEventListener('keydown', key, true);
      document.removeEventListener('fullscreenchange', fs);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [pages.length, onClose]);
  const p = pages[i];
  return (
    <div ref={ref} onClick={() => (i < pages.length - 1 ? setI(i + 1) : onClose())} style={{ position: 'fixed', inset: 0, zIndex: 95, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', containerType: 'size', gap: 12, cursor: 'pointer' }}>
      <div style={{ width: `min(96cqw, calc(88cqh * ${p.w / p.h}))` }}>
        <PageView key={p.id + i} page={p} animate />
      </div>
      <span className="mono" style={{ fontSize: 11, color: '#8A8D93' }}>{i + 1} / {pages.length} · {T('→ ou clic : suivante · ← : précédente · Échap : quitter', '→ or click: next · ←: previous · Esc: exit')}</span>
    </div>
  );
}

export function AnimPreview({ page, onClose }: { page: Page; onClose(): void }) {
  const [k, setK] = useState(0);
  const T = useT();
  return (
    <Modal title={T('Aperçu des animations', 'Animation preview')} onClose={onClose} width={720} footer={<button className="btn md" onClick={() => setK(k + 1)}>{T('Rejouer', 'Replay')}</button>}>
      <div style={{ width: `min(100%, calc(60vh * ${page.w / page.h}))`, alignSelf: 'center' }}>
        <PageView key={k} page={page} animate />
      </div>
    </Modal>
  );
}
