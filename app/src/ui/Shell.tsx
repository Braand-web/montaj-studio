import { useEffect, useState } from 'react';
import { House, Images, LayoutTemplate, Table2, CalendarDays, Palette, Sparkles, Trash2, Settings, Search, Clapperboard, Image as ImageIcon, HardDrive } from 'lucide-react';
import { useApp, useT, type Screen } from '../store/app';
import { listDocs, onDocsChange } from '../lib/docs';
import type { DocMeta } from '../model/types';
import { estimate, persistent } from '../lib/db';
import { bytes } from '../lib/util';
import { LogoMark } from './kit';

export const NAV: { id: Screen; fr: string; en: string; c: string; I: typeof House }[] = [
  { id: 'home', fr: 'Accueil', en: 'Home', c: '#0A84FF', I: House },
  { id: 'library', fr: 'Médiathèque', en: 'Media library', c: '#FF9F0A', I: Images },
  { id: 'templates', fr: 'Modèles', en: 'Templates', c: '#FF9F0A', I: LayoutTemplate },
  { id: 'bulk', fr: 'Création en masse', en: 'Bulk create', c: '#30D158', I: Table2 },
  { id: 'planner', fr: 'Planning', en: 'Planner', c: '#FF375F', I: CalendarDays },
  { id: 'brand', fr: 'Kit de marque', en: 'Brand kit', c: '#BF5AF2', I: Palette },
  { id: 'assistant', fr: 'Assistant IA', en: 'AI assistant', c: '#5E5CE6', I: Sparkles },
  { id: 'trash', fr: 'Corbeille', en: 'Trash', c: '#FF453A', I: Trash2 },
  { id: 'settings', fr: 'Paramètres', en: 'Settings', c: '#8E8E93', I: Settings },
];

