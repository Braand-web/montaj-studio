import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Clapperboard, Image as ImageIcon, Plus, SquarePen, SunMoon, Languages, Keyboard, Scale } from 'lucide-react';
import { useApp, useT, loadBrand } from './store/app';
import { Shell, NAV, useDocs, goNav, NotificationsPanel, openEditor } from './ui/Shell';
import { Toast, Modal } from './ui/kit';
import { Home } from './screens/Home';
import { Onboarding } from './screens/Onboarding';
import { Library } from './screens/Library';
import { Templates } from './screens/Templates';
import { Bulk } from './screens/Bulk';
import { Planner } from './screens/Planner';
import { Brand } from './screens/Brand';
import { Providers } from './screens/Providers';
import { StudioChat } from './screens/StudioChat';
import { Credits } from './screens/Credits';
import { Feedback } from './screens/Feedback';
import { Team } from './screens/Team';
import { Usage } from './screens/Usage';
import { Admin } from './screens/Admin';
import { Legal } from './screens/Legal';
import { useNotifs, notify as pushNotif } from './lib/notify';
import { useUsage } from './lib/usage';
import { useIdentity } from './lib/identity';
import { Trash } from './screens/Trash';
import { Settings } from './screens/Settings';
import { DesignEditor } from './design/DesignEditor';
import { VideoEditor } from './video/VideoEditor';
import { sweepTrash } from './lib/docs';
import { listMedia } from './lib/media';
import { FORMATS } from './model/formats';
import { newFromFormat } from './lib/create';

