import { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Play } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { useDesign } from './store';
import type { El, FontKey, Page } from '../model/types';
import { Chips, ColorRow, NumField } from '../ui/kit';
import { align, animatePage, distribute, setPageBg, updateEls, arrange } from './actions';
import { FONTS, FONT_KEYS } from '../model/fonts';
import { contrast } from '../lib/util';
import { dimsLabel } from '../model/formats';

export function Inspector({ onPreviewAnim }: { onPreviewAnim(): void }) {
  const T = useT();
  const sel = useDesign((s) => s.sel);
  const page = useDesign((s) => s.page());
  const brand = useApp((s) => s.brand);
  const els = page.els.filter((e) => sel.includes(e.id));
  const cur = els.length === 1 ? els[0] : undefined;
  const upd = (p: Partial<El> | ((e: El) => void)) => updateEls(sel, p);
  const palette = [...new Set([...brand.colors, '#FFFFFF', '#000000'])];

  if (!els.length) return <PageProps page={page} onPreviewAnim={onPreviewAnim} />;

  const colorKey = cur?.type === 'text' ? 'color' : 'fill';
  const colorVal = cur ? (cur.type === 'text' ? cur.color : cur.fill) : undefined;
  const lowContrast = cur?.type === 'text' && !cur.fx?.bg && !cur.fx?.outline && contrast(cur.color ?? '#0F1115', page.bg) < 3;

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', minWidth: 0 }}>
      <span className="eyebrow">{cur ? cur.name : `${els.length} ${T('éléments sélectionnés', 'elements selected')}`}</span>
      {!cur && <span className="muted pretty" style={{ fontSize: 12 }}>{T('Maj+clic pour ajouter ou retirer un élément. Glisse pour déplacer la sélection.', 'Shift+click to add or remove an element. Drag to move the selection.')}</span>}
      <Group label={els.length > 1 ? T('Aligner la sélection', 'Align selection') : T('Aligner sur la page', 'Align to page')}>
        <Chips small value={undefined} onChange={(k) => align(k, els.length < 2)} options={[
          { id: 'left', label: T('Gauche', 'Left') }, { id: 'hcenter', label: T('Centre', 'Center') }, { id: 'right', label: T('Droite', 'Right') },
          { id: 'top', label: T('Haut', 'Top') }, { id: 'vcenter', label: T('Milieu', 'Middle') }, { id: 'bottom', label: T('Bas', 'Bottom') },
        ] as const as { id: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'; label: string }[]} />
      </Group>
      {els.length >= 3 && (
        <Group label={T('Répartir', 'Distribute')}>
          <Chips small value={undefined} onChange={(a) => distribute(a)} options={[{ id: 'h' as const, label: T('Horizontalement', 'Horizontally') }, { id: 'v' as const, label: T('Verticalement', 'Vertically') }]} />
        </Group>
      )}
      {cur && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumField id="insp-x" label="X" value={cur.x} onChange={(v) => upd({ x: v })} />
            <NumField id="insp-y" label="Y" value={cur.y} onChange={(v) => upd({ y: v })} />
            <NumField id="insp-w" label={T('Largeur', 'Width')} value={cur.w} onChange={(v) => upd({ w: Math.max(4, v) })} />
            <NumField id="insp-h" label={T('Hauteur', 'Height')} value={cur.h} onChange={(v) => upd({ h: Math.max(4, v) })} />
            <NumField id="insp-rot" label={T('Rotation (°)', 'Rotation (°)')} value={cur.rot ?? 0} onChange={(v) => upd({ rot: v })} />
            <NumField id="insp-op" label={T('Opacité (%)', 'Opacity (%)')} value={Math.round((cur.opacity ?? 1) * 100)} onChange={(v) => upd({ opacity: Math.max(0, Math.min(100, v)) / 100 })} />
          </div>
          {cur.type === 'text' && <TextProps el={cur} upd={upd} />}
          {(cur.type === 'rect' || cur.type === 'image') && (
            <NumField id="insp-radius" label={T('Arrondi des coins', 'Corner radius')} value={cur.radius ?? 0} onChange={(v) => upd({ radius: Math.max(0, v) })} />
          )}
          {cur.type === 'image' && (
            <Group label={T('Cadrage', 'Fit')}>
              <Chips small value={cur.fit ?? 'cover'} onChange={(v) => upd({ fit: v })} options={[{ id: 'cover' as const, label: T('Remplir', 'Fill') }, { id: 'contain' as const, label: T('Contenir', 'Fit') }]} />
            </Group>
          )}
          {(cur.type === 'chart' || cur.type === 'table' || cur.type === 'qr') && <DataProps el={cur} upd={upd} />}
        </>
      )}
      <Group label={colorKey === 'color' ? T('Couleur du texte', 'Text color') : T('Couleur', 'Color')}>
        <ColorRow colors={palette} value={colorVal} onPick={(c) => upd((e) => { if (e.type === 'text') e.color = c; else e.fill = c; })} />
      </Group>
      {lowContrast && <div className="warn" style={{ fontSize: 12 }}>{T('Contraste faible avec le fond : le texte sera difficile à lire. Ajoute un fond ou un contour, ou change la couleur.', 'Low contrast with the background: the text will be hard to read. Add a background or outline, or change the color.')} ({contrast(cur!.color ?? '#0F1115', page.bg).toFixed(1)}:1)</div>}
      {cur && (
        <Group label={T('Animation d’entrée', 'Entrance animation')}>
          <Chips small value={cur.anim ?? 'none'} onChange={(v) => upd({ anim: v })} options={[
            { id: 'none' as const, label: T('Aucune', 'None') }, { id: 'fade' as const, label: T('Fondu', 'Fade') }, { id: 'slide' as const, label: T('Glissement', 'Slide') },
            { id: 'zoom' as const, label: 'Zoom' }, { id: 'pop' as const, label: T('Rebond', 'Pop') },
          ]} />
          {cur.anim && cur.anim !== 'none' && (
            <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 110 }}><NumField id="insp-delay" label={T('Délai (s)', 'Delay (s)')} step={0.1} value={cur.delay ?? 0} onChange={(v) => upd({ delay: Math.max(0, v) })} /></div>
              <button className="btn sm" style={{ marginTop: 16 }} onClick={onPreviewAnim}><Play size={11} />{T('Aperçu', 'Preview')}</button>
            </div>
          )}
        </Group>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="col" style={{ gap: 6 }}><span style={{ fontSize: 11, color: 'var(--tx3)' }}>{label}</span>{children}</div>;
}

function TextProps({ el, upd }: { el: El; upd(p: Partial<El> | ((e: El) => void)): void }) {
  const T = useT();
  return (
    <>
      <label className="field"><span>{T('Texte', 'Text')}</span>
        <textarea id="insp-text" className="input" rows={3} value={el.text ?? ''} onChange={(e) => upd({ text: e.target.value })} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label className="field"><span>{T('Police', 'Font')}</span>
          <select id="insp-font" className="input" value={el.font ?? 'sans'} onChange={(e) => upd({ font: e.target.value as FontKey })} style={{ height: 28 }}>
            {FONT_KEYS.map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
          </select>
        </label>
        <NumField id="insp-size" label={T('Taille', 'Size')} value={el.size ?? 48} onChange={(v) => upd({ size: Math.max(4, v) })} />
        <label className="field"><span>{T('Graisse', 'Weight')}</span>
          <select id="insp-weight" className="input" value={el.weight ?? 700} onChange={(e) => upd({ weight: Number(e.target.value) })} style={{ height: 28 }}>
            {[400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </label>
        <NumField id="insp-lh" label={T('Interligne', 'Line height')} step={0.05} value={el.lh ?? 1.1} onChange={(v) => upd({ lh: Math.max(0.6, v) })} />
      </div>
      <Group label={T('Alignement du texte', 'Text alignment')}>
        <Chips small value={el.align ?? 'left'} onChange={(v) => upd({ align: v })} options={[{ id: 'left' as const, label: T('Gauche', 'Left') }, { id: 'center' as const, label: T('Centre', 'Center') }, { id: 'right' as const, label: T('Droite', 'Right') }]} />
      </Group>
      <Group label={T('Effets', 'Effects')}>
        <Chips small value={[el.fx?.shadow ? 'shadow' : '', el.fx?.outline ? 'outline' : '', el.fx?.bg ? 'bg' : '', el.upper ? 'upper' : ''].filter(Boolean) as ('shadow' | 'outline' | 'bg' | 'upper')[]}
          onChange={(k) => upd((e) => { if (k === 'upper') e.upper = !e.upper; else e.fx = { ...e.fx, [k]: !e.fx?.[k] }; })}
          options={[{ id: 'shadow' as const, label: T('Ombre', 'Shadow') }, { id: 'outline' as const, label: T('Contour', 'Outline') }, { id: 'bg' as const, label: T('Fond', 'Background') }, { id: 'upper' as const, label: 'MAJ' }]} />
      </Group>
    </>
  );
}

function DataProps({ el, upd }: { el: El; upd(p: Partial<El> | ((e: El) => void)): void }) {
  const T = useT();
  const initial = el.type === 'chart' ? (el.data ?? []).map((r) => `${r[0]};${String(r[1]).replace('.', ',')}`).join('\n') : el.type === 'table' ? (el.rows ?? []).map((r) => r.join(';')).join('\n') : el.qr ?? '';
  const [raw, setRaw] = useState(initial);
  const [forId, setForId] = useState(el.id);
  if (forId !== el.id) { setForId(el.id); setRaw(initial); }
  const label = el.type === 'chart' ? T('Données — libellé;valeur, une ligne par barre', 'Data — label;value, one line per bar') : el.type === 'table' ? T('Cellules — ; entre colonnes, une ligne par rangée', 'Cells — ; between columns, one line per row') : T('Contenu du QR (URL ou texte)', 'QR content (URL or text)');
  const set = (v: string) => {
    setRaw(v);
    if (el.type === 'qr') { upd({ qr: v }); return; }
    const lines = v.split(/\r?\n/).filter((l) => l.trim());
    if (el.type === 'chart') upd({ data: lines.map((l) => { const [a, b] = l.split(';'); return [(a ?? '').trim(), parseFloat(String(b ?? '0').replace(',', '.')) || 0] as [string, number]; }) });
    else upd({ rows: lines.map((l) => l.split(';').map((c) => c.trim())) });
  };
  return (
    <>
      <label className="field"><span>{label}</span>
        <textarea id="insp-data" className="input mono" rows={5} spellCheck={false} value={raw} onChange={(e) => set(e.target.value)} style={{ fontSize: 11 }} />
      </label>
      {el.type === 'chart' && <Group label={T('Type', 'Type')}><Chips small value={el.kind ?? 'col'} onChange={(v) => upd({ kind: v })} options={[{ id: 'col' as const, label: T('Colonnes', 'Columns') }, { id: 'bar' as const, label: T('Barres', 'Bars') }]} /></Group>}
      {el.type === 'qr' && <span className="faint" style={{ fontSize: 11 }}>{T('Code QR réel, lisible par un téléphone (correction d’erreur M).', 'Real, scannable QR code (error correction M).')}</span>}
    </>
  );
}

function PageProps({ page, onPreviewAnim }: { page: Page; onPreviewAnim(): void }) {
  const T = useT();
  const brand = useApp((s) => s.brand);
  const pageIdx = useDesign((s) => s.pageIdx);
  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
      <span className="eyebrow">{T('Page', 'Page')} {pageIdx + 1} · {dimsLabel(page.w, page.h)}</span>
      <span className="muted pretty" style={{ fontSize: 12 }}>{T('Sélectionne un élément pour le modifier. Maj+clic ou glisser sur la page pour en sélectionner plusieurs.', 'Select an element to edit it. Shift+click or drag on the page to select several.')}</span>
      <Group label={T('Fond de la page', 'Page background')}>
        <ColorRow colors={[...new Set([...brand.colors, '#FFFFFF', '#000000'])]} value={page.bg} onPick={setPageBg} />
      </Group>
      <div className="col" style={{ gap: 6 }}>
        <button className="btn" onClick={() => animatePage(page)}>{T('Animer toute la page', 'Animate whole page')}</button>
        <button className="btn ghost" onClick={onPreviewAnim}><Play size={12} />{T('Aperçu des animations', 'Preview animations')}</button>
      </div>
    </div>
  );
}

export function Layers() {
  const T = useT();
  const page = useDesign((s) => s.page());
  const sel = useDesign((s) => s.sel);
  const select = useDesign((s) => s.select);
  const [renaming, setRenaming] = useState<string | null>(null);
  const els = [...page.els].reverse();
  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
      {els.length === 0 && <span className="faint" style={{ fontSize: 12, padding: 8 }}>{T('Cette page est vide.', 'This page is empty.')}</span>}
      {els.map((e) => (
        <div key={e.id} onClick={(ev) => select(ev.shiftKey ? [...sel, e.id] : [e.id])} className="row" style={{ height: 34, padding: '0 6px 0 8px', borderRadius: 10, background: sel.includes(e.id) ? 'var(--panel2)' : 'transparent', cursor: 'pointer', gap: 6 }}>
          <span className="mono faint" style={{ fontSize: 10, width: 38 }}>{e.type}</span>
          {renaming === e.id
            ? <input autoFocus className="input grow" defaultValue={e.name} style={{ height: 24 }} onBlur={(ev) => { updateEls([e.id], { name: ev.target.value || e.name }); setRenaming(null); }} onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }} />
            : <span className="grow ell" onDoubleClick={() => setRenaming(e.id)} style={{ fontSize: 12, opacity: e.hidden ? 0.45 : 1 }}>{e.name}{e.compId ? ' ◆' : ''}{e.groupId ? ' ⧉' : ''}</span>}
          <button className="btn bare icon" style={{ width: 22, height: 22 }} title={T('Monter', 'Up')} onClick={(ev) => { ev.stopPropagation(); select([e.id]); arrange('forward'); }}><ChevronUp size={12} /></button>
          <button className="btn bare icon" style={{ width: 22, height: 22 }} title={T('Descendre', 'Down')} onClick={(ev) => { ev.stopPropagation(); select([e.id]); arrange('backward'); }}><ChevronDown size={12} /></button>
          <button className="btn bare icon" style={{ width: 22, height: 22 }} title={e.hidden ? T('Afficher', 'Show') : T('Masquer', 'Hide')} onClick={(ev) => { ev.stopPropagation(); updateEls([e.id], { hidden: !e.hidden }); }}>{e.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</button>
          <button className="btn bare icon" style={{ width: 22, height: 22 }} title={e.locked ? T('Déverrouiller', 'Unlock') : T('Verrouiller', 'Lock')} onClick={(ev) => { ev.stopPropagation(); updateEls([e.id], { locked: !e.locked }); }}>{e.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
        </div>
      ))}
      <span className="faint" style={{ fontSize: 11, padding: '8px 8px 0' }}>{T('Double-clique un nom pour le renommer. ◆ composant lié, ⧉ groupe.', 'Double-click a name to rename it. ◆ linked component, ⧉ group.')}</span>
    </div>
  );
}