export function useDocs() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  useEffect(() => {
    const load = () => { void listDocs().then(setDocs); };
    load();
    const off = onDocsChange(load);
    return () => { off(); };
  }, []);
  return docs;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const T = useT();
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.mode);
  const set = useApp((s) => s.set);
  const docs = useDocs();
  const [narrow, setNarrow] = useState(() => window.innerWidth < 860);
  const [store, setStore] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    const r = () => setNarrow(window.innerWidth < 860);
    window.addEventListener('resize', r);
    void estimate().then(setStore);
    return () => window.removeEventListener('resize', r);
  }, []);
  const trashed = docs.filter((d) => d.trashedAt).length;
  const recent = docs.filter((d) => !d.trashedAt).slice(0, 4);
  const modeLabel = mode === 'system' ? T('Auto', 'Auto') : mode === 'dark' ? T('Sombre', 'Dark') : T('Clair', 'Light');

  if (narrow) {
    return (
      <div style={{ display: 'grid', gridTemplateRows: '52px minmax(0,1fr)', height: '100%' }}>
        <div className="row" style={{ gap: 6, padding: '0 12px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', overflowX: 'auto' }}>
          <span className="logo-btn" style={{ width: 28, height: 28 }}><LogoMark size={12} /></span>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className="btn" style={{ height: 32, background: screen === n.id ? 'var(--panel2)' : 'transparent', color: screen === n.id ? 'var(--tx)' : 'var(--tx2)' }}>{T(n.fr, n.en)}</button>
          ))}
        </div>
        <main style={{ minWidth: 0, overflow: 'auto' }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px minmax(0,1fr)', height: '100%' }}>
      <aside style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', padding: '14px 10px', gap: 18, minHeight: 0, overflow: 'auto' }}>
        <div className="col" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 10, padding: 6 }}>
            <span className="logo-btn" style={{ width: 30, height: 30, borderRadius: 10 }}><LogoMark /></span>
            <div className="col"><span style={{ fontWeight: 600 }}>Montaj Studio</span><span className="faint" style={{ fontSize: 11 }}>{T('Gratuit · local d’abord', 'Free · local-first')}</span></div>
          </div>
          <button onClick={() => set({ palOpen: true })} className="row" style={{ gap: 8, height: 32, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--bg)', color: 'var(--tx3)', fontSize: 12, textAlign: 'left' }}>
            <Search size={13} /><span className="grow">{T('Rechercher', 'Search')}</span><span className="mono" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--line2)' }}>⌘K</span>
          </button>
        </div>
        <nav className="col" style={{ gap: 2 }}>
          {NAV.map((n) => {
            const on = screen === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)} className="row" style={{ justifyContent: 'space-between', height: 34, padding: '0 10px', border: 0, borderRadius: 10, background: on ? 'var(--panel2)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', fontSize: 13, fontWeight: 500, textAlign: 'left' }}>
                <span className="row" style={{ gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: n.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)' }}><n.I size={13} color="#fff" /></span>
                  {T(n.fr, n.en)}
                </span>
                {n.id === 'trash' && trashed > 0 && <span className="mono faint" style={{ fontSize: 11 }}>{trashed}</span>}
              </button>
            );
          })}
        </nav>
        {recent.length > 0 && (
          <div className="col" style={{ gap: 2 }}>
            <span className="eyebrow" style={{ padding: '0 10px 6px' }}>{T('Récents', 'Recent')}</span>
            {recent.map((d) => (
              <button key={d.id} onClick={() => go(d.kind === 'video' ? 'video' : 'design', d.id)} className="row" style={{ gap: 10, height: 32, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', color: 'var(--tx2)', fontSize: 12, textAlign: 'left' }}>
                {d.kind === 'video' ? <Clapperboard size={13} color="#64D2FF" /> : <ImageIcon size={13} color="#FF9F0A" />}<span className="ell">{d.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="col" style={{ marginTop: 'auto', gap: 14 }}>
          <div className="col" style={{ gap: 6, padding: '0 6px' }}>
            <div className="eyebrow row" style={{ gap: 6 }}><HardDrive size={11} />{T('Stockage local', 'Local storage')}</div>
            {store && store.quota > 0 ? (
              <>
                <div className="bar"><div style={{ width: `${Math.max(1, (store.usage / store.quota) * 100)}%`, background: 'var(--tx2)' }} /></div>
                <div className="mono muted" style={{ fontSize: 11 }}>{bytes(store.usage, lang)} / {bytes(store.quota, lang)}</div>
              </>
            ) : <div className="muted" style={{ fontSize: 11 }}>{persistent ? T('Disponible', 'Available') : T('Session uniquement (stockage bloqué)', 'Session only (storage blocked)')}</div>}
          </div>
          <div className="col" style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: 10, gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 12 }}>{T('Mode local', 'Local mode')}</span>
            <span className="muted pretty" style={{ fontSize: 12 }}>{T('Tes projets et médias restent sur cet appareil. Comptes et synchronisation arrivent bientôt.', 'Your projects and media stay on this device. Accounts and sync are coming soon.')}</span>
          </div>
          <div className="row wrap" style={{ gap: 6, padding: '0 2px' }}>
            <button className="btn" style={{ height: 28 }} onClick={() => useApp.getState().toggleLang()}>{lang === 'fr' ? 'EN' : 'FR'}</button>
            <button className="btn" style={{ height: 28 }} onClick={() => useApp.getState().cycleMode()} title={T('Thème', 'Theme')}>{modeLabel}</button>
            <button className="btn bare" style={{ height: 28, marginLeft: 'auto', fontSize: 11 }} onClick={() => go('onboarding')}>{T('Accueil guidé', 'Onboarding')}</button>
            <button className="btn" style={{ height: 28, width: 28, padding: 0 }} onClick={() => set({ kbOpen: true })} title={T('Raccourcis', 'Shortcuts')}>?</button>
          </div>
        </div>
      </aside>
      <main style={{ minWidth: 0, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
