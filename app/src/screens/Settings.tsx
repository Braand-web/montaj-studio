import { useEffect, useState } from 'react';
import { Settings as Cog } from 'lucide-react';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { useApp, useT, type Mode } from '../store/app';
import { PageHead, Chips, Modal } from '../ui/kit';
import { all, estimate, persistent, put, requestPersist, get, clearAll } from '../lib/db';
import { saveFile } from '../lib/claude';
import { bytes } from '../lib/util';
import type { Doc, MediaItem } from '../model/types';

export function Settings() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.mode);
  const notify = useApp((s) => s.notify);
  const [store, setStore] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [wipe, setWipe] = useState(false);
  useEffect(() => { void estimate().then(setStore); void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)); }, []);

  const backup = async () => {
    setBusy(true);
    try {
      const docs = await all<Doc>('docs');
      const media = await all<MediaItem>('media');
      const files: Record<string, Uint8Array> = {
        'docs.json': strToU8(JSON.stringify(docs)),
        'media.json': strToU8(JSON.stringify(media)),
        'brand.json': strToU8(JSON.stringify(useApp.getState().brand)),
        'posts.json': strToU8(JSON.stringify((await get('kv', 'posts')) ?? [])),
      };
      for (const m of media) {
        const b = await get<Blob>('blobs', m.id);
        if (b) files[`media/${m.id}`] = new Uint8Array(await b.arrayBuffer());
      }
      const r = await saveFile(`montaj-sauvegarde-${new Date().toISOString().slice(0, 10)}.zip`, new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }));
      if (r === 'saved') notify(T('Sauvegarde enregistrée.', 'Backup saved.'));
      else if (r === 'failed') notify(T('Enregistrement impossible dans cette vue.', 'Saving is not possible in this view.'), 'err');
    } finally { setBusy(false); }
  };

  const restore = async (f: File) => {
    setBusy(true);
    try {
      const z = unzipSync(new Uint8Array(await f.arrayBuffer()));
      const docs = JSON.parse(strFromU8(z['docs.json'])) as Doc[];
      const media = JSON.parse(strFromU8(z['media.json'])) as MediaItem[];
      for (const m of media) {
        const bin = z[`media/${m.id}`];
        if (bin) await put('blobs', m.id, new Blob([bin], { type: m.mime }));
        await put('media', m.id, m);
      }
      for (const d of docs) await put('docs', d.id, d);
      if (z['brand.json']) useApp.getState().setBrand(JSON.parse(strFromU8(z['brand.json'])));
      if (z['posts.json']) await put('kv', 'posts', JSON.parse(strFromU8(z['posts.json'])));
      notify(T(`${docs.length} documents et ${media.length} médias restaurés. Recharge la page pour tout voir.`, `${docs.length} documents and ${media.length} media restored. Reload the page to see everything.`));
    } catch {
      notify(T('Ce fichier n’est pas une sauvegarde Montaj Studio valide.', 'This file is not a valid Montaj Studio backup.'), 'err');
    } finally { setBusy(false); }
  };

  const eraseAll = async () => {
    await clearAll();
    setWipe(false);
    notify(T('Toutes les données locales ont été effacées. Recharge la page.', 'All local data was erased. Reload the page.'));
  };

  return (
    <div className="page narrow screen-in">
      <PageHead color="#8E8E93" icon={<Cog size={19} />} title={T('Paramètres', 'Settings')} sub={T('Langue, apparence et données stockées sur cet appareil.', 'Language, appearance and data stored on this device.')} />
      <div className="card col" style={{ padding: 20, gap: 16 }}>
        <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Langue', 'Language')}</span><Chips value={lang} onChange={(v) => useApp.getState().setLang(v)} options={[{ id: 'fr' as const, label: 'Français' }, { id: 'en' as const, label: 'English' }]} /></div>
        <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Thème', 'Theme')}</span><Chips value={mode} onChange={(v: Mode) => useApp.getState().setMode(v)} options={[{ id: 'system' as const, label: T('Automatique', 'Automatic') }, { id: 'dark' as const, label: T('Sombre', 'Dark') }, { id: 'light' as const, label: T('Clair', 'Light') }]} /></div>
      </div>
      <div className="card col" style={{ padding: 20, gap: 14 }}>
        <span style={{ fontWeight: 600 }}>{T('Données locales', 'Local data')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '170px minmax(0,1fr)', gap: '8px 16px', fontSize: 12 }}>
          <span className="faint">{T('Espace utilisé', 'Space used')}</span><span>{store ? `${bytes(store.usage, lang)} / ${bytes(store.quota, lang)}` : '—'}</span>
          <span className="faint">{T('Stockage persistant', 'Persistent storage')}</span>
          <span className="row" style={{ gap: 8 }}>{!persistent ? T('Bloqué : les données ne durent que le temps de la session.', 'Blocked: data only lasts for this session.') : persisted ? T('Oui : le navigateur ne l’effacera pas de lui-même.', 'Yes: the browser will not evict it on its own.') : T('Non garanti', 'Not guaranteed')}
            {persistent && !persisted && <button className="btn sm" onClick={async () => setPersisted(await requestPersist())}>{T('Demander', 'Request')}</button>}</span>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn md" disabled={busy} onClick={() => void backup()}>{T('Télécharger une sauvegarde complète (.zip)', 'Download a full backup (.zip)')}</button>
          <label className="btn md" style={{ cursor: 'pointer' }}>{T('Restaurer une sauvegarde', 'Restore a backup')}<input type="file" accept=".zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void restore(f); }} /></label>
          <button className="btn md danger" onClick={() => setWipe(true)}>{T('Tout effacer', 'Erase everything')}</button>
        </div>
      </div>
      <div className="col" style={{ gap: 8, fontSize: 12 }}>
        <span className="eyebrow">{T('Bientôt', 'Coming soon')}</span>
        <span className="muted pretty">{T('Comptes, synchronisation entre appareils, espaces d’équipe, commentaires partagés, liens de partage et publication sur les réseaux demandent un serveur. Ils seront ajoutés sans rien changer à ce qui fonctionne en local.', 'Accounts, cross-device sync, team spaces, shared comments, share links and social publishing need a server. They will be added without changing what works locally.')}</span>
      </div>
      {wipe && (
        <Modal title={T('Effacer toutes les données ?', 'Erase all data?')} onClose={() => setWipe(false)} width={440}
          footer={<><button className="btn md" onClick={() => setWipe(false)}>{T('Annuler', 'Cancel')}</button><button className="btn md" style={{ background: 'var(--warn)', color: '#fff' }} onClick={() => void eraseAll()}>{T('Tout effacer', 'Erase everything')}</button></>}>
          <span className="pretty">{T('Documents, médias, versions, kit de marque et planning seront supprimés de cet appareil. Télécharge une sauvegarde avant si tu veux les garder.', 'Documents, media, versions, brand kit and planner will be deleted from this device. Download a backup first if you want to keep them.')}</span>
        </Modal>
      )}
    </div>
  );
}
