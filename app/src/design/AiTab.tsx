import { useEffect, useRef, useState } from 'react';
import { Copy, ScanEye, Palette as PaletteIcon, Megaphone, PenLine, Wand2, Check, ImagePlus } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { useDesign } from './store';
import { addText, updateEls } from './actions';
import { renderPage, canvasBlob } from './render';
import { compactDesign } from '../agent/designTools';
import { getSample, sampleErrorText } from '../lib/claude';
import { tracked } from '../lib/usage';
import { aiLimits } from '../lib/ai';
import { importFiles, mediaBlob } from '../lib/media';

// AI tab of the design editor: copy variants, translation, design critique (sees the page),
// palette from a photo and a ready-to-post social caption. Every call runs on the viewer's
// Claude account and is logged in AI usage.

const LANGS = [['en', 'English'], ['fr', 'Français'], ['es', 'Español'], ['pt', 'Português'], ['ar', 'العربية'], ['wo', 'Wolof'], ['sw', 'Kiswahili']];
const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'X'];

interface Critique { score: number; summary: string; issues: { sev: 'high' | 'med' | 'low'; text: string; fix: string }[] }
interface Pal { name: string; colors: string[]; note?: string }

async function pageImage(): Promise<Blob | null> {
  try { return await canvasBlob(await renderPage(useDesign.getState().page(), 1024), 'image/jpeg', 0.85); } catch { return null; }
}
const hex = (v: unknown) => (typeof v === 'string' && /^#?[0-9a-f]{6}$/i.test(v.trim()) ? ('#' + v.trim().replace('#', '')).toUpperCase() : null);

async function copyText(s: string) {
  try { await navigator.clipboard.writeText(s); return true; } catch { return false; }
}

export function AiTab() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const brand = useApp((s) => s.brand);
  const notify = useApp((s) => s.notify);
  const sel = useDesign((s) => s.sel);
  const [prompt, setPrompt] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [avail, setAvail] = useState<boolean | null>(null);
  const [vision, setVision] = useState(0);
  const [crit, setCrit] = useState<Critique | null>(null);
  const [pal, setPal] = useState<Pal | null>(null);
  const [platform, setPlatform] = useState('Instagram');
  const [caption, setCaption] = useState<{ caption: string; hashtags: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void getSample().then((s) => setAvail(!!s)); void aiLimits().then((l) => setVision(l.images)); }, []);
  const fr = lang === 'fr';
  const L = fr ? 'French (tutoiement)' : 'English';
  const fail = (e: unknown) => notify(sampleErrorText((e as { code?: string }).code, fr), 'err');
  const pageTexts = () => useDesign.getState().page().els.filter((e) => e.type === 'text' && e.text?.trim()).map((e) => e.text!.trim());

  const write = async () => {
    const sample = await getSample();
    if (!sample || !prompt.trim()) return;
    setBusy('write');
    try {
      const out = await tracked('ai-write', 'quick', () => sample.json<string[]>(
        `Write 3 alternative short copies for a visual design (poster, post, thumbnail). Brief: ${prompt}\nBrand voice: ${brand.tone}\nLanguage: ${L}.\nEach at most 2 short lines, punchy, no hashtags, no quotes. Vary the angle (benefit, curiosity, urgency). Reply with only a JSON array of 3 strings.`,
        { modelTier: 'quick', cache: false },
      ), (r) => JSON.stringify(r).length);
      setVariants((Array.isArray(out) ? out : []).map((x) => String(x).trim().replace(/^["«»“”]+|["«»“”]+$/g, '')).filter(Boolean).slice(0, 3));
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const place = (text: string) => {
    const st = useDesign.getState();
    const target = st.page().els.find((e) => sel.length === 1 && e.id === sel[0] && e.type === 'text');
    if (target) updateEls([target.id], { text });
    else { const id = addText('subtitle'); updateEls([id], { text }); }
    notify(T('Texte placé. ⌘Z pour annuler.', 'Text placed. ⌘Z to undo.'));
  };

  const translate = async (code: string, name: string) => {
    const sample = await getSample();
    if (!sample) return;
    const texts = useDesign.getState().page().els.filter((e) => e.type === 'text' && e.text?.trim());
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
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  const critique = async () => {
    const sample = await getSample();
    if (!sample) return;
    setBusy('crit'); setCrit(null);
    try {
      const st = useDesign.getState();
      const img = vision ? await pageImage() : null;
      const json = JSON.stringify(compactDesign({ pages: [st.page()] }));
      const out = await tracked('ai-critique', 'default', () => sample.json<Critique>(
        `You are a senior graphic designer reviewing one page of a design (${st.page().w}×${st.page().h} px).${img ? ' The attached image is a render of the page.' : ''}\nElements (JSON, page pixels): ${json.slice(0, 20000)}\nBrand colors: ${brand.colors.join(', ')}.\n` +
        `Judge hierarchy, readability and contrast, alignment and spacing, balance, color harmony, text overflow or cut text, and fit for purpose. Be concrete and kind.\n` +
        `Reply with only JSON: {"score": 0-100, "summary": one sentence, "issues": [{"sev": "high"|"med"|"low", "text": the problem, "fix": the precise change to make, naming elements}]} with at most 6 issues, most important first. Write text in ${L}.`,
        { modelTier: 'default', images: img ? [img] : undefined },
      ));
      if (!out || typeof out.score !== 'number' || !Array.isArray(out.issues)) throw { code: 'invalid_json' };
      setCrit({ score: Math.max(0, Math.min(100, Math.round(out.score))), summary: String(out.summary ?? ''), issues: out.issues.slice(0, 6).map((i) => ({ sev: i.sev === 'high' || i.sev === 'low' ? i.sev : 'med', text: String(i.text ?? ''), fix: String(i.fix ?? '') })) });
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const fixAll = () => {
    if (!crit) return;
    const list = crit.issues.map((i, n) => `${n + 1}. ${i.text} → ${i.fix}`).join('\n');
    useApp.getState().set({ pendingPrompt: T(`Applique ces corrections à la page ${useDesign.getState().pageIdx + 1}, puis vérifie les contrastes :\n${list}`, `Apply these fixes to page ${useDesign.getState().pageIdx + 1}, then check contrast:\n${list}`) });
  };

  const palette = async (file?: File) => {
    const sample = await getSample();
    if (!sample) return;
    let blob: Blob | null = file ?? null;
    if (!blob) {
      const st = useDesign.getState();
      const img = st.page().els.find((e) => st.sel.includes(e.id) && e.type === 'image' && e.mediaId) ?? st.page().els.find((e) => e.type === 'image' && e.mediaId);
      if (img?.mediaId) blob = (await mediaBlob(img.mediaId)) ?? null;
    }
    if (!blob) { fileRef.current?.click(); return; }
    if (file) void importFiles([file]);
    setBusy('pal'); setPal(null);
    try {
      const out = await tracked('ai-palette', 'quick', () => sample.json<Pal>(
        `Extract a harmonious 5-color design palette from the attached photo: 1 dark, 1 light, 3 accents that work for text and backgrounds. Give it a short evocative name in ${L} and one sentence on how to use it. Reply with only JSON: {"name": string, "colors": ["#RRGGBB", ...5], "note": string}.`,
        { modelTier: 'quick', images: [blob] },
      ));
      const colors = (out?.colors ?? []).map(hex).filter(Boolean) as string[];
      if (colors.length < 3) throw { code: 'invalid_json' };
      setPal({ name: String(out.name ?? ''), colors: colors.slice(0, 6), note: out.note ? String(out.note) : undefined });
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  const social = async () => {
    const sample = await getSample();
    if (!sample) return;
    setBusy('cap'); setCaption(null); setCopied(false);
    try {
      const img = vision ? await pageImage() : null;
      const out = await tracked('ai-caption', 'quick', () => sample.json<{ caption: string; hashtags: string[] }>(
        `Write a ${platform} caption to publish with this visual.${img ? ' The attached image is the visual.' : ''} Texts on it: ${JSON.stringify(pageTexts()).slice(0, 3000)}\nBrand "${brand.name}", voice: ${brand.tone}. Language: ${L}.\n` +
        `Follow ${platform} norms for length and tone, open with a hook, end with a clear call to action, use emojis sparingly. Then 3 to 8 relevant hashtags (fewer for LinkedIn). Never invent prices, dates or facts that are not on the visual.\n` +
        `Reply with only JSON: {"caption": string, "hashtags": ["#tag", ...]}.`,
        { modelTier: 'quick', cache: false, images: img ? [img] : undefined },
      ));
      setCaption({ caption: String(out?.caption ?? '').trim(), hashtags: (out?.hashtags ?? []).map((h) => '#' + String(h).replace(/^#/, '').replace(/\s+/g, '')).slice(0, 10) });
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  if (avail === false) {
    return <div className="muted pretty" style={{ fontSize: 12 }}>{T("Les outils IA utilisent ton compte Claude : ouvre l'application depuis claude.ai, connecté, pour les activer.", 'AI tools use your Claude account: open the app from claude.ai, signed in, to turn them on.')}</div>;
  }
  const sevColor = { high: '#FF453A', med: '#FF9F0A', low: 'var(--tx3)' };
  const sep = <div style={{ height: 1, background: 'var(--line)', margin: '6px 0' }} />;
  return (
    <>
      <span className="eyebrow row" style={{ gap: 6 }}><ScanEye size={12} />{T('Critique du design', 'Design critique')}</span>
      <span className="faint pretty" style={{ fontSize: 11 }}>{vision ? T('Claude regarde la page et note la lisibilité, la hiérarchie, les contrastes et l’équilibre.', 'Claude looks at the page and rates readability, hierarchy, contrast and balance.') : T('Claude analyse la structure de la page (lisibilité, hiérarchie, contrastes).', 'Claude analyzes the page structure (readability, hierarchy, contrast).')}</span>
      <button className="btn" disabled={!!busy} onClick={() => void critique()}>{busy === 'crit' ? T('Analyse…', 'Reviewing…') : T('Analyser cette page', 'Review this page')}</button>
      {crit && (
        <div className="col" style={{ gap: 8, padding: 10, borderRadius: 12, background: 'var(--panel2)' }}>
          <div className="row" style={{ gap: 10 }}>
            <span style={{ width: 42, height: 42, borderRadius: 21, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', background: crit.score >= 80 ? '#30D158' : crit.score >= 60 ? '#FF9F0A' : '#FF453A' }}>{crit.score}</span>
            <span className="pretty" style={{ fontSize: 12 }}>{crit.summary}</span>
          </div>
          {crit.issues.map((i, n) => (
            <div key={n} className="col" style={{ gap: 2, paddingLeft: 8, borderLeft: `3px solid ${sevColor[i.sev]}` }}>
              <span className="pretty" style={{ fontSize: 12, fontWeight: 500 }}>{i.text}</span>
              <span className="muted pretty" style={{ fontSize: 11 }}>→ {i.fix}</span>
            </div>
          ))}
          {crit.issues.length > 0 && <button className="btn primary sm" onClick={fixAll}><Wand2 size={12} />{T('Corriger avec l’assistant', 'Fix with the assistant')}</button>}
        </div>
      )}
      {sep}
      <span className="eyebrow row" style={{ gap: 6 }}><PenLine size={12} />{T('Rédiger un texte', 'Write copy')}</span>
      <textarea id="ai-write" className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={T('Ex. accroche pour une promo de rentrée, ton joyeux', 'e.g. hook for a back-to-school promo, upbeat tone')} />
      <button className="btn primary" disabled={!!busy || !prompt.trim()} onClick={() => void write()}>{busy === 'write' ? T('Rédaction…', 'Writing…') : T('Proposer 3 versions', 'Suggest 3 versions')}</button>
      {variants.map((v) => (
        <button key={v} className="chip wrap-text" style={{ justifyContent: 'flex-start', fontSize: 12 }} onClick={() => place(v)} title={sel.length === 1 ? T('Remplacer le texte sélectionné', 'Replace selected text') : T('Ajouter sur la page', 'Add to the page')}>{v}</button>
      ))}
      {variants.length > 0 && <span className="faint" style={{ fontSize: 11 }}>{sel.length === 1 ? T('Clique une version pour remplacer le texte sélectionné.', 'Click a version to replace the selected text.') : T('Clique une version pour l’ajouter sur la page.', 'Click a version to add it to the page.')}</span>}
      {sep}
      <span className="eyebrow">{T('Traduire la page', 'Translate page')}</span>
      <div className="row wrap" style={{ gap: 4 }}>
        {LANGS.map(([c, n]) => <button key={c} className="chip sm" disabled={!!busy} onClick={() => void translate(c, n)}>{busy === 'tr-' + c ? '…' : n}</button>)}
      </div>
      {vision > 0 && (
        <>
          {sep}
          <span className="eyebrow row" style={{ gap: 6 }}><PaletteIcon size={12} />{T('Palette depuis une photo', 'Palette from a photo')}</span>
          <span className="faint pretty" style={{ fontSize: 11 }}>{T('Utilise la photo sélectionnée (ou la première de la page), ou choisis-en une.', 'Uses the selected photo (or the first one on the page), or pick one.')}</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn grow" disabled={!!busy} onClick={() => void palette()}>{busy === 'pal' ? T('Analyse…', 'Analyzing…') : T('Extraire la palette', 'Extract palette')}</button>
            <button className="btn icon" disabled={!!busy} onClick={() => fileRef.current?.click()} title={T('Choisir une photo', 'Pick a photo')}><ImagePlus size={14} /></button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void palette(f); e.target.value = ''; }} />
          </div>
          {pal && (
            <div className="col" style={{ gap: 6, padding: 10, borderRadius: 12, background: 'var(--panel2)' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{pal.name}</span>
              <div className="row" style={{ gap: 4 }}>
                {pal.colors.map((c) => <button key={c} title={T(`${c} · appliquer à la sélection`, `${c} · apply to selection`)} onClick={() => { const s = useDesign.getState().sel; if (s.length) updateEls(s, (e) => { if (e.type === 'text') e.color = c; else { e.fill = c; delete e.grad; } }); }} style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid var(--line2)', background: c, padding: 0 }} />)}
              </div>
              {pal.note && <span className="muted pretty" style={{ fontSize: 11 }}>{pal.note}</span>}
              <div className="row wrap" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => { useApp.getState().setBrand({ colors: [...new Set([...pal.colors, ...brand.colors])].slice(0, 8) }); notify(T('Palette ajoutée au kit de marque.', 'Palette added to the brand kit.')); }}>{T('Ajouter au kit de marque', 'Add to brand kit')}</button>
                <button className="btn sm primary" onClick={() => useApp.getState().set({ pendingPrompt: T(`Recolore la page avec cette palette « ${pal.name} » : ${pal.colors.join(', ')}. Garde des contrastes lisibles.`, `Recolor the page with this "${pal.name}" palette: ${pal.colors.join(', ')}. Keep readable contrast.`) })}><Wand2 size={12} />{T('Appliquer au design', 'Apply to design')}</button>
              </div>
            </div>
          )}
        </>
      )}
      {sep}
      <span className="eyebrow row" style={{ gap: 6 }}><Megaphone size={12} />{T('Légende pour les réseaux', 'Social caption')}</span>
      <div className="row wrap" style={{ gap: 4 }}>
        {PLATFORMS.map((p) => <button key={p} className={'chip sm' + (platform === p ? ' on' : '')} onClick={() => setPlatform(p)}>{p}</button>)}
      </div>
      <button className="btn" disabled={!!busy} onClick={() => void social()}>{busy === 'cap' ? T('Rédaction…', 'Writing…') : T('Écrire la légende', 'Write the caption')}</button>
      {caption && (
        <div className="col" style={{ gap: 6 }}>
          <textarea className="input" rows={6} value={caption.caption + (caption.hashtags.length ? '\n\n' + caption.hashtags.join(' ') : '')} onChange={(e) => setCaption({ caption: e.target.value, hashtags: [] })} />
          <button className="btn sm" onClick={async () => { const ok = await copyText(caption.caption + (caption.hashtags.length ? '\n\n' + caption.hashtags.join(' ') : '')); setCopied(ok); if (!ok) notify(T('Copie bloquée par le navigateur : sélectionne le texte et copie-le.', 'Copy blocked by the browser: select the text and copy it.'), 'info'); }}>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? T('Copié', 'Copied') : T('Copier', 'Copy')}</button>
        </div>
      )}
      {sep}
      <span className="eyebrow">{T('Générer une image', 'Generate an image')}</span>
      <span className="faint pretty" style={{ fontSize: 11 }}>{T('Bientôt : la génération d’images demande une clé de fournisseur (OpenAI, fal.ai…) et la passerelle serveur, pas encore déployées.', 'Soon: image generation needs a provider key (OpenAI, fal.ai…) and the server gateway, not deployed yet.')}</span>
    </>
  );
}
