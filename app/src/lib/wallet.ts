import { create } from 'zustand';
import { apiHeaders, backend } from './attach/backend';
import type { PlanId } from './pricing';
import { bootQuery } from '../store/app';

// Credit wallet on the Montaj server (hosted version only; inside claude.ai the AI runs on
// the viewer's own Claude plan and there is nothing to buy).

export interface LedgerRow { at: number; kind: string; credits: number; balance_after: number; model?: string; tier?: string; tokens_in?: number; tokens_out?: number; cache_read?: number; cost_usd?: number; ref?: string }
export interface WalletInfo {
  id: string; plan: PlanId; seats: number;
  credits: { sub: number; pack: number; total: number; monthly: number };
  periodEnds: number; packExpires: number | null;
  today: { requests: number; cap: number };
  hasSubscription: boolean;
  ledger: LedgerRow[];
}

interface WalletState {
  enabled: boolean; // billing active on this server
  info: WalletInfo | null;
  error: string | null;
  load(): Promise<void>;
  applyCharge(balance: number): void;
}

export const useWallet = create<WalletState>((set, get) => ({
  enabled: false, info: null, error: null,
  async load() {
    const b = await backend();
    if (!b.billing) { set({ enabled: false }); return; }
    set({ enabled: true });
    try {
      const r = await fetch('/api/wallet', { headers: apiHeaders() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'HTTP ' + r.status);
      set({ info: j as WalletInfo, error: null });
    } catch (e) { set({ error: (e as Error).message }); }
  },
  // Balance returned with each metered AI round: updated without refetching.
  applyCharge(balance) {
    const i = get().info;
    if (i) set({ info: { ...i, credits: { ...i.credits, total: balance } } });
  },
}));

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: 'POST', headers: apiHeaders({ 'content-type': 'application/json' }), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'HTTP ' + r.status);
  return j as T;
}
export const startCheckout = (item: string, opts: { interval?: 'month' | 'year'; seats?: number } = {}) => post<{ url: string }>('/api/billing/checkout', { item, ...opts });
export const openPortal = () => post<{ url: string }>('/api/billing/portal', {});

// Return from Stripe Checkout (#/credits?checkout=success|cancel), read once: the router
// rewrites the hash on boot, so the query is captured by the store before that.
let checkoutReturn: string | null = bootQuery.get('checkout');
export function takeCheckoutReturn(): string | null { const c = checkoutReturn; checkoutReturn = null; return c; }

// Own provider keys (Pro and Team). The server never sends a key back, only its last 4 characters.
export interface KeysInfo { available: boolean; allowed: boolean; keys: { provider: string; last4: string; created_at: number }[] }
async function keysCall(method: string, init: RequestInit = {}, q = ''): Promise<KeysInfo> {
  const r = await fetch('/api/keys' + q, { method, ...init, headers: apiHeaders(init.body ? { 'content-type': 'application/json' } : {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? 'HTTP ' + r.status);
  return j as KeysInfo;
}
export const getKeys = () => keysCall('GET');
export const saveKey = (provider: string, key: string) => keysCall('PUT', { body: JSON.stringify({ provider, key }) });
export const deleteKey = (provider: string) => keysCall('DELETE', {}, '?provider=' + encodeURIComponent(provider));
