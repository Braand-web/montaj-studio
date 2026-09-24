import { create } from 'zustand';
import { get, put } from './db';

// Local log of every request sent to Claude from this device, plus the daily limit.

export type UsageSource = 'composer-design' | 'composer-video' | 'studio-chat' | 'ai-write' | 'ai-translate' | 'test';
export interface UsageRow { id: string; at: number; source: UsageSource; tier: string; tools: number; ms: number; status: 'ok' | 'error' | 'stopped'; code?: string; chars: number }

interface UsageState {
  rows: UsageRow[];
  dailyLimit: number; // 0 = no limit
  load(): Promise<void>;
  log(r: Omit<UsageRow, 'id' | 'at'>): void;
  setLimit(n: number): void;
  clear(): void;
  today(): number;
}

const persist = (s: { rows: UsageRow[]; dailyLimit: number }) => { void put('kv', 'usage', { rows: s.rows.slice(0, 500), dailyLimit: s.dailyLimit }); };
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const useUsage = create<UsageState>((set, getS) => ({
  rows: [],
  dailyLimit: 0,
  async load() {
    const v = await get<{ rows: UsageRow[]; dailyLimit: number }>('kv', 'usage');
    if (v) set({ rows: v.rows ?? [], dailyLimit: v.dailyLimit ?? 0 });
  },
  log(r) {
    const rows = [{ ...r, id: Math.random().toString(36).slice(2), at: Date.now() }, ...getS().rows].slice(0, 500);
    set({ rows });
    persist({ rows, dailyLimit: getS().dailyLimit });
  },
  setLimit(n) { set({ dailyLimit: Math.max(0, Math.round(n)) }); persist({ rows: getS().rows, dailyLimit: Math.max(0, Math.round(n)) }); },
  clear() { set({ rows: [] }); persist({ rows: [], dailyLimit: getS().dailyLimit }); },
  today() { const t = dayStart(); return getS().rows.filter((r) => r.at >= t && r.source !== 'test').length; },
}));

export function overBudget(): boolean {
  const s = useUsage.getState();
  return s.dailyLimit > 0 && s.today() >= s.dailyLimit;
}

// Wraps a one-off Claude call so it appears in the usage log and respects the daily limit.
export async function tracked<T>(source: UsageSource, tier: string, fn: () => Promise<T>, chars: (r: T) => number = () => 0): Promise<T> {
  if (overBudget()) throw { code: 'budget' };
  const t0 = performance.now();
  try {
    const r = await fn();
    useUsage.getState().log({ source, tier, tools: 0, ms: Math.round(performance.now() - t0), status: 'ok', chars: chars(r) });
    return r;
  } catch (e) {
    const code = (e as { code?: string })?.code;
    useUsage.getState().log({ source, tier, tools: 0, ms: Math.round(performance.now() - t0), status: code === 'cancelled' ? 'stopped' : 'error', code, chars: 0 });
    throw e;
  }
}
