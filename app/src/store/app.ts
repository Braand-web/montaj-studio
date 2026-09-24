import { create } from 'zustand';
import { get, prefs, put } from '../lib/db';
import type { BrandKit } from '../model/types';

export const APP_NAME = 'Montaj Studio';

export type Screen =
  | 'onboarding' | 'home' | 'chat' | 'credits' | 'feedback' | 'library' | 'templates' | 'bulk' | 'planner' | 'team' | 'brand'
  | 'providers' | 'usage' | 'trash' | 'settings' | 'admin' | 'legal' | 'design' | 'video';

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
  screen: prefs.get('onboarded', false) ? 'home' : 'onboarding',
  docId: null,
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
    setS({ screen, docId: docId ?? (screen === 'design' || screen === 'video' ? getS().docId : null) });
  },
  setLang(l) { prefs.set('lang', l); setS({ lang: l }); },
  toggleLang() { getS().setLang(getS().lang === 'fr' ? 'en' : 'fr'); },
  setMode(m) { prefs.set('mode', m); setS({ mode: m }); },
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