export function App() {
  const screen = useApp((s) => s.screen);
  const mode = useApp((s) => s.mode);
  const lang = useApp((s) => s.lang);
  const kbOpen = useApp((s) => s.kbOpen);
  const palOpen = useApp((s) => s.palOpen);
  const set = useApp((s) => s.set);

  useEffect(() => {
    void loadBrand();
    void listMedia();
    void useUsage.getState().load();
    void useIdentity.getState().load();
    void useNotifs.getState().load().then(() => sweepTrash()).then((r) => {
      const fr = useApp.getState().lang === 'fr';
      if (r.purged) pushNotif({ kind: 'trash', text: fr ? `${r.purged} document(s) supprimé(s) définitivement de la corbeille (30 jours).` : `${r.purged} document(s) permanently deleted from trash (30 days).`, to: 'trash' });
      if (r.soon) pushNotif({ kind: 'trash', text: fr ? `${r.soon} document(s) de la corbeille seront supprimés dans moins de 3 jours.` : `${r.soon} trashed document(s) will be deleted in under 3 days.`, to: 'trash' });
    });
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      const typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); set({ palOpen: !useApp.getState().palOpen }); return; }
      if (typing) return;
      if (e.key === '?') { set({ kbOpen: !useApp.getState().kbOpen }); return; }
      if (e.key === 'Escape') set({ kbOpen: false, palOpen: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [set]);

  let body: React.ReactNode;
  if (screen === 'onboarding') body = <Onboarding />;
  else if (screen === 'design') body = <DesignEditor />;
  else if (screen === 'video') body = <VideoEditor />;
  else if (screen === 'chat') body = <StudioChat />;
  else {
    const S = { home: Home, library: Library, templates: Templates, bulk: Bulk, planner: Planner, brand: Brand, providers: Providers, trash: Trash, settings: Settings, credits: Credits, feedback: Feedback, team: Team, usage: Usage, admin: Admin, legal: Legal }[screen] ?? Home;
    body = <Shell><S key={screen} /></Shell>;
  }

  return (
    <div className="ms" data-mode={mode === 'system' ? undefined : mode}>
      {body}
      {kbOpen && <Shortcuts onClose={() => set({ kbOpen: false })} />}
      {palOpen && <Palette onClose={() => set({ palOpen: false })} />}
      <NotificationsPanel />
      <Toast />
    </div>
  );
}

function Shortcuts({ onClose }: { onClose(): void }) {
  const T = useT();
  const groups: [string, [string, string][]][] = [
    [T('Général', 'General'), [['⌘/Ctrl Z', T('Annuler', 'Undo')], ['⌘/Ctrl ⇧ Z', T('Rétablir', 'Redo')], ['⌘/Ctrl K', T('Rechercher et ouvrir', 'Search and open')], ['?', T('Afficher les raccourcis', 'Show shortcuts')], [T('Échap', 'Esc'), T('Fermer / désélectionner', 'Close / deselect')]]],
    ['Design', [['⌘/Ctrl D', T('Dupliquer', 'Duplicate')], ['⌘/Ctrl C · V', T('Copier / coller', 'Copy / paste')], ['⌘/Ctrl G · ⇧ G', T('Grouper / dégrouper', 'Group / ungroup')], ['⌘/Ctrl A', T('Tout sélectionner', 'Select all')], [T('Suppr', 'Del'), T('Supprimer', 'Delete')], [T('Flèches · ⇧', 'Arrows · ⇧'), T('Déplacer de 1 / 10 px', 'Nudge 1 / 10 px')], [T('Maj + clic', 'Shift + click'), T('Sélection multiple', 'Multi-select')], [T('Maj + coin', 'Shift + corner'), T('Garder les proportions', 'Keep proportions')], [T('Double-clic', 'Double-click'), T('Modifier un texte', 'Edit a text')], ['Alt', T('Désactiver le magnétisme', 'Disable snapping')]]],
    [T('Vidéo', 'Video'), [[T('Espace', 'Space'), T('Lecture / pause', 'Play / pause')], ['S', T('Scinder le clip', 'Split clip')], [T('Suppr', 'Del'), T('Supprimer le clip', 'Delete clip')], ['M', T('Ajouter un marqueur', 'Add marker')], ['← →', T('Image par image (⇧ : 1 s)', 'Frame by frame (⇧: 1 s)')], ['⌘/Ctrl + molette', T('Zoom de la timeline', 'Timeline zoom')]]],
    [T('Présentation', 'Presentation'), [['→ · ' + T('Espace', 'Space'), T('Page suivante', 'Next page')], ['←', T('Page précédente', 'Previous page')], [T('Échap', 'Esc'), T('Quitter', 'Exit')]]],
  ];
  return (
    <Modal title={T('Raccourcis clavier', 'Keyboard shortcuts')} onClose={onClose} width={720} z={80}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
        {groups.map(([g, rows]) => (
          <div key={g} className="col" style={{ gap: 6 }}>
            <span className="eyebrow">{g}</span>
            {rows.map(([k, d]) => <div key={k + d} className="row" style={{ justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--line)' }}><span className="muted">{d}</span><span className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--line2)', whiteSpace: 'nowrap' }}>{k}</span></div>)}
          </div>
        ))}
      </div>
      <span className="faint" style={{ fontSize: 11 }}>{T('Les raccourcis ne se déclenchent jamais pendant la saisie de texte.', 'Shortcuts never fire while you are typing.')}</span>
    </Modal>
  );
}

