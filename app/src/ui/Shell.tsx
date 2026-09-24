import { useEffect, useState } from 'react';
import { House, Images, LayoutTemplate, Table2, CalendarDays, Palette, KeyRound, Trash2, Settings, Search, Clapperboard, Image as ImageIcon, Sparkles, CreditCard, Lightbulb, Users, ChartNoAxesColumn, Shield, Bell, PenTool, Film, ChevronsUpDown, MessageSquare } from 'lucide-react';
import { useApp, useT, type Screen } from '../store/app';
import { listDocs, onDocsChange, createDoc } from '../lib/docs';
import type { DocMeta, DesignData } from '../model/types';
import { estimate, persistent, get } from '../lib/db';
import { bytes, uid } from '../lib/util';
import { LogoMark } from './kit';
import { useNotifs } from '../lib/notify';
import { useIdentity } from '../lib/identity';
import { emptyVideo } from '../lib/create';
import { fmt } from '../model/formats';

type NavId = Screen | 'open-video' | 'open-design';
export interface NavItem { id: NavId; fr: string; en: string; c: string; I: typeof House }

export const NAV: NavItem[] = [
  { id: 'home', fr: 'Accueil', en: 'Home', c: '#0A84FF', I: House },
  { id: 'chat', fr: 'Studio Chat', en: 'Studio Chat', c: 'linear-gradient(135deg,#0A84FF,#BF5AF2)', I: Sparkles },
  { id: 'open-video', fr: 'Éditeur vidéo', en: 'Video editor', c: '#1F5FBF', I: Film },
  { id: 'open-design', fr: 'Éditeur design', en: 'Design editor', c: '#C98A0A', I: PenTool },
  { id: 'credits', fr: 'Crédits', en: 'Credits', c: '#30D158', I: CreditCard },
  { id: 'templates', fr: 'Templates', en: 'Templates', c: '#FF9F0A', I: LayoutTemplate },
  { id: 'feedback', fr: 'Idées & bugs', en: 'Ideas & bugs', c: '#FFD60A', I: Lightbulb },
  { id: 'library', fr: 'Médiathèque', en: 'Media library', c: '#FF9F0A', I: Images },
  { id: 'planner', fr: 'Planning', en: 'Planner', c: '#FF375F', I: CalendarDays },
  { id: 'bulk', fr: 'Création en masse', en: 'Bulk create', c: '#30D158', I: Table2 },
  { id: 'team', fr: 'Équipe', en: 'Team', c: '#5E5CE6', I: Users },
  { id: 'brand', fr: 'Kit de marque', en: 'Brand kit', c: '#BF5AF2', I: Palette },
  { id: 'providers', fr: 'Fournisseurs IA', en: 'AI providers', c: '#8E8E93', I: KeyRound },
  { id: 'usage', fr: 'Utilisation IA', en: 'AI usage', c: '#64D2FF', I: ChartNoAxesColumn },
  { id: 'trash', fr: 'Corbeille', en: 'Trash', c: '#FF453A', I: Trash2 },
  { id: 'settings', fr: 'Paramètres', en: 'Settings', c: '#8E8E93', I: Settings },
  { id: 'admin', fr: 'Admin', en: 'Admin', c: '#FF453A', I: Shield },
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

// Opens the most recent document of a kind, or creates one so the editor is one click away.
export async function openEditor(kind: 'video' | 'design') {
  const app = useApp.getState();
  const last = (await listDocs()).find((d) => d.kind === kind && !d.trashedAt);
  if (last) { app.go(kind, last.id); return; }
  if (kind === 'video') {
    const f = fmt('v-tiktok');
    const d = await createDoc('video', app.lang === 'fr' ? 'Nouvelle vidéo' : 'New video', f.dims, emptyVideo(f.w, f.h));
    app.go('video', d.id);
  } else {
    const f = fmt('ig-45');
    const data: DesignData = { pages: [{ id: uid('p'), w: f.w, h: f.h, bg: '#FFFFFF', els: [] }] };
    const d = await createDoc('design', app.lang === 'fr' ? 'Nouveau design' : 'New design', f.dims, data);
    app.go('design', d.id);
  }
}

export function goNav(id: NavId) {
  if (id === 'open-video') void openEditor('video');
  else if (id === 'open-design') void openEditor('design');
  else useApp.getState().go(id);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const T = useT();
  const screen = useApp((s) => s.screen);
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.mode);
  const set = useApp((s) => s.set);
  const go = useApp((s) => s.go);
  const docs = useDocs();
  const unread = useNotifs((s) => s.items.filter((n) => n.unread).length);
  const id = useIdentity();
  const userName = useApp((s) => s.userName);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 860);
  const [store, setStore] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [fbSeen, setFbSeen] = useState(true);
  const [lastChat, setLastChat] = useState<string | null>(null);
  useEffect(() => {
    const r = () => setNarrow(window.innerWidth < 860);
    window.addEventListener('resize', r);
    void estimate().then(setStore);
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
    void get<boolean>('kv', 'fbSeen').then((v) => setFbSeen(!!v));
    void get<{ title: string }[]>('kv', 'chats').then((c) => setLastChat(c?.[0]?.title ?? null));
    return () => window.removeEventListener('resize', r);
  }, [screen]);
  const trashed = docs.filter((d) => d.trashedAt).length;
  const recent = docs.filter((d) => !d.trashedAt).slice(0, 3);
  const nav = NAV.filter((n) => n.id !== 'admin' || id.isOwner);
  const note = (n: NavItem) => n.id === 'trash' && trashed ? String(trashed) : n.id === 'credits' ? T('Gratuit', 'Free') : n.id === 'providers' ? '1/9' : n.id === 'feedback' && !fbSeen ? T('Nouveau', 'New') : '';
  const displayName = userName || id.name;

  if (narrow) {
    return (
      <div style={{ display: 'grid', gridTemplateRows: '52px minmax(0,1fr)', height: '100%' }}>
        <div className="row" style={{ gap: 6, padding: '0 12px', borderBottom: '1px solid var(--line)', background: 'var(--panel)', overflowX: 'auto' }}>
          <span className="logo-btn" style={{ width: 28, height: 28 }}><LogoMark size={12} /></span>
          <button className="btn" style={{ height: 32, position: 'relative' }} onClick={() => useNotifs.getState().setOpen(true)} aria-label="Notifications"><Bell size={14} />{unread > 0 && <span className="mono" style={{ fontSize: 10, color: '#FF453A' }}>{unread}</span>}</button>
          {nav.map((n) => (
            <button key={n.id} onClick={() => goNav(n.id)} className="btn" style={{ height: 32, background: screen === n.id ? 'var(--panel2)' : 'transparent', color: screen === n.id ? 'var(--tx)' : 'var(--tx2)' }}>{T(n.fr, n.en)}</button>
          ))}
        </div>
        <main style={{ minWidth: 0, overflow: 'auto' }}>{children}</main>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '252px minmax(0,1fr)', height: '100%' }}>
      <aside style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', padding: '14px 10px', gap: 16, minHeight: 0, overflow: 'auto' }}>
        <div className="col" style={{ gap: 10 }}>
          <button onClick={() => go('team')} className="row" style={{ gap: 10, padding: 6, border: 0, borderRadius: 16, background: 'transparent', textAlign: 'left' }}>
            <span className="logo-btn" style={{ width: 30, height: 30, borderRadius: 10 }}><LogoMark /></span>
            <div className="col grow"><span style={{ fontWeight: 600 }}>Montaj Studio</span><span className="faint ell" style={{ fontSize: 11 }}>{displayName ? T(`Espace de ${displayName}`, `${displayName}’s space`) : T('Mon espace', 'My space')}</span></div>
            <ChevronsUpDown size={13} color="var(--tx3)" />
          </button>
          <button onClick={() => set({ palOpen: true })} className="row" style={{ gap: 8, height: 32, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--bg)', color: 'var(--tx3)', fontSize: 12, textAlign: 'left' }}>
            <Search size={13} /><span className="grow">{T('Rechercher', 'Search')}</span><span className="mono" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--line2)' }}>⌘K</span>
          </button>
          <button onClick={() => useNotifs.getState().setOpen(true)} className="row" style={{ gap: 8, height: 32, padding: '0 10px', borderRadius: 10, border: 0, background: 'transparent', color: 'var(--tx2)', fontSize: 12, textAlign: 'left' }}>
            <Bell size={14} /><span className="grow">Notifications</span>
            {unread > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#FF453A', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>}
          </button>
        </div>
        <nav className="col" style={{ gap: 2 }}>
          {nav.map((n) => {
            const on = screen === n.id || (n.id === 'open-video' && screen === 'video') || (n.id === 'open-design' && screen === 'design');
            const nt = note(n);
            return (
              <button key={n.id} onClick={() => goNav(n.id)} className="row" style={{ justifyContent: 'space-between', height: 34, padding: '0 10px', border: 0, borderRadius: 10, background: on ? 'var(--panel2)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', fontSize: 13, fontWeight: 500, textAlign: 'left' }}>
                <span className="row" style={{ gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 7, background: n.c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)' }}><n.I size={13} color="#fff" /></span>
                  {T(n.fr, n.en)}
                </span>
                {nt && <span className="mono" style={{ fontSize: 11, color: nt === T('Nouveau', 'New') ? 'var(--accTx)' : 'var(--tx3)' }}>{nt}</span>}
              </button>
            );
          })}
        </nav>
        <div className="col" style={{ gap: 2 }}>
          <span className="eyebrow" style={{ padding: '0 10px 6px' }}>{T('Récents', 'Recent')}</span>
          {recent.map((d) => (
            <button key={d.id} onClick={() => go(d.kind === 'video' ? 'video' : 'design', d.id)} className="row" style={{ gap: 10, height: 32, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', color: 'var(--tx2)', fontSize: 12, textAlign: 'left' }}>
              {d.kind === 'video' ? <Clapperboard size={13} color="#4DA3FF" style={{ flex: 'none' }} /> : <ImageIcon size={13} color="#FF9F0A" style={{ flex: 'none' }} />}<span className="ell">{d.name}</span>
            </button>
          ))}
          {lastChat && <button onClick={() => go('chat')} className="row" style={{ gap: 10, height: 32, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', color: 'var(--tx2)', fontSize: 12, textAlign: 'left' }}><MessageSquare size={13} color="#BF5AF2" style={{ flex: 'none' }} /><span className="ell">{lastChat}</span></button>}
          {!recent.length && !lastChat && <span className="faint" style={{ fontSize: 12, padding: '0 10px' }}>{T('Rien pour l’instant.', 'Nothing yet.')}</span>}
        </div>
        <button onClick={() => { useApp.getState().set({ pendingPrompt: '__feedback__' }); go('feedback'); }} className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 14, border: 0, background: 'color-mix(in oklab, #FFD60A 14%, var(--panel2))', textAlign: 'left' }}>
          <span style={{ width: 26, height: 26, borderRadius: 13, background: '#FFD60A', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Lightbulb size={13} color="#111113" /></span>
          <span className="col"><span style={{ fontSize: 12, fontWeight: 600 }}>{T('Suggérer une idée', 'Suggest an idea')}</span><span className="faint" style={{ fontSize: 11 }}>{T('Ou signaler un bug', 'Or report a bug')}</span></span>
        </button>
        <div className="col" style={{ marginTop: 'auto', gap: 14 }}>
          <div className="col" style={{ gap: 6, padding: '0 6px' }}>
            <div className="eyebrow">{T('Stockage local', 'Local storage')}</div>
            {store && store.quota > 0 ? (
              <>
                <div className="bar"><div style={{ width: `${Math.max(1, (store.usage / store.quota) * 100)}%`, background: 'var(--tx2)' }} /></div>
                <div className="mono muted" style={{ fontSize: 11 }}>{bytes(store.usage, lang)} {T('sur', 'of')} {bytes(store.quota, lang)} · {persisted ? T('persistant', 'persistent') : T('non garanti', 'not guaranteed')}</div>
              </>
            ) : <div className="muted" style={{ fontSize: 11 }}>{persistent ? T('Disponible', 'Available') : T('Session uniquement (stockage bloqué)', 'Session only (storage blocked)')}</div>}
          </div>
          {id.status === 'claude' ? (
            <div className="col" style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: 10, gap: 8 }}>
              <div className="row" style={{ gap: 8 }}>
                {id.avatarUrl ? <img src={id.avatarUrl} alt="" width={28} height={28} style={{ borderRadius: 14, flex: 'none' }} /> : <span style={{ width: 28, height: 28, borderRadius: 14, background: id.color, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{(displayName || '?').charAt(0).toUpperCase()}</span>}
                <div className="col" style={{ minWidth: 0 }}><span className="ell" style={{ fontWeight: 600, fontSize: 12 }}>{displayName || T('Compte Claude', 'Claude account')}</span><span className="faint" style={{ fontSize: 11 }}>{T('Connecté via claude.ai', 'Signed in via claude.ai')}</span></div>
              </div>
              <span className="muted" style={{ fontSize: 11 }}><span className="acc">●</span> {T('Documents stockés sur cet appareil', 'Documents stored on this device')}</span>
            </div>
          ) : (
            <div className="col" style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: 10, gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 12 }}>{T('Mode local', 'Local mode')}</span>
              <span className="muted pretty" style={{ fontSize: 12 }}>{T('Tes projets restent sur cet appareil. Ouvre l’app dans claude.ai pour utiliser ton compte et l’IA.', 'Your projects stay on this device. Open the app in claude.ai to use your account and AI.')}</span>
            </div>
          )}
          <div className="row wrap" style={{ gap: 6, padding: '0 2px' }}>
            <button className="btn" style={{ height: 28 }} onClick={() => useApp.getState().toggleLang()}>{lang === 'fr' ? 'FR' : 'EN'}</button>
            <button className="btn" style={{ height: 28 }} onClick={() => useApp.getState().cycleMode()} title={T('Thème', 'Theme')}>{mode === 'system' ? T('Auto', 'Auto') : mode === 'dark' ? T('Sombre', 'Dark') : T('Clair', 'Light')}</button>
            <button className="btn bare" style={{ height: 28, marginLeft: 'auto', fontSize: 11, padding: '0 4px' }} onClick={() => go('onboarding')}>{T('Accueil guidé', 'Onboarding')}</button>
            <button className="btn" style={{ height: 28, width: 26, padding: 0 }} onClick={() => set({ kbOpen: true })} title={T('Raccourcis', 'Shortcuts')}>?</button>
          </div>
        </div>
      </aside>
      <main style={{ minWidth: 0, overflow: 'auto' }}>{children}</main>
    </div>
  );
}

export function NotificationsPanel() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const go = useApp((s) => s.go);
  const open = useNotifs((s) => s.open);
  const items = useNotifs((s) => s.items);
  if (!open) return null;
  const close = () => useNotifs.getState().setOpen(false);
  const color: Record<string, string> = { export: '#30D158', assistant: '#0A84FF', chat: '#BF5AF2', trash: '#FF453A', version: '#FF9F0A', feedback: '#FFD60A', system: '#8E8E93' };
  return (
    <div onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }} style={{ position: 'fixed', inset: 0, zIndex: 76 }}>
      <div className="col" style={{ position: 'absolute', left: window.innerWidth < 860 ? 12 : 232, top: window.innerWidth < 860 ? 56 : 100, width: 360, maxWidth: 'calc(100vw - 24px)', maxHeight: '70vh', borderRadius: 20, background: 'var(--panel)', border: '1px solid var(--line2)', boxShadow: '0 30px 80px rgba(0,0,0,.4)', overflow: 'hidden' }}>
        <div className="row" style={{ gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <span className="grow" style={{ fontWeight: 600 }}>Notifications</span>
          <button className="btn bare" style={{ height: 24, padding: 0, color: 'var(--accTx)' }} onClick={() => useNotifs.getState().readAll()}>{T('Tout marquer comme lu', 'Mark all as read')}</button>
        </div>
        <div className="col" style={{ overflow: 'auto', padding: 6 }}>
          {items.slice(0, 30).map((n) => (
            <button key={n.id} onClick={() => { useNotifs.getState().read(n.id); close(); if (n.to) go(n.to, n.docId); }} className="row" style={{ width: '100%', gap: 12, alignItems: 'flex-start', padding: 10, border: 0, borderRadius: 12, background: n.unread ? 'var(--accSoft)' : 'transparent', textAlign: 'left' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: color[n.kind] ?? '#8E8E93', marginTop: 5, flex: 'none' }} />
              <span className="col grow" style={{ gap: 2 }}><span className="pretty" style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400 }}>{n.text}</span><span className="faint" style={{ fontSize: 11 }}>{new Date(n.at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
            </button>
          ))}
          {!items.length && <div className="faint pretty" style={{ padding: 30, textAlign: 'center', fontSize: 12 }}>{T('Aucune notification. Tu seras prévenu à la fin des exports, des actions de l’assistant et de Studio Chat.', 'No notifications. You will be told when exports, assistant actions and Studio Chat finish.')}</div>}
        </div>
        <div className="row" style={{ padding: '8px 12px', borderTop: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <button className="btn bare" style={{ height: 26, fontSize: 11 }} onClick={() => { close(); go('settings'); }}>{T('Préférences', 'Preferences')}</button>
          {items.length > 0 && <button className="btn bare" style={{ height: 26, fontSize: 11 }} onClick={() => useNotifs.getState().clear()}>{T('Tout effacer', 'Clear all')}</button>}
        </div>
      </div>
    </div>
  );
}
