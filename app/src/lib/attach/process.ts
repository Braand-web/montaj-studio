import { kindOf, maxSize, fmtSize, extractText, clip, type FileKind } from './extract';
import { backend, upload, extractRemote, transcribeRemote, ApiError } from './backend';
import { videoFrames, videoAudioWav } from './video';
import { importBlob } from '../media';
import { uid } from '../util';

// One attachment of a Studio Chat conversation. Blobs (vision inputs) live in memory for the
// session; the rest is saved with the conversation so later messages can refer to it.

export interface Attachment {
  id: string;
  n: number; // #1, #2… within the conversation, so the user can say "the image from earlier"
  name: string; size: number; mime: string; kind: FileKind;
  status: 'processing' | 'uploading' | 'ready' | 'error';
  progress: number; // 0..1
  step?: string; // what is happening now, shown under the progress bar
  error?: string;
  mediaId?: string; // images and videos also land in the media library (usable in documents)
  thumb?: string; // small data URL preview
  remoteId?: string; // stored on the server (R2)
  text?: string; // extracted text / transcript
  pages?: number; duration?: number; frames?: number; w?: number; h?: number;
  summary: string; // one line describing what the AI receives
  where: 'server' | 'browser';
}

// Vision inputs per attachment id (image itself, PDF scan pages, video key frames).
export const visionStore = new Map<string, { label: string; blob: Blob }[]>();

export function validate(file: File): { kind: FileKind } | { error: string } {
  const kind = kindOf(file.name, file.type);
  if (!kind) return { error: `« ${file.name} » : type de fichier non pris en charge.` };
  const max = maxSize(kind);
  if (file.size > max) return { error: `« ${file.name} » fait ${fmtSize(file.size)} : la limite est ${fmtSize(max)} ${kind === 'video' ? 'par vidéo' : kind === 'image' || kind === 'svg' ? 'par image' : 'par fichier'}.` };
  if (file.size === 0) return { error: `« ${file.name} » est vide.` };
  return { kind };
}

async function thumbOf(blob: Blob): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(blob);
    const s = 96 / Math.max(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  } catch { return undefined; }
}

