import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { addVersion, listVersions } from '../lib/docs';
import { notify as pushNotif } from '../lib/notify';
import type { DesignData, Doc, Version, VideoData } from '../model/types';

// Version history (SPEC §6.10): manual versions, automatic versions after assistant runs,
// and the current state is always kept before a restore.

export function VersionsPanel({ doc, onRestore, onClose }: { doc: Doc; onRestore(data: DesignData | VideoData): void; onClose(): void }) {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const notify = useApp((s) => s.notify);
  const [items, setItems] = useState<Version[]>([]);
  const load = () => { void listVersions(doc.id).then(setItems); };
  useEffect(load, [doc.id]);
  const origin = (o: Version['origin']) => ({ user: T('Utilisateur', 'User'), agent: T('Assistant', 'Assistant'), autosave: 'Autosave', restore: T('Avant restauration', 'Before restore') })[o];
  const color = (o: Version['origin']) => (o === 'agent' ? ['var(--accSoft)', 'var(--accTx)'] : o === 'restore' ? ['color-mix(in oklab, var(--warn) 16%, transparent)', 'var(--warn)'] : ['var(--panel2)', 'var(--tx2)']);
  const fmt = (t: number) => new Date(t).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ position: 'absolute', top: 48, right: 0, bottom: 0, width: 340, maxWidth: '100%', zIndex: 45, background: 'var(--panel)', borderLeft: '1px solid var(--line2)', boxShadow: '-12px 0 32px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column' }}>
      <div className="row" style={{ justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontWeight: 600 }}>{T('Historique des versions', 'Version history')}</span>
        <button className="btn bare icon" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
      </div>
      <div className="col" style={{ padding: '12px 14px', gap: 6, borderBottom: '1px solid var(--line)' }}>
        <button className="btn" onClick={async () => { await addVersion(doc, 'user', T('Version manuelle', 'Manual version')); load(); notify(T('Version créée.', 'Version created.')); }}>{T('Créer une version maintenant', 'Create a version now')}</button>
        <span className="faint pretty" style={{ fontSize: 11 }}>{T('Une version est aussi créée automatiquement toutes les 5 minutes d’édition et après chaque action de l’assistant.', 'A version is also created automatically every 5 minutes of editing and after each assistant action.')}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {items.length === 0 && <div className="faint" style={{ padding: 12, fontSize: 12 }}>{T('Aucune version pour l’instant.', 'No versions yet.')}</div>}
        {items.map((v) => (
          <div key={v.id} className="row" style={{ gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--line)' }}>
            <div className="grow col" style={{ gap: 3 }}>
              <span className="ell" style={{ fontSize: 12, fontWeight: 500 }}>{v.label}</span>
              <span className="row faint" style={{ gap: 6, fontSize: 11 }}><span className="mono">{fmt(v.at)}</span><span style={{ padding: '1px 6px', borderRadius: 4, background: color(v.origin)[0], color: color(v.origin)[1] }}>{origin(v.origin)}</span></span>
            </div>
            <button className="btn sm" onClick={async () => {
              await addVersion(doc, 'restore', T('Avant restauration', 'Before restore'));
              onRestore(JSON.parse(JSON.stringify(v.data)));
              load();
              pushNotif({ kind: 'version', text: T(`Version restaurée : ${doc.name}`, `Version restored: ${doc.name}`) });
              notify(T('Version restaurée. L’état précédent a été gardé dans l’historique.', 'Version restored. The previous state was kept in history.'));
            }}>{T('Restaurer', 'Restore')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
