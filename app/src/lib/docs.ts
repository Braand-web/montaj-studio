import { all, del, get, put } from './db';
import type { CreativeProjectData, DesignData, Doc, DocKind, DocMeta, EditorMode, Page, Version, VideoData } from '../model/types';
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

export const getDoc = <T extends DesignData | VideoData | CreativeProjectData>(id: string) => get<Doc<T>>('docs', id);

const blankPage = (w: number, h: number): Page => ({ id: uid('p'), w, h, bg: '#FFFFFF', els: [] });
const emptyVideo = (w: number, h: number): VideoData => ({ w, h, fps: 30, bg: '#000000', clips: [], captions: [], capStyle: 'tiktok', capY: 72, markers: [] });
const isProjectData = (d: unknown): d is CreativeProjectData => !!d && typeof d === 'object' && (d as CreativeProjectData).schemaVersion === 1 && !!(d as CreativeProjectData).design && !!(d as CreativeProjectData).video;

function normalizeProject(d: Doc): Doc<CreativeProjectData> | null {
  if (d.kind === 'creative') return isProjectData(d.data) ? d as Doc<CreativeProjectData> : null;
  if (d.kind === 'design') {
    const design = d.data as DesignData;
    if (!Array.isArray(design.pages) || !design.pages.length) return null;
    const first = design.pages[0];
    return { ...d, kind: 'creative', mode: 'pages', data: { schemaVersion: 1, design, video: emptyVideo(first.w, first.h) } };
  }
  const video = d.data as VideoData;
  if (!Array.isArray(video.clips) || !Number.isFinite(video.w) || !Number.isFinite(video.h)) return null;
  return { ...d, kind: 'creative', mode: 'timeline', data: { schemaVersion: 1, design: { pages: [blankPage(video.w, video.h)] }, video } };
}

/** Read a project through the unified model and upgrade legacy documents in place. */
export async function getProjectDoc(id: string): Promise<Doc<CreativeProjectData> | null> {
  const raw = await get<Doc>('docs', id);
  if (!raw) return null;
  const project = normalizeProject(raw);
  if (!project) return null;
  if (raw.kind !== 'creative') { await put('docs', id, project); emit(); }
  return project;
}

export async function createProjectDoc(mode: EditorMode, name: string, format: string, data: DesignData | VideoData): Promise<Doc<CreativeProjectData>> {
  const now = Date.now();
  const design = mode === 'pages' ? data as DesignData : { pages: [blankPage((data as VideoData).w, (data as VideoData).h)] };
  const video = mode === 'timeline' ? data as VideoData : emptyVideo(design.pages[0].w, design.pages[0].h);
  const doc: Doc<CreativeProjectData> = { id: uid('d'), kind: 'creative', mode, name, format, createdAt: now, updatedAt: now, data: { schemaVersion: 1, design, video } };
  await put('docs', doc.id, doc);
  emit();
  return doc;
}

export async function createDoc<T extends DesignData | VideoData>(kind: DocKind, name: string, format: string, data: T): Promise<Doc<T>> {
  const now = Date.now();
  const doc: Doc<T> = { id: uid('d'), kind, name, format, createdAt: now, updatedAt: now, data };
  await put('docs', doc.id, doc);
  emit();
  return doc;
}

export async function saveDoc(doc: Doc) {
  return serializeDocWrite(doc.id, async () => {
    const current = await get<Doc>('docs', doc.id);
    if (doc.kind === 'creative' && !isProjectData(doc.data)) {
      const base = current ? normalizeProject(current) : null;
      if (!base) return;
      const partial = doc.data as DesignData | VideoData;
      if ('pages' in partial) base.data.design = partial;
      else {
        const { pageSources: _pageSources, ...video } = partial;
        base.data.video = video;
      }
      Object.assign(base, { name: doc.name, format: doc.format, thumb: doc.thumb, mode: doc.mode ?? base.mode, updatedAt: Date.now() });
      await put('docs', doc.id, base);
    } else {
      doc.updatedAt = Date.now();
      await put('docs', doc.id, doc);
    }
    emit();
  });
}

const writes = new Map<string, Promise<unknown>>();

function serializeDocWrite<T>(id: string, write: () => Promise<T>): Promise<T> {
  const prior = writes.get(id) ?? Promise.resolve();
  const next = prior.catch(() => undefined).then(write);
  writes.set(id, next);
  return next.finally(() => { if (writes.get(id) === next) writes.delete(id); });
}

