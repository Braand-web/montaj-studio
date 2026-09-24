import { useEffect, useState } from 'react';
import { Settings as Cog, User, ShieldCheck, Bell, Database, Scale } from 'lucide-react';
import { useIdentity } from '../lib/identity';
import { useNotifs, NOTIF_KINDS, type NotifKind } from '../lib/notify';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { useApp, useT, type Mode } from '../store/app';
import { PageHead, Chips, Modal, Switch } from '../ui/kit';
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
  const [tab, setTab] = useState<'profile' | 'security' | 'notifs' | 'data'>('profile');
  const id = useIdentity();
  const userName = useApp((s) => s.userName);
  const nprefs = useNotifs((s) => s.prefs);
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
        'feedback.json': strToU8(JSON.stringify((await get('kv', 'feedback')) ?? [])),
        'chats.json': strToU8(JSON.stringify((await get('kv', 'chats')) ?? [])),
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
      for (const k of ['posts', 'feedback', 'chats']) if (z[`${k}.json`]) await put('kv', k, JSON.parse(strFromU8(z[`${k}.json`])));
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

  const tabBtn = (on: boolean): React.CSSProperties => ({ height: 30, padding: '0 14px', borderRadius: 9, border: 0, background: on ? 'var(--panel)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.2)' : 'none', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 });
  const kindL: Record<NotifKind, [string, string]> = {
    export: [T('Exports terminés', 'Finished exports'), T('Quand une image, un PDF ou une vidéo est prêt', 'When an image, PDF or video is ready')],
    assistant: [T('Assistant', 'Assistant'), T('Quand une proposition est prête ou des modifications appliquées', 'When a proposal is ready or changes are applied')],
    chat: ['Studio Chat', T('Quand Studio Chat crée un document', 'When Studio Chat creates a document')],
    trash: [T('Corbeille', 'Trash'), T('Avant la suppression définitive d’un document', 'Before a document is deleted forever')],
    version: [T('Versions', 'Versions'), T('Quand une version est restaurée', 'When a version is restored')],
    feedback: [T('Idées & bugs', 'Ideas & bugs'), T('Quand une suggestion suivie change de statut', 'When a followed suggestion changes status')],
    system: [T('Système', 'System'), T('Générations en masse et autres événements', 'Bulk generation and other events')],
  };
  return (
    <div className="page narrow screen-in">
      <PageHead color="#8E8E93" icon={<Cog size={19} />} title={T('Paramètres', 'Settings')} sub={T('Ton profil, ta sécurité, tes notifications et tes données.', 'Your profile, security, notifications and data.')} />
      <div className="row wrap" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2, alignSelf: 'flex-start' }}>
        {([['profile', User, T('Profil', 'Profile')], ['security', ShieldCheck, T('Sécurité', 'Security')], ['notifs', Bell, 'Notifications'], ['data', Database, T('Données', 'Data')]] as const).map(([k, I, l]) => <button key={k} style={tabBtn(tab === k)} onClick={() => setTab(k)}><I size={13} />{l}</button>)}
      </div>
      {tab === 'profile' && (
        <div className="card col" style={{ padding: 22, gap: 16 }}>
          <div className="row" style={{ gap: 14 }}>
            {id.avatarUrl ? <img src={id.avatarUrl} alt="" width={60} height={60} style={{ borderRadius: 30 }} /> : <span style={{ width: 60, height: 60, borderRadius: 30, background: 'linear-gradient(145deg,#0A84FF,#BF5AF2)', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(userName || id.name || '?').charAt(0).toUpperCase()}</span>}
            <div className="col" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>{userName || id.name || T('Sans nom', 'No name')}</span><span className="faint" style={{ fontSize: 12 }}>{id.status === 'claude' ? T('Connecté avec ton compte Claude', 'Signed in with your Claude account') : T('Mode local, sans compte', 'Local mode, no account')}</span></div>
          </div>
          <label className="field" style={{ maxWidth: 360 }}><span>{T('Nom affiché dans l’application', 'Name shown in the app')}</span><input id="st-name" className="input lg" value={userName} placeholder={id.name} onChange={(e) => useApp.getState().set({ userName: e.target.value })} /></label>
          <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Langue', 'Language')}</span><Chips value={lang} onChange={(v) => useApp.getState().setLang(v)} options={[{ id: 'fr' as const, label: 'Français' }, { id: 'en' as const, label: 'English' }]} /></div>
          <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Thème', 'Theme')}</span><Chips value={mode} onChange={(v: Mode) => useApp.getState().setMode(v)} options={[{ id: 'system' as const, label: T('Automatique', 'Automatic') }, { id: 'dark' as const, label: T('Sombre', 'Dark') }, { id: 'light' as const, label: T('Clair', 'Light') }]} /></div>
        </div>
      )}
      {tab === 'security' && (
        <div className="card col" style={{ padding: 22, gap: 14 }}>
          <span style={{ fontWeight: 600 }}>{T('Compte et connexion', 'Account and sign-in')}</span>
          <span className="muted pretty" style={{ fontSize: 13 }}>{T('Il n’y a pas de mot de passe Montaj : quand l’app est ouverte dans claude.ai, c’est ton compte Claude qui t’identifie. Mot de passe, double authentification et appareils connectés se gèrent dans les réglages de ton compte claude.ai.', 'There is no Montaj password: when the app is open in claude.ai, your Claude account identifies you. Password, two-factor authentication and signed-in devices are managed in your claude.ai account settings.')}</span>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <span style={{ fontWeight: 600 }}>{T('Où sont tes données', 'Where your data lives')}</span>
          <span className="muted pretty" style={{ fontSize: 13 }}>{T('Tout est stocké dans ce navigateur, sur cet appareil. Toute personne ayant accès à ce navigateur y a accès : sur un ordinateur partagé, efface tes données avant de partir (onglet Données).', 'Everything is stored in this browser, on this device. Anyone with access to this browser can see it: on a shared computer, erase your data before leaving (Data tab).')}</span>
          <div className="row"><button className="btn" onClick={() => useApp.getState().go('legal')}>{T('Confidentialité et conditions', 'Privacy and terms')}</button></div>
        </div>
      )}
      {tab === 'notifs' && (
        <div className="card" style={{ padding: '8px 22px' }}>
          {NOTIF_KINDS.map((k) => (
            <div key={k} className="row" style={{ gap: 12, padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="col grow" style={{ gap: 2 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{kindL[k][0]}</span><span className="faint" style={{ fontSize: 12 }}>{kindL[k][1]}</span></div>
              <Switch on={nprefs[k]} onChange={(v) => useNotifs.getState().setPref(k, v)} label={kindL[k][0]} />
            </div>
          ))}
          <div className="faint" style={{ fontSize: 11, padding: '10px 0' }}>{T('Notifications dans l’application uniquement. Les e-mails arriveront avec les comptes.', 'In-app notifications only. Emails will come with accounts.')}</div>
        </div>
      )}
      {tab === 'data' && (
        <>
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
        </div>
      </div>
      <div className="card row wrap" style={{ padding: 20, gap: 14 }}>
        <Scale size={20} color="var(--tx2)" />
        <div className="col grow" style={{ minWidth: 220, gap: 2 }}><span style={{ fontWeight: 600 }}>{T('Documents légaux', 'Legal documents')}</span><span className="faint" style={{ fontSize: 12 }}>{T('Conditions, confidentialité, IA et données, licences', 'Terms, privacy, AI and data, licenses')}</span></div>
        <button className="btn lg" style={{ borderRadius: 999 }} onClick={() => useApp.getState().go('legal')}>{T('Consulter', 'View')}</button>
      </div>
      <div className="col" style={{ borderRadius: 18, padding: 20, border: '1px solid color-mix(in oklab, #FF453A 40%, var(--line))', background: 'color-mix(in oklab, #FF453A 8%, var(--panel))', gap: 10 }}>
        <span style={{ fontWeight: 600, color: '#FF453A' }}>{T('Effacer toutes mes données', 'Erase all my data')}</span>
        <span className="muted pretty" style={{ fontSize: 12 }}>{T('Supprime définitivement de cet appareil tes documents, médias, versions, kit de marque, planning, discussions et suggestions.', 'Permanently deletes your documents, media, versions, brand kit, planner, chats and suggestions from this device.')}</span>
        <button className="btn lg" style={{ alignSelf: 'flex-start', borderRadius: 999, background: '#FF453A', color: '#fff' }} onClick={() => setWipe(true)}>{T('Tout effacer', 'Erase everything')}</button>
      </div>
        </>
      )}
      {wipe && (
        <Modal title={T('Effacer toutes les données ?', 'Erase all data?')} onClose={() => setWipe(false)} width={440}
          footer={<><button className="btn md" onClick={() => setWipe(false)}>{T('Annuler', 'Cancel')}</button><button className="btn md" style={{ background: 'var(--warn)', color: '#fff' }} onClick={() => void eraseAll()}>{T('Tout effacer', 'Erase everything')}</button></>}>
          <span className="pretty">{T('Documents, médias, versions, kit de marque et planning seront supprimés de cet appareil. Télécharge une sauvegarde avant si tu veux les garder.', 'Documents, media, versions, brand kit and planner will be deleted from this device. Download a backup first if you want to keep them.')}</span>
        </Modal>
      )}
    </div>
  );
}
