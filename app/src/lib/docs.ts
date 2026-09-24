import { all, del, get, put } from './db';
import type { DesignData, Doc, DocKind, DocMeta, Version, VideoData } from '../model/types';
import { uid } from './util';

// Documents live in IndexedDB. Metadata and data are stored together; lists are small.

const listeners = new Set<() => void>();
export const onDocsChange = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => f());

export async function listDocs(): Promise<DocMeta[]> {
  const docs = await all<Doc>('docs');
  return docs
    .map(({ data: _data, ...meta }) => meta)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export const getDoc = <T extends DesignData | VideoData>(id: string) => get<Doc<T>>('docs', id);

export async function createDoc<T extends DesignData | VideoData>(kind: DocKind, name: string, format: string, data: T): Promise<Doc<T>> {
  const now = Date.now();
  const doc: Doc<T> = { id: uid('d'), kind, name, format, createdAt: now, updatedAt: now, data };
  await put('docs', doc.id, doc);
  emit();
  return doc;
}

export async function saveDoc(doc: Doc) {
  doc.updatedAt = Date.now();
  await put('docs', doc.id, doc);
  emit();
}

export async function patchDoc(id: string, patch: Partial<DocMeta>) {
  const d = await get<Doc>('docs', id);
  if (!d) return;
  Object.assign(d, patch);
  await put('docs', id, d);
  emit();
}

export const trashDoc = (id: string) => patchDoc(id, { trashedAt: Date.now() });
export const restoreDoc = (id: string) => patchDoc(id, { trashedAt: undefined });

export async function purgeDoc(id: string) {
  await del('docs', id);
  for (const v of await listVersions(id)) await del('versions', v.id);
  emit();
}

// Documents in the trash for more than 30 days are removed at startup.
export async function sweepTrash(): Promise<{ purged: number; soon: number }> {
  const limit = Date.now() - 30 * 86400_000;
  let purged = 0, soon = 0;
  for (const d of await listDocs()) {
    if (!d.trashedAt) continue;
    if (d.trashedAt < limit) { await purgeDoc(d.id); purged++; }
    else if (d.trashedAt < limit + 3 * 86400_000) soon++;
  }
  return { purged, soon };
}

export async function listVersions(docId: string): Promise<Version[]> {
  const vs = await all<Version>('versions');
  return vs.filter((v) => v.docId === docId).sort((a, b) => b.at - a.at);
}

export async function addVersion(doc: Doc, origin: Version['origin'], label: string) {
  const v: Version = { id: uid('v'), docId: doc.id, at: Date.now(), origin, label, data: JSON.parse(JSON.stringify(doc.data)), name: doc.name };
  await put('versions', v.id, v);
  // Keep the 40 most recent versions per document.
  const vs = await listVersions(doc.id);
  for (const old of vs.slice(40)) await del('versions', old.id);
  return v;
}

// Names of the documents (not in the trash) that use a media item.
export async function mediaUsage(): Promise<Map<string, string[]>> {
  const docs = await all<Doc>('docs');
  const map = new Map<string, string[]>();
  for (const d of docs) {
    if (d.trashedAt) continue;
    const ids = d.kind === 'video'
      ? (d.data as VideoData).clips.map((c) => c.mediaId)
      : (d.data as DesignData).pages.flatMap((p) => p.els.map((e) => e.mediaId));
    for (const id of new Set(ids.filter(Boolean) as string[])) map.set(id, [...(map.get(id) ?? []), d.name]);
  }
  return map;
}