async function updateProject(id: string, mutate: (project: Doc<CreativeProjectData>) => boolean | Promise<boolean>) {
  return serializeDocWrite(id, async () => {
    const project = await getProjectDoc(id);
    if (!project) return null;
    if (!await mutate(project)) return project;
    project.updatedAt = Date.now();
    await put('docs', id, project);
    emit();
    return project;
  });
}

/** Preserve page-linked scenes by making a detached page source before its source page is removed. */
export async function detachLinkedPage(docId: string, pageId: string): Promise<void> {
  await updateProject(docId, (project) => {
    const source = project.data.design.pages.find((p) => p.id === pageId);
    if (!source) return false;
    const linked = project.data.video.clips.filter((c) => c.kind === 'page' && c.pageId === pageId);
    if (!linked.length) return false;
    const copy = { ...JSON.parse(JSON.stringify(source)), id: uid('p'), label: `${source.label ?? 'Page'} · copie liée` } as Page;
    project.data.video.detachedPages = [...(project.data.video.detachedPages ?? []), copy];
    for (const c of linked) c.pageId = copy.id;
    return true;
  });
}

export async function addProjectPage(docId: string, page: Page): Promise<void> {
  const project = await updateProject(docId, (d) => { d.data.design.pages.push(page); d.mode = 'pages'; return true; });
  if (!project) throw new Error('Project not found');
}

export async function addPageScene(docId: string, pageId: string): Promise<void> {
  let found = false;
  const project = await updateProject(docId, (d) => {
    const page = d.data.design.pages.find((p) => p.id === pageId);
    if (!page) return false;
    found = true;
    const animatedUntil = Math.max(0, ...page.els.filter((e) => e.anim && e.anim !== 'none').map((e) => (e.delay ?? 0) + 2.1));
    const dur = page.dur ?? Math.max(3, animatedUntil);
    const start = Math.max(0, ...d.data.video.clips.filter((c) => c.track === 'video').map((c) => c.start + c.dur));
    d.data.video.clips.push({ id: uid('c'), track: 'video', kind: 'page', pageId, name: page.label ?? `Page ${d.data.design.pages.indexOf(page) + 1}`, start, dur, in: 0, fit: 'contain', volume: 1, speed: 1 });
    d.mode = 'timeline';
    return true;
  });
  if (!project) throw new Error('Project not found');
  if (!found) throw new Error('Page not found');
}

export async function restoreProjectData(docId: string, data: CreativeProjectData): Promise<Doc<CreativeProjectData> | null> {
  return await updateProject(docId, (project) => { project.data = JSON.parse(JSON.stringify(data)); return true; });
}

export async function patchDoc(id: string, patch: Partial<DocMeta>) {
  return serializeDocWrite(id, async () => {
    const d = await get<Doc>('docs', id);
    if (!d) return;
    Object.assign(d, patch);
    await put('docs', id, d);
    emit();
  });
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
  const full = doc.kind === 'creative' ? await getProjectDoc(doc.id) : null;
  let data = full?.data ?? doc.data;
  if (full && !isProjectData(doc.data)) {
    if ('pages' in doc.data) data = { ...full.data, design: doc.data as DesignData };
    else {
      const { pageSources: _pageSources, ...video } = doc.data as VideoData;
      data = { ...full.data, video };
    }
  } else if (full && isProjectData(doc.data)) data = doc.data;
  const v: Version = { id: uid('v'), docId: doc.id, at: Date.now(), origin, label, data: JSON.parse(JSON.stringify(data)), name: doc.name };
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
    const ids = d.kind === 'creative'
      ? [...(d.data as CreativeProjectData).video.clips.map((c) => c.mediaId), ...(d.data as CreativeProjectData).design.pages.flatMap((p) => p.els.map((e) => e.mediaId))]
      : d.kind === 'video'
        ? (d.data as VideoData).clips.map((c) => c.mediaId)
        : (d.data as DesignData).pages.flatMap((p) => p.els.map((e) => e.mediaId));
    for (const id of new Set(ids.filter(Boolean) as string[])) map.set(id, [...(map.get(id) ?? []), d.name]);
  }
  return map;
}
