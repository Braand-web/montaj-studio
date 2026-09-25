import { useEffect, useState } from 'react';
import { Image as ImageIcon, Palette, Shapes, Type, WandSparkles, Upload } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { useDesign } from './store';
import { addImageFromMedia, addShape, addText, setImageMedia, updateEls, setPageBg, insertComponent, addVector } from './actions';
import { SHAPES, shapePath } from './shapes';
import { importFiles, listMedia, onMediaChange } from '../lib/media';
import type { MediaItem } from '../model/types';
import { getSample, sampleErrorText } from '../lib/claude';
import { tracked } from '../lib/usage';
import { FONTS } from '../model/fonts';

export type LeftTab = 'text' | 'shapes' | 'media' | 'brand' | 'ai';

export const LEFT_TABS: { id: LeftTab; fr: string; en: string; color: string; icon: typeof Type }[] = [
  { id: 'text', fr: 'Texte', en: 'Text', color: '#0A84FF', icon: Type },
  { id: 'shapes', fr: 'Éléments', en: 'Elements', color: '#30D158', icon: Shapes },
  { id: 'media', fr: 'Médias', en: 'Media', color: '#FF9F0A', icon: ImageIcon },
  { id: 'brand', fr: 'Marque', en: 'Brand', color: '#BF5AF2', icon: Palette },
  { id: 'ai', fr: 'IA', en: 'AI', color: '#5E5CE6', icon: WandSparkles },
];

