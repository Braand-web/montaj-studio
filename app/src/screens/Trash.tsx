import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead, Modal } from '../ui/kit';
import { useDocs } from '../ui/Shell';
import { purgeDoc, restoreDoc } from '../lib/docs';

export function Trash() {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const items = useDocs().filter((d) => d.trashedAt);
  const [purge, setPurge] = useState<string | null>(null);
  const left = (t: number) => Math.max(0, 30 - Math.floor((Date.now() - t) / 86400_000));
  return (
    <div className="page narrow screen-in">
      <PageHead color="#FF453A" icon={<Trash2 size={19} />} title={T('Corbeille', 'Trash')} sub={T('Les documents supprimés restent restaurables pendant 30 jours.', 'Deleted documents can be restored for 30 days.')} />
      {items.length === 0 && <div className="faint" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 16 }}>{T('La corbeille est vide.', 'Trash is empty.')}</div>}
      {items.length > 0 && (
        <div className="card">
          {items.map((d) => (
            <div key={d.id} className="row wrap" style={{ gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div className={d.thumb ? '' : 'stripes'} style={{ width: 72, aspectRatio: '16/10', borderRadius: 10, border: '1px solid var(--line)', background: d.thumb ? `url(${d.thumb}) center/contain no-repeat, var(--panel2)` : undefined, flex: 'none' }} />
              <div className="col grow" style={{ minWidth: 160, gap: 2 }}><span style={{ fontWeight: 500 }}>{d.name}</span><span className="faint" style={{ fontSize: 12 }}>{d.kind === 'video' ? T('Vidéo', 'Video') : 'Design'} · {left(d.trashedAt!)} {T('jours restants', 'days left')}</span></div>
              <button className="btn" onClick={async () => { await restoreDoc(d.id); notify(T('Document restauré.', 'Document restored.')); }}>{T('Restaurer', 'Restore')}</button>
              <button className="btn danger" onClick={() => setPurge(d.id)}>{T('Supprimer définitivement', 'Delete forever')}</button>
            </div>
          ))}
        </div>
      )}
      {purge && (
        <Modal title={T('Supprimer définitivement ?', 'Delete forever?')} onClose={() => setPurge(null)} width={420}
          footer={<><button className="btn md" onClick={() => setPurge(null)}>{T('Annuler', 'Cancel')}</button><button className="btn md" style={{ background: 'var(--warn)', color: '#fff' }} onClick={async () => { await purgeDoc(purge); setPurge(null); notify(T('Supprimé définitivement.', 'Deleted forever.')); }}>{T('Supprimer', 'Delete')}</button></>}>
          <span>{T('Le document et ses versions seront effacés de cet appareil. Les médias restent dans la médiathèque.', 'The document and its versions will be erased from this device. Media stays in the library.')}</span>
        </Modal>
      )}
    </div>
  );
}
