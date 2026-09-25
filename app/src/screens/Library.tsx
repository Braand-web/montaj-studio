import { useEffect, useState } from 'react';
import { Images, Upload, Music } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead, Modal } from '../ui/kit';
import { useImages } from '../design/LeftPanel';
import { deleteMedia, importFiles, mediaUrl, updateMedia } from '../lib/media';
import { mediaUsage } from '../lib/docs';
import { bytes, uid } from '../lib/util';
import { fmtDur } from '../video/store';
import type { MediaItem } from '../model/types';
import { newDesignFromData, emptyVideo } from '../lib/create';
import { createDoc } from '../lib/docs';

type Filter = 'all' | 'video' | 'image' | 'audio' | 'recording' | 'capture';

export function Library() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const notify = useApp((s) => s.notify);
  const go = useApp((s) => s.go);
  const items = useImages();
  const [q, setQ] = useState('');
  const [f, setF] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [usage, setUsage] = useState<Map<string, string[]>>(new Map());
  const [url, setUrl] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [drop, setDrop] = useState(false);
  useEffect(() => { void mediaUsage().then(setUsage); }, [items]);
  const cur = items.find((m) => m.id === sel);
  useEffect(() => { setUrl(null); if (cur) void mediaUrl(cur.id).then(setUrl); }, [cur?.id]);

  const shown = items.filter((m) => (f === 'all' || m.kind === f || m.source === f) && (!q || m.name.toLowerCase().includes(q.toLowerCase())));
  const filters: { id: Filter; l: string }[] = [
    { id: 'all', l: T('Tout', 'All') }, { id: 'video', l: T('Vidéos', 'Videos') }, { id: 'image', l: T('Images', 'Images') },
    { id: 'audio', l: 'Audio' }, { id: 'recording', l: T('Enregistrements', 'Recordings') }, { id: 'capture', l: T('Captures', 'Captures') },
  ];
  const total = items.reduce((s, m) => s + m.size, 0);
  const onFiles = async (fl: FileList | null) => {
    if (!fl?.length) return;
    const { ok, rejected } = await importFiles(fl);
    if (ok.length) notify(T(`${ok.length} média(s) importé(s).`, `${ok.length} media imported.`));
    if (rejected.length) notify(T('Format non pris en charge : ', 'Unsupported format: ') + rejected.join(', '), 'err');
  };
  const kindLabel = (m: MediaItem) => ({ video: T('VIDÉO', 'VIDEO'), image: 'IMAGE', audio: 'AUDIO' })[m.kind];
  const srcLabel = (m: MediaItem) => ({ import: T('Import', 'Import'), capture: T('Capture d’une vidéo', 'Video capture'), recording: T('Enregistrement', 'Recording'), generated: T('Généré', 'Generated') })[m.source];

  const openInNew = async (m: MediaItem) => {
    if (m.kind === 'image') {
      const w = m.w && m.h && m.h > m.w ? 1080 : 1280, h = m.w && m.h && m.h > m.w ? 1920 : 720;
      await newDesignFromData(m.name.replace(/\.[a-z0-9]+$/i, ''), { pages: [{ id: uid('p'), w, h, bg: '#0F1115', els: [{ id: uid('e'), type: 'image', name: m.name, mediaId: m.id, x: 0, y: 0, w, h, fit: 'cover' }] }] });
    } else {
      const vertical = !!(m.w && m.h && m.h > m.w);
      const data = emptyVideo(vertical ? 1080 : 1920, vertical ? 1920 : 1080);
      data.clips.push({ id: uid('c'), track: m.kind === 'audio' ? 'audio' : 'video', kind: m.kind, mediaId: m.id, name: m.name, start: 0, dur: Math.max(0.5, m.duration ?? 5), in: 0, volume: 1, speed: 1 });
      const d = await createDoc('video', m.name.replace(/\.[a-z0-9]+$/i, ''), `${data.w}×${data.h}`, data);
      go('video', d.id);
    }
  };

  return (
    <div className="page screen-in" style={{ maxWidth: 1400 }} onDragOver={(e) => { e.preventDefault(); setDrop(true); }} onDragLeave={() => setDrop(false)} onDrop={(e) => { e.preventDefault(); setDrop(false); void onFiles(e.dataTransfer.files); }}>
      <PageHead color="#FF9F0A" icon={<Images size={19} />} title={T('Médiathèque', 'Media library')} sub={T('Un média importé une fois est réutilisable dans tous tes documents. Les doublons sont détectés par empreinte SHA-256. Tout reste sur cet appareil.', 'Media imported once is reusable across all your documents. Duplicates are detected by SHA-256 hash. Everything stays on this device.')}
        right={<div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
          <label className="btn primary md" style={{ cursor: 'pointer' }}><Upload size={13} />{T('Importer', 'Import')}<input type="file" multiple accept="video/*,image/*,audio/*" hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} /></label>
          <span className="mono muted" style={{ fontSize: 11 }}>{items.length} {T('médias', 'media')} · {bytes(total, lang)}</span>
        </div>} />
      <div className="row wrap" style={{ gap: 8 }}>
        <input id="lib-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('Rechercher par nom', 'Search by name')} style={{ flex: 1, minWidth: 220, height: 34, background: 'var(--panel)' }} />
        {filters.map((x) => <button key={x.id} className={'chip' + (f === x.id ? ' on' : '')} onClick={() => setF(x.id)}>{x.l}</button>)}
      </div>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="stagger" style={{ flex: '1 1 420px', minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, outline: drop ? '2px dashed var(--acc)' : undefined, outlineOffset: 6, borderRadius: 10 }}>
          {shown.map((m) => (
            <button key={m.id} onClick={() => setSel(m.id)} className="col" style={{ padding: 0, border: 0, background: 'transparent', gap: 6, textAlign: 'left' }}>
              <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 10, outline: sel === m.id ? '2px solid var(--acc)' : undefined, outlineOffset: 2, border: '1px solid var(--line)', background: m.thumb ? `url(${m.thumb}) center/cover` : 'var(--panel2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 6 }}>
                <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: 'var(--bg)', color: 'var(--tx2)' }}>{kindLabel(m)}</span>
                {!m.thumb && <Music size={22} color="var(--tx3)" style={{ alignSelf: 'center' }} />}
                <span />
              </div>
              <div className="col" style={{ gap: 1, minWidth: 0, width: '100%' }}>
                <span className="ell" style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</span>
                <span className="ell faint" style={{ fontSize: 11 }}>{m.kind === 'image' ? `${m.w}×${m.h}` : fmtDur(m.duration ?? 0) + (m.w ? ` · ${m.w}×${m.h}` : '')} · {bytes(m.size, lang)}</span>
              </div>
            </button>
          ))}
          {shown.length === 0 && <div className="muted" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 16, fontSize: 12 }}>{items.length ? T('Aucun média ne correspond.', 'No matching media.') : T('Ta médiathèque est vide. Importe ou dépose des vidéos, photos et sons ici.', 'Your library is empty. Import or drop videos, photos and sounds here.')}</div>}
        </div>
        <div className="card col" style={{ flex: '0 1 300px', minWidth: 260, padding: 14, gap: 10 }}>
          {!cur && <span className="muted" style={{ fontSize: 12 }}>{T('Sélectionne un média pour voir ses détails et où il est utilisé.', 'Select a media item to see its details and where it is used.')}</span>}
          {cur && (
            <>
              {url && cur.kind === 'image' && <img src={url} alt="" style={{ width: '100%', borderRadius: 10, border: '1px solid var(--line)' }} />}
              {url && cur.kind === 'video' && <video src={url} controls style={{ width: '100%', borderRadius: 10, background: '#000' }} />}
              {url && cur.kind === 'audio' && <audio src={url} controls style={{ width: '100%' }} />}
              <input className="input" value={cur.name} onChange={(e) => void updateMedia({ ...cur, name: e.target.value })} style={{ fontWeight: 600 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr)', gap: '6px 10px', fontSize: 12 }}>
                <span className="faint">{T('Taille', 'Size')}</span><span>{bytes(cur.size, lang)}</span>
                {cur.w ? <><span className="faint">{T('Dimensions', 'Dimensions')}</span><span>{cur.w}×{cur.h}</span></> : null}
                {cur.duration ? <><span className="faint">{T('Durée', 'Duration')}</span><span>{fmtDur(cur.duration)}</span></> : null}
                <span className="faint">{T('Source', 'Source')}</span><span>{srcLabel(cur)}</span>
                <span className="faint">{T('Licence', 'License')}</span><span>{T('Contenu personnel', 'Personal content')}</span>
                <span className="faint">{T('Empreinte', 'Hash')}</span><span className="mono" style={{ wordBreak: 'break-all', fontSize: 10 }}>{cur.hash.slice(0, 23)}…</span>
                <span className="faint">{T('Utilisé dans', 'Used in')}</span><span>{usage.get(cur.id)?.join(', ') || T('Aucun document', 'No document')}</span>
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                <button className="btn" onClick={() => void openInNew(cur)}>{cur.kind === 'image' ? T('Nouveau design avec', 'New design with it') : T('Nouvelle vidéo avec', 'New video with it')}</button>
                <button className="btn danger" onClick={() => setConfirmDel(true)}>{T('Supprimer', 'Delete')}</button>
              </div>
            </>
          )}
        </div>
      </div>
      {confirmDel && cur && (
        <Modal title={T('Supprimer ce média ?', 'Delete this media?')} onClose={() => setConfirmDel(false)} width={440}
          footer={<><button className="btn md" onClick={() => setConfirmDel(false)}>{T('Annuler', 'Cancel')}</button><button className="btn md" style={{ background: 'var(--warn)', color: '#fff' }} onClick={async () => { await deleteMedia(cur.id); setSel(null); setConfirmDel(false); notify(T('Média supprimé.', 'Media deleted.')); }}>{T('Supprimer définitivement', 'Delete forever')}</button></>}>
          <span className="pretty">{usage.get(cur.id)?.length ? T(`Il est utilisé dans : ${usage.get(cur.id)!.join(', ')}. Ces documents afficheront un cadre vide à sa place.`, `It is used in: ${usage.get(cur.id)!.join(', ')}. Those documents will show an empty frame instead.`) : T('Il n’est utilisé dans aucun document.', 'It is not used in any document.')}</span>
        </Modal>
      )}
    </div>
  );
}
