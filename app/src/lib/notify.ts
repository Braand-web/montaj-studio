import { create } from 'zustand';
import { get, put } from './db';
import type { Screen } from '../store/app';

// In-app notifications: real events from this device (exports, assistant runs, trash…).

export type NotifKind = 'export' | 'assistant' | 'chat' | 'trash' | 'version' | 'feedback' | 'system';
export interface Notif { id: string; at: number; kind: NotifKind; text: string; to?: Screen; docId?: string; unread: boolean }

export const NOTIF_KINDS: NotifKind[] = ['export', 'assistant', 'chat', 'trash', 'version', 'feedback', 'system'];

interface NotifState {
  items: Notif[];
  prefs: Record<NotifKind, boolean>;
  open: boolean;
  load(): Promise<void>;
  push(n: Omit<Notif, 'id' | 'at' | 'unread'>): void;
  read(id: string): void;
  readAll(): void;
  clear(): void;
  setPref(k: NotifKind, v: boolean): void;
  setOpen(o: boolean): void;
}

const save = (s: { items: Notif[]; prefs: Record<NotifKind, boolean> }) => { void put('kv', 'notifs', { items: s.items.slice(0, 60), prefs: s.prefs }); };
const defaults = Object.fromEntries(NOTIF_KINDS.map((k) => [k, true])) as Record<NotifKind, boolean>;

export const useNotifs = create<NotifState>((set, getS) => ({
  items: [],
  prefs: defaults,
  open: false,
  async load() {
    const v = await get<{ items: Notif[]; prefs: Record<NotifKind, boolean> }>('kv', 'notifs');
    if (v) set({ items: v.items ?? [], prefs: { ...defaults, ...v.prefs } });
  },
  push(n) {
    if (!getS().prefs[n.kind]) return;
    const items = [{ ...n, id: Math.random().toString(36).slice(2), at: Date.now(), unread: true }, ...getS().items].slice(0, 60);
    set({ items });
    save({ items, prefs: getS().prefs });
  },
  read(id) { const items = getS().items.map((x) => (x.id === id ? { ...x, unread: false } : x)); set({ items }); save({ items, prefs: getS().prefs }); },
  readAll() { const items = getS().items.map((x) => ({ ...x, unread: false })); set({ items }); save({ items, prefs: getS().prefs }); },
  clear() { set({ items: [] }); save({ items: [], prefs: getS().prefs }); },
  setPref(k, v) { const prefs = { ...getS().prefs, [k]: v }; set({ prefs }); save({ items: getS().items, prefs }); },
  setOpen(o) { set({ open: o }); },
}));

export const notify = (n: Omit<Notif, 'id' | 'at' | 'unread'>) => useNotifs.getState().push(n);
