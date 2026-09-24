// Local-first storage (SPEC §3.6). IndexedDB holds documents, media blobs and versions.
// When IndexedDB is unavailable (private window, blocked storage) everything falls back to
// memory so the editors still work for the session.

type StoreName = 'docs' | 'media' | 'blobs' | 'versions' | 'kv';
const STORES: StoreName[] = ['docs', 'media', 'blobs', 'versions', 'kv'];

let dbp: Promise<IDBDatabase | null> | null = null;
const mem: Record<StoreName, Map<string, unknown>> = {
  docs: new Map(), media: new Map(), blobs: new Map(), versions: new Map(), kv: new Map(),
};
export let persistent = true;

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open('montaj-studio', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { persistent = false; resolve(null); };
      req.onblocked = () => { persistent = false; resolve(null); };
    } catch {
      persistent = false;
      resolve(null);
    }
  });
  return dbp;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then((db) => new Promise<T | undefined>((resolve) => {
    if (!db) { resolve(undefined); return; }
    try {
      const t = db.transaction(store, mode);
      const r = fn(t.objectStore(store));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return mem[store].get(key) as T | undefined;
  return tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>);
}

export async function put(store: StoreName, key: string, value: unknown): Promise<void> {
  const db = await open();
  if (!db) { mem[store].set(key, value); return; }
  await tx(store, 'readwrite', (s) => s.put(value, key));
}

export async function del(store: StoreName, key: string): Promise<void> {
  const db = await open();
  if (!db) { mem[store].delete(key); return; }
  await tx(store, 'readwrite', (s) => s.delete(key));
}

export async function all<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  if (!db) return [...mem[store].values()] as T[];
  return (await tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)) ?? [];
}

export async function estimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e) return null;
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}

export async function requestPersist(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

// Small per-viewer preferences (theme, language, last tab). Never required for correctness.
export const prefs = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem('ms:' + key);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem('ms:' + key, JSON.stringify(value)); } catch { /* storage blocked */ }
  },
};

export async function clearAll(): Promise<void> {
  const db = await open();
  for (const s of STORES) {
    if (!db) { mem[s].clear(); continue; }
    await tx(s, 'readwrite', (st) => st.clear());
  }
}