export function Rail({ tab, setTab }: { tab: LeftTab; setTab(t: LeftTab): void }) {
  const T = useT();
  return (
    <div className="rail">
      {LEFT_TABS.map((t) => {
        const I = t.icon;
        const on = tab === t.id;
        return (
          <button key={t.id} className={on ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="ic" style={{ background: on ? t.color : 'color-mix(in oklab, ' + t.color + ' 16%, transparent)' }}><I size={17} color={on ? '#fff' : t.color} /></span>
            {T(t.fr, t.en)}
          </button>
        );
      })}
    </div>
  );
}

export function useImages() {
  const [items, setItems] = useState<MediaItem[]>([]);
  useEffect(() => {
    const load = () => { void listMedia().then(setItems); };
    load();
    const off = onMediaChange(load);
    return () => { off(); };
  }, []);
  return items;
}

export function LeftPanel({ tab }: { tab: LeftTab }) {
  const T = useT();
  const title = LEFT_TABS.find((t) => t.id === tab)!;
  return (
    <div className="side">
      <div style={{ padding: '12px 12px 8px', fontWeight: 600 }}>{T(title.fr, title.en)}</div>
      <div className="side-b">
        {tab === 'text' && <TextTab />}
        {tab === 'shapes' && <ShapesTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'brand' && <BrandTab />}
        {tab === 'ai' && <AiTab />}
      </div>
    </div>
  );
}

const itemBtn: React.CSSProperties = { textAlign: 'left', padding: 10, borderRadius: 10, border: '1px solid transparent', background: 'var(--panel2)' };

function TextTab() {
  const T = useT();
  return (
    <>
      <button style={{ ...itemBtn, fontSize: 20, fontWeight: 800 }} onClick={() => addText('title')}>{T('Ajouter un titre', 'Add a heading')}</button>
      <button style={{ ...itemBtn, fontSize: 15, fontWeight: 600 }} onClick={() => addText('subtitle')}>{T('Ajouter un sous-titre', 'Add a subheading')}</button>
      <button style={{ ...itemBtn, fontSize: 12 }} onClick={() => addText('body')}>{T('Ajouter du texte courant', 'Add body text')}</button>
      <span className="faint pretty" style={{ fontSize: 11, marginTop: 4 }}>{T('Double-clique sur un texte pour le modifier directement sur la page.', 'Double-click a text to edit it right on the page.')}</span>
    </>
  );
}

function ShapesTab() {
  const T = useT();
  const doc = useDesign((s) => s.doc);
  const shapes: { id: 'rect' | 'circle' | 'line' | 'image'; label: string; w: number; h: number; r: string }[] = [
    { id: 'rect', label: T('Rectangle', 'Rectangle'), w: 34, h: 22, r: '4px' },
    { id: 'circle', label: T('Cercle', 'Circle'), w: 26, h: 26, r: '50%' },
    { id: 'line', label: T('Trait', 'Line'), w: 34, h: 3, r: '2px' },
    { id: 'image', label: T('Cadre photo', 'Photo frame'), w: 30, h: 24, r: '4px' },
  ];
  const comps = new Map<string, { name: string; n: number }>();
  doc?.data.pages.forEach((p) => p.els.forEach((e) => { if (e.compId) { const c = comps.get(e.compId); comps.set(e.compId, { name: c?.name ?? e.name, n: (c?.n ?? 0) + 1 }); } }));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {shapes.map((s) => (
          <button key={s.id} onClick={() => addShape(s.id)} style={{ height: 64, borderRadius: 10, border: '1px solid transparent', background: 'var(--panel2)', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ width: s.w, height: s.h, borderRadius: s.r, background: 'var(--tx2)' }} />{s.label}
          </button>
        ))}
        {SHAPES.map((x) => (
          <button key={x.k} onClick={() => addVector(x.k)} title={T(x.fr, x.en)} style={{ height: 64, borderRadius: 10, border: '1px solid transparent', background: 'var(--panel2)', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <svg width={30} height={30 * x.ratio} viewBox={`0 0 30 ${30 * x.ratio}`} aria-hidden><path d={shapePath(x.k, 30, 30 * x.ratio)} fill="var(--tx2)" /></svg>{T(x.fr, x.en)}
          </button>
        ))}
      </div>
      {[
        { id: 'chart' as const, l: T('Graphique', 'Chart'), sub: T('depuis des données', 'from data') },
        { id: 'table' as const, l: T('Tableau', 'Table'), sub: T('cellules éditables', 'editable cells') },
        { id: 'qr' as const, l: 'QR code', sub: T('URL, texte', 'URL, text') },
      ].map((x) => (
        <button key={x.id} onClick={() => addShape(x.id)} style={{ ...itemBtn, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{x.l}</span><span className="faint" style={{ fontSize: 10 }}>{x.sub}</span></button>
      ))}
      {comps.size > 0 && (
        <>
          <span className="eyebrow" style={{ marginTop: 6 }}>{T('Composants liés', 'Linked components')}</span>
          {[...comps.entries()].map(([id, c]) => (
            <div key={id} className="row" style={{ justifyContent: 'space-between', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--accTx)' }}>
              <span className="ell" style={{ fontSize: 12 }}>{c.name} <span className="faint" style={{ fontSize: 10 }}>· {c.n} {T('copies', 'copies')}</span></span>
              <button className="btn sm" onClick={() => insertComponent(id)}>{T('Insérer', 'Insert')}</button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

function MediaTab() {
  const T = useT();
  const items = useImages().filter((m) => m.kind === 'image');
  const notify = useApp((s) => s.notify);
  const sel = useDesign((s) => s.sel);
  const page = useDesign((s) => (s.doc ? s.page() : null));
  const selImg = page?.els.find((e) => sel.length === 1 && e.id === sel[0] && e.type === 'image');
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const { ok, rejected } = await importFiles(files);
    const imgs = ok.filter((m) => m.kind === 'image');
    if (imgs[0] && selImg) setImageMedia(selImg.id, imgs[0]);
    else imgs.forEach((m) => addImageFromMedia(m));
    if (rejected.length) notify(T('Format non pris en charge : ', 'Unsupported format: ') + rejected.join(', '), 'err');
  };
  return (
    <>
      <label style={{ margin: '0 0 4px', padding: '14px 10px', borderRadius: 10, border: '1px dashed var(--line2)', color: 'var(--tx2)', fontSize: 12, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Upload size={16} />
        {T('Importer des images ou les déposer sur la page', 'Import images or drop them on the page')}
        <input id="design-import" type="file" accept="image/*" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
      </label>
      {selImg && <span className="acc" style={{ fontSize: 11 }}>{T('Clique une image pour remplacer le contenu du cadre sélectionné.', 'Click an image to replace the selected frame’s content.')}</span>}
      {items.length === 0 && <span className="faint pretty" style={{ fontSize: 11 }}>{T('Aucune image pour l’instant. Tes imports restent sur cet appareil.', 'No images yet. Your imports stay on this device.')}</span>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.map((m) => (
          <button key={m.id} title={m.name} onClick={() => (selImg ? setImageMedia(selImg.id, m) : addImageFromMedia(m))} style={{ padding: 0, border: '1px solid var(--line2)', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: m.thumb ? `url(${m.thumb}) center/cover` : 'var(--panel2)' }} />
        ))}
      </div>
    </>
  );
}

function BrandTab() {
  const T = useT();
  const brand = useApp((s) => s.brand);
  const sel = useDesign((s) => s.sel);
  const page = useDesign((s) => (s.doc ? s.page() : null));
  const images = useImages();
  const logo = images.find((m) => m.id === brand.logoMediaId);
  const pick = (c: string) => {
    if (!sel.length) { setPageBg(c); return; }
    updateEls(sel, (e) => { if (e.type === 'text') e.color = c; else e.fill = c; });
  };
  return (
    <>
      <div className="faint pretty" style={{ fontSize: 11 }}>{T('Clique une couleur : elle s’applique à la sélection, ou au fond de la page si rien n’est sélectionné.', 'Click a color: it applies to the selection, or to the page background when nothing is selected.')}</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {brand.colors.map((c) => <button key={c} title={c} onClick={() => pick(c)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--line2)', background: c }} />)}
      </div>
      {logo
        ? <button className="btn" onClick={() => addImageFromMedia(logo)}>{T('Ajouter le logo', 'Add logo')}</button>
        : <span className="faint" style={{ fontSize: 11 }}>{T('Ajoute ton logo dans le Kit de marque pour l’insérer ici.', 'Add your logo in the Brand kit to insert it here.')}</span>}
      <span className="eyebrow" style={{ marginTop: 6 }}>{T('Polices', 'Fonts')}</span>
      {(['heading', 'body'] as const).map((r) => (
        <button key={r} className="btn" style={{ justifyContent: 'space-between', fontFamily: FONTS[brand.fonts[r]].css }} disabled={!page?.els.some((e) => sel.includes(e.id) && e.type === 'text')} onClick={() => updateEls(sel, (e) => { if (e.type === 'text') e.font = brand.fonts[r]; })}>
          <span>{r === 'heading' ? T('Titre', 'Heading') : T('Corps', 'Body')}</span><span className="faint" style={{ fontSize: 10 }}>{FONTS[brand.fonts[r]].label}</span>
        </button>
      ))}
      <button className="btn ghost" onClick={() => useApp.getState().go('brand')}>{T('Modifier le kit de marque', 'Edit brand kit')}</button>
    </>
  );
}

const LANGS = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'], ['ar', 'العربية'], ['wo', 'Wolof'], ['sw', 'Kiswahili']];

function AiTab() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const brand = useApp((s) => s.brand);
  const notify = useApp((s) => s.notify);
  const sel = useDesign((s) => s.sel);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [avail, setAvail] = useState<boolean | null>(null);
  useEffect(() => { void getSample().then((s) => setAvail(!!s)); }, []);
  const fr = lang === 'fr';

  const write = async () => {
    const sample = await getSample();
    if (!sample || !prompt.trim()) return;
    setBusy('write');
    try {
      const { text } = await tracked('ai-write', 'quick', () => sample(
        `Write short copy for a visual design. Brief: ${prompt}\nBrand voice: ${brand.tone}\nLanguage: ${fr ? 'French' : 'English'}.\nReply with only the text to place on the design, no quotes, no preamble, at most 2 short lines.`,
        { modelTier: 'quick', cache: false },
      ), (r) => r.text.length);
      const clean = text.trim().replace(/^["«»“”]+|["«»“”]+$/g, '');
      const st = useDesign.getState();
      const target = st.page().els.find((e) => sel.length === 1 && e.id === sel[0] && e.type === 'text');
      if (target) updateEls([target.id], { text: clean });
      else { const id = addText('subtitle'); updateEls([id], { text: clean }); }
      notify(T('Texte ajouté. ⌘Z pour annuler.', 'Text added. ⌘Z to undo.'));
    } catch (e) {
      notify(sampleErrorText((e as { code?: string }).code, fr), 'err');
    } finally { setBusy(null); }
  };

  const translate = async (code: string, name: string) => {
    const sample = await getSample();
    if (!sample) return;
    const st = useDesign.getState();
    const texts = st.page().els.filter((e) => e.type === 'text' && e.text?.trim());
    if (!texts.length) { notify(T('Aucun texte sur cette page.', 'No text on this page.'), 'err'); return; }
    setBusy('tr-' + code);
    try {
      const src = Object.fromEntries(texts.map((e) => [e.id, e.text]));
      const out = await tracked('ai-translate', 'quick', () => sample.json<Record<string, string>>(
        `Translate the values of this JSON object into ${name} (${code}). Keep the same keys, keep line breaks, keep it short enough for a design, keep brand names. Reply with only the JSON object.\n\n${JSON.stringify(src)}`,
        { modelTier: 'quick' },
      ));
      const ids = texts.map((e) => e.id).filter((id) => typeof out?.[id] === 'string');
      updateEls(ids, (e) => { e.text = out[e.id]; });
      notify(T(`Page traduite (${ids.length} textes). ⌘Z pour annuler.`, `Page translated (${ids.length} texts). ⌘Z to undo.`));
    } catch (e) {
      notify(sampleErrorText((e as { code?: string }).code, fr), 'err');
    } finally { setBusy(null); }
  };

  if (avail === false) {
    return <div className="muted pretty" style={{ fontSize: 12 }}>{T("Les outils IA utilisent ton compte Claude : ouvre l'application depuis claude.ai, connecté, pour les activer.", 'AI tools use your Claude account: open the app from claude.ai, signed in, to turn them on.')}</div>;
  }
  return (
    <>
      <span className="eyebrow">{T('Rédiger un texte', 'Write copy')}</span>
      <textarea id="ai-write" className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={T('Ex. accroche pour une promo de rentrée, ton joyeux', 'e.g. hook for a back-to-school promo, upbeat tone')} />
      <button className="btn primary" disabled={!!busy || !prompt.trim()} onClick={() => void write()}>{busy === 'write' ? T('Rédaction…', 'Writing…') : sel.length === 1 ? T('Remplacer le texte sélectionné', 'Replace selected text') : T('Écrire et ajouter', 'Write and add')}</button>
      <span className="faint" style={{ fontSize: 11 }}>{T('Claude · respecte le ton de ton kit de marque.', 'Claude · follows your brand kit voice.')}</span>
      <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />
      <span className="eyebrow">{T('Traduire la page', 'Translate page')}</span>
      <div className="row wrap" style={{ gap: 4 }}>
        {LANGS.map(([c, n]) => <button key={c} className="chip sm" disabled={!!busy} onClick={() => void translate(c, n)}>{busy === 'tr-' + c ? '…' : n}</button>)}
      </div>
      <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />
      <span className="eyebrow">{T('Générer une image', 'Generate an image')}</span>
      <span className="faint pretty" style={{ fontSize: 11 }}>{T('Bientôt : la génération d’images demande une clé de fournisseur (OpenAI, fal.ai…) et la passerelle serveur, pas encore déployées.', 'Soon: image generation needs a provider key (OpenAI, fal.ai…) and the server gateway, not deployed yet.')}</span>
    </>
  );
}
