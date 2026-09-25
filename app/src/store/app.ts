import { create } from 'zustand';
import { flushSync } from 'react-dom';
import { get, prefs, put } from '../lib/db';
import type { BrandKit } from '../model/types';

export const APP_NAME = 'Montaj Studio';

export type Screen =
  | 'onboarding' | 'home' | 'chat' | 'credits' | 'feedback' | 'library' | 'templates' | 'bulk' | 'planner' | 'team' | 'brand'
  | 'providers' | 'usage' | 'trash' | 'settings' | 'admin' | 'legal' | 'design' | 'video' | 'site';

const SCREENS: Screen[] = ['onboarding', 'home', 'chat', 'credits', 'feedback', 'library', 'templates', 'bulk', 'planner', 'team', 'brand', 'providers', 'usage', 'trash', 'settings', 'admin', 'legal', 'design', 'video', 'site'];

// Hash routes (#/templates, #/design/<id>) so the browser back/forward buttons and reloads work.
function parseHash(): { screen: Screen; docId: string | null } | null {
  try {
    const [a, b] = location.hash.replace(/^#\/?/, '').split('/');
    if (!SCREENS.includes(a as Screen)) return null;
    if ((a === 'design' || a === 'video') && !b) return null;
    return { screen: a as Screen, docId: b ? decodeURIComponent(b) : null };
  } catch { return null; }
}
const hashOf = (screen: Screen, docId: string | null) => '#/' + screen + (docId && (screen === 'design' || screen === 'video') ? '/' + encodeURIComponent(docId) : '');
function writeHistory(screen: Screen, docId: string | null, replace = false) {
  try {
    const h = hashOf(screen, docId);
    if (!replace && location.hash === h) return;
    history[replace ? 'replaceState' : 'pushState']({ screen, docId }, '', h);
  } catch { /* sandboxed history */ }
}

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cross-fades a state change with the View Transitions API when the browser has it.
export function withTransition(update: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!d.startViewTransition || reducedMotion() || document.visibilityState !== 'visible') { update(); return; }
  try { d.startViewTransition(() => flushSync(update)); } catch { update(); }
}

export type Lang = 'fr' | 'en';
export type Mode = 'system' | 'dark' | 'light';
export type AgentMode = 'ask' | 'assist' | 'agent';
export type Tier = 'quick' | 'default' | 'complex';

export const DEFAULT_BRAND: BrandKit = {
  name: 'Ma marque',
  colors: ['#0F1115', '#F2F2EE', '#FFD23F', '#2E6BFF', '#E84A2F'],
  fonts: { heading: 'sans', body: 'sans' },
  tone: 'Direct et chaleureux. Phrases courtes, tutoiement.',
};

interface Toast { id: number; text: string; kind: 'ok' | 'err' | 'info' }

interface AppState {
  screen: Screen;
  docId: string | null;
  lang: Lang;
  mode: Mode;
  userName: string;
  onboarded: boolean;
  uses: string[];
  brand: BrandKit;
  tier: Tier;
  agentMode: AgentMode;
  toast: Toast | null;
  kbOpen: boolean;
  palOpen: boolean;
  pendingPrompt: string | null;
  go(screen: Screen, docId?: string | null): void;
  setLang(l: Lang): void;
  toggleLang(): void;
  setMode(m: Mode): void;
  cycleMode(): void;
  notify(text: string, kind?: Toast['kind']): void;
  setBrand(b: Partial<BrandKit>): void;
  set(p: Partial<Pick<AppState, 'userName' | 'onboarded' | 'uses' | 'tier' | 'agentMode' | 'kbOpen' | 'palOpen' | 'pendingPrompt'>>): void;
}

const initialLang: Lang = prefs.get<Lang>('lang', (navigator.language || 'fr').startsWith('en') ? 'en' : 'fr');

export const useApp = create<AppState>((setS, getS) => ({
  // First visit lands on the public site; returning users go straight to their home.
  screen: (prefs.get('onboarded', false) && parseHash()?.screen) || (prefs.get('onboarded', false) ? 'home' : 'site'),
  docId: prefs.get('onboarded', false) ? parseHash()?.docId ?? null : null,
  lang: initialLang,
  mode: prefs.get<Mode>('mode', 'system'),
  userName: prefs.get('userName', ''),
  onboarded: prefs.get('onboarded', false),
  uses: prefs.get<string[]>('uses', []),
  brand: DEFAULT_BRAND,
  tier: prefs.get<Tier>('tier', 'default'),
  agentMode: prefs.get<AgentMode>('agentMode', 'assist'),
  toast: null,
  kbOpen: false,
  palOpen: false,
  pendingPrompt: null,
  go(screen, docId = null) {
    const next = { screen, docId: docId ?? (screen === 'design' || screen === 'video' ? getS().docId : null) };
    if (next.screen === getS().screen && next.docId === getS().docId) return;
    withTransition(() => setS(next));
    writeHistory(next.screen, next.docId);
  },
  setLang(l) { prefs.set('lang', l); setS({ lang: l }); },
  toggleLang() { getS().setLang(getS().lang === 'fr' ? 'en' : 'fr'); },
  setMode(m) { prefs.set('mode', m); withTransition(() => setS({ mode: m })); },
  cycleMode() {
    const order: Mode[] = ['system', 'dark', 'light'];
    const m = order[(order.indexOf(getS().mode) + 1) % order.length];
    getS().setMode(m);
  },
  notify(text, kind = 'ok') {
    const id = Date.now();
    setS({ toast: { id, text, kind } });
    setTimeout(() => { if (getS().toast?.id === id) setS({ toast: null }); }, 3800);
  },
  setBrand(b) {
    const brand = { ...getS().brand, ...b };
    setS({ brand });
    void put('kv', 'brand', brand);
  },
  set(p) {
    for (const [k, v] of Object.entries(p)) if (['userName', 'onboarded', 'uses', 'tier', 'agentMode'].includes(k)) prefs.set(k, v);
    setS(p);
  },
}));

export async function loadBrand() {
  const b = await get<typeof DEFAULT_BRAND>('kv', 'brand');
  if (b) useApp.setState({ brand: { ...DEFAULT_BRAND, ...b } });
}

// Inline bilingual strings: every UI string exists in French and English (SPEC §2 i18n).
export function useT() {
  const lang = useApp((s) => s.lang);
  return (fr: string, en: string) => (lang === 'fr' ? fr : en);
}
export const tNow = (fr: string, en: string) => (useApp.getState().lang === 'fr' ? fr : en);

// Keep the URL in sync with the first screen, then follow the browser's back/forward buttons.
writeHistory(useApp.getState().screen, useApp.getState().docId, true);
window.addEventListener('popstate', (e) => {
  const st = (e.state as { screen?: Screen; docId?: string | null } | null) ?? parseHash();
  if (!st?.screen || !SCREENS.includes(st.screen)) return;
  const cur = useApp.getState();
  if (st.screen === cur.screen && (st.docId ?? null) === cur.docId) return;
  withTransition(() => useApp.setState({ screen: st.screen!, docId: st.docId ?? null, palOpen: false, kbOpen: false }));
});