function Palette({ onClose }: { onClose(): void }) {
  const T = useT();
  const go = useApp((s) => s.go);
  const docs = useDocs().filter((d) => !d.trashedAt);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const items = useMemo(() => {
    const m = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
    const out: { g: string; label: string; sub?: string; icon: React.ReactNode; go(): void }[] = [];
    docs.filter((d) => m(d.name)).slice(0, 8).forEach((d) => out.push({ g: T('Documents', 'Documents'), label: d.name, sub: d.format, icon: d.kind === 'video' ? <Clapperboard size={14} /> : <ImageIcon size={14} />, go: () => go(d.kind === 'video' ? 'video' : 'design', d.id) }));
    NAV.filter((n) => (n.id !== 'admin' || useIdentity.getState().isOwner) && m(T(n.fr, n.en))).forEach((n) => out.push({ g: T('Aller à', 'Go to'), label: T(n.fr, n.en), icon: <n.I size={14} />, go: () => goNav(n.id) }));
    if (m(T('Documents légaux', 'Legal'))) out.push({ g: T('Aller à', 'Go to'), label: T('Documents légaux', 'Legal'), icon: <Scale size={14} />, go: () => go('legal') });
    const acts: [string, React.ReactNode, () => void][] = [
      [T('Nouvelle discussion', 'New chat'), <SquarePen size={14} />, () => go('chat')],
      [T('Nouveau design', 'New design'), <Plus size={14} />, () => void openEditor('design')],
      [T('Nouvelle vidéo', 'New video'), <Plus size={14} />, () => void openEditor('video')],
      [T('Changer de thème', 'Switch theme'), <SunMoon size={14} />, () => useApp.getState().cycleMode()],
      [T('Passer en anglais', 'Switch to French'), <Languages size={14} />, () => useApp.getState().toggleLang()],
      [T('Raccourcis clavier', 'Keyboard shortcuts'), <Keyboard size={14} />, () => useApp.getState().set({ kbOpen: true })],
    ];
    acts.filter(([l]) => m(l)).forEach(([label, icon, fn]) => out.push({ g: T('Actions', 'Actions'), label, icon, go: fn }));
    FORMATS.filter((f) => m(T(f.fr, f.en) + ' ' + f.dims)).forEach((f) => out.push({ g: T('Créer', 'Create'), label: T(f.fr, f.en), sub: f.dims, icon: <Plus size={14} />, go: () => void newFromFormat(f) }));
    return out;
  }, [q, docs, T, go]);
  const pick = (k: number) => { const it = items[k]; if (it) { onClose(); it.go(); } };
  let lastG = '';
  return (
    <div className="overlay" style={{ zIndex: 85, alignItems: 'flex-start', paddingTop: '12vh' }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="col" style={{ width: '100%', maxWidth: 620, maxHeight: '70vh', borderRadius: 20, background: 'var(--panel)', border: '1px solid var(--line2)', boxShadow: '0 30px 80px rgba(0,0,0,.45)', overflow: 'hidden' }}>
        <div className="row" style={{ gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <Search size={17} color="var(--tx3)" />
          <input ref={ref} id="palette-q" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder={T('Rechercher un document, un écran, un format…', 'Search a document, a screen, a format…')}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(items.length - 1, i + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); } if (e.key === 'Enter') pick(i); if (e.key === 'Escape') onClose(); }}
            style={{ flex: 1, border: 0, background: 'transparent', color: 'var(--tx)', fontSize: 16, outline: 'none' }} />
          <span className="mono faint" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'var(--panel2)' }}>Esc</span>
        </div>
        <div className="col" style={{ overflow: 'auto', padding: 6 }}>
          {items.map((it, k) => {
            const head = it.g !== lastG ? it.g : null;
            lastG = it.g;
            return (
              <div key={k} className="col">
                {head && <span className="eyebrow" style={{ padding: '10px 10px 4px' }}>{head}</span>}
                <button onMouseEnter={() => setI(k)} onClick={() => pick(k)} className="row" style={{ gap: 12, minHeight: 40, padding: '6px 10px', border: 0, borderRadius: 12, background: k === i ? 'var(--panel2)' : 'transparent', textAlign: 'left' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accSoft)', color: 'var(--accTx)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{it.icon}</span>
                  <span className="grow ell" style={{ fontSize: 13, fontWeight: 500 }}>{it.label}</span>
                  {it.sub && <span className="mono faint" style={{ fontSize: 11 }}>{it.sub}</span>}
                </button>
              </div>
            );
          })}
          {items.length === 0 && <div className="faint" style={{ padding: 30, textAlign: 'center' }}>{T('Aucun résultat.', 'No results.')}</div>}
        </div>
      </div>
    </div>
  );
}