// SVG is not a vision format: rasterize it to PNG for the model, keep the source as text.
async function svgToPng(file: Blob): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('svg')); img.src = url; });
    const w = img.naturalWidth || 1024, h = img.naturalHeight || 1024, s = Math.min(4, 1024 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const x = c.getContext('2d')!;
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/png'));
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

// Scanned PDF in the browser: render the first pages so the model can read them (OCR by vision).
async function pdfPages(bytes: Uint8Array, max: number): Promise<Blob[]> {
  try {
    const { getDocumentProxy, renderPageAsImage } = await import('unpdf');
    const doc = await getDocumentProxy(new Uint8Array(bytes));
    const out: Blob[] = [];
    for (let i = 1; i <= Math.min(doc.numPages, max); i++) {
      const buf = await renderPageAsImage(doc, i, { width: 1200 });
      out.push(new Blob([buf], { type: 'image/png' }));
    }
    return out;
  } catch { return []; }
}

const KIND_LABEL: Record<FileKind, string> = {
  image: 'image', svg: 'image SVG', video: 'vidéo', pdf: 'PDF', docx: 'document Word', xlsx: 'classeur Excel', csv: 'tableau CSV', text: 'texte', code: 'code source', json: 'JSON', zip: 'archive ZIP',
};

export async function processFile(file: File, n: number, onUpdate: (a: Attachment) => void, signal?: AbortSignal): Promise<Attachment> {
  const v = validate(file);
  const base: Attachment = { id: uid('att'), n, name: file.name, size: file.size, mime: file.type, kind: 'kind' in v ? v.kind : 'text', status: 'processing', progress: 0, summary: '', where: 'browser' };
  if ('error' in v) { const a = { ...base, status: 'error' as const, error: v.error, summary: v.error }; onUpdate(a); return a; }
  let a = base;
  const up = (p: Partial<Attachment>) => { a = { ...a, ...p }; onUpdate(a); };
  const kind = v.kind;
  const be = await backend();
  try {
    // 1. Upload to the app's storage when the server exists (claude.ai pages cannot reach one).
    if (be.upload) {
      up({ status: 'uploading', step: 'Envoi…', where: 'server' });
      const r = await upload(file, file.name, (p) => up({ progress: p * 0.7 }), signal);
      up({ remoteId: r.id, status: 'processing', progress: 0.7 });
    }
    const vis: { label: string; blob: Blob }[] = [];
    if (kind === 'image' || kind === 'svg') {
      up({ step: 'Préparation de l’image…' });
      const m = await importBlob(file, file.name, 'import', 'image');
      const pic = kind === 'svg' ? await svgToPng(file) : file;
      if (pic) vis.push({ label: `#${n} ${file.name}`, blob: pic });
      const svgText = kind === 'svg' ? clip(await file.text(), 20_000) : undefined;
      up({ mediaId: m?.id, thumb: await thumbOf(pic ?? file), w: m?.w, h: m?.h, text: svgText, summary: `${KIND_LABEL[kind]} ${m?.w ?? '?'}×${m?.h ?? '?'} px${m ? `, media id ${m.id}` : ''}` });
    } else if (kind === 'video') {
      up({ step: 'Import dans la médiathèque…', progress: Math.max(a.progress, 0.05) });
      const m = await importBlob(file, file.name, 'import', 'video');
      up({ step: 'Extraction des images clés…' });
      const fr = await videoFrames(file, { onProgress: (p) => up({ progress: Math.max(a.progress, 0.7 * p) }) });
      fr.frames.forEach((f) => vis.push({ label: `#${n} ${file.name} à ${f.t}s`, blob: f.blob }));
      let transcript = '';
      let note = '';
      up({ step: 'Lecture de la piste audio…', thumb: fr.frames[0] ? await thumbOf(fr.frames[0].blob) : undefined });
      const wav = await videoAudioWav(file);
      if (!wav) note = 'pas de piste audio exploitable';
      else if (be.transcribe) {
        up({ step: 'Transcription de l’audio…', progress: 0.85 });
        try { transcript = (await transcribeRemote(wav)).text.trim(); } catch (e) { note = 'transcription échouée : ' + (e as Error).message; }
      } else note = 'transcription audio indisponible ici (elle se fait sur le serveur Montaj)';
      up({ mediaId: m?.id, duration: Math.round(fr.duration), frames: fr.frames.length, w: fr.w, h: fr.h, text: transcript ? clip(transcript, 20_000) : undefined,
        summary: `vidéo ${Math.round(fr.duration)} s, ${fr.w}×${fr.h}, ${fr.frames.length} images clés${transcript ? ', transcription audio' : ''}${note ? ` (${note})` : ''}${m ? `, media id ${m.id}` : ''}` });
    } else {
      // Documents: extracted on the server when available, otherwise in this browser.
      up({ step: 'Extraction du texte…' });
      let r: { text: string; pages?: number; scanned?: boolean };
      if (a.remoteId) r = await extractRemote(a.remoteId);
      else r = await extractText(kind, new Uint8Array(await file.arrayBuffer()));
      if (kind === 'pdf' && r.scanned && !a.remoteId) {
        up({ step: 'PDF scanné : rendu des pages pour la lecture visuelle…' });
        (await pdfPages(new Uint8Array(await file.arrayBuffer()), 6)).forEach((b, i) => vis.push({ label: `#${n} ${file.name} page ${i + 1}`, blob: b }));
      }
      const scanNote = kind === 'pdf' && r.scanned ? (a.remoteId ? ' (scanné : Claude lit le PDF directement)' : ` (scanné : ${vis.length} page(s) envoyée(s) en image pour la lecture)`) : '';
      up({ text: clip(r.text), pages: r.pages, summary: `${KIND_LABEL[kind]}${r.pages ? `, ${r.pages} page(s)` : ''}, ${r.text.length.toLocaleString('fr-FR')} caractères extraits${scanNote}` });
    }
    visionStore.set(a.id, vis);
    up({ status: 'ready', progress: 1, step: undefined });
    return a;
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e);
    up({ status: 'error', error: `« ${file.name} » : ${msg}`, summary: 'échec : ' + msg, step: undefined });
    return a;
  }
}
