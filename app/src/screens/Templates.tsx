import { useMemo, useState } from 'react';
import { LayoutTemplate, Search, Sparkles } from 'lucide-react';
import { useT } from '../store/app';
import { PageHead, Modal } from '../ui/kit';
import { TEMPLATES, type Template } from '../model/templates';
import { PageView } from '../design/ElementView';
import { newFromTemplate } from '../lib/create';
import { fmt } from '../model/formats';

export function Templates() {
  const T = useT();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | Template['cat']>('all');
  const [ai, setAi] = useState<Template | null>(null);
  const [brief, setBrief] = useState('');
  const previews = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, t.build()])), []);
  const shown = TEMPLATES.filter((t) => (cat === 'all' || t.cat === cat) && (!q || (T(t.fr, t.en) + ' ' + t.tags).toLowerCase().includes(q.toLowerCase())));
  const cats = [
    { id: 'all' as const, l: T('Tous', 'All') }, { id: 'social' as const, l: T('Réseaux sociaux', 'Social') },
    { id: 'print' as const, l: T('Impression', 'Print') }, { id: 'office' as const, l: T('Bureau', 'Office') },
  ];
  return (
    <div className="page screen-in" style={{ maxWidth: 1300 }}>
      <PageHead color="#FF9F0A" icon={<LayoutTemplate size={19} />} title={T('Modèles', 'Templates')} sub={T('Des points de départ originaux, entièrement modifiables. Les cadres photo sont vides : dépose tes propres images.', 'Original starting points, fully editable. Photo frames are empty: drop your own images.')}
        right={<div className="row" style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 11, color: 'var(--tx3)' }} /><input id="tpl-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('Rechercher un modèle', 'Search templates')} style={{ width: 260, height: 38, paddingLeft: 34, borderRadius: 999 }} /></div>} />
      <div className="row wrap" style={{ gap: 6 }}>{cats.map((c) => <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}>{c.l}</button>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
        {shown.map((t) => {
          const d = previews.get(t.id)!;
          const p = d.pages[0];
          const f = fmt(t.formatId);
          return (
            <div key={t.id} className="col" style={{ gap: 8 }}>
              <div style={{ height: 220, borderRadius: 16, background: 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflow: 'hidden' }}>
                <div style={{ width: `min(100%, ${(192 * p.w) / p.h}px)`, pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}><PageView page={p} /></div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="col grow"><span className="ell" style={{ fontSize: 13, fontWeight: 600 }}>{T(t.fr, t.en)}</span><span className="faint" style={{ fontSize: 11 }}>{T(f.fr, f.en)} · {d.pages.length} p.</span></div>
                <button onClick={() => { setAi(t); setBrief(''); }} title={T('Adapter avec l’assistant', 'Adapt with the assistant')} style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: 'color-mix(in oklab, #BF5AF2 16%, var(--panel2))', color: '#BF5AF2', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Sparkles size={14} /></button>
                <button className="btn primary" style={{ height: 32 }} onClick={() => void newFromTemplate(t)}>{T('Utiliser', 'Use')}</button>
              </div>
            </div>
          );
        })}
      </div>
      {shown.length === 0 && <div className="muted" style={{ padding: 50, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 18 }}>{T('Aucun modèle ne correspond.', 'No matching template.')}</div>}
      {ai && (
        <Modal title={T('Adapter « ', 'Adapt “') + T(ai.fr, ai.en) + T(' »', '”')} onClose={() => setAi(null)} width={480}
          footer={<><button className="btn md" onClick={() => setAi(null)}>{T('Annuler', 'Cancel')}</button><button className="btn primary md" disabled={!brief.trim()} onClick={() => { const t = ai; setAi(null); void newFromTemplate(t, T('Adapte ce modèle à ma demande en gardant la mise en page : ', 'Adapt this template to my request while keeping the layout: ') + brief); }}>{T('Créer et adapter', 'Create and adapt')}</button></>}>
          <span className="muted pretty" style={{ fontSize: 12 }}>{T('Décris ton sujet. Le modèle est copié dans un nouveau document, puis l’assistant réécrit les textes et applique ton kit de marque.', 'Describe your subject. The template is copied into a new document, then the assistant rewrites the texts and applies your brand kit.')}</span>
          <textarea id="tpl-brief" className="input" rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={T('Ex. Atelier couture pour débutants, samedi 12 octobre à Dakar, inscription gratuite', 'e.g. Beginner sewing workshop, Saturday October 12 in Dakar, free sign-up')} />
        </Modal>
      )}
    </div>
  );
}
