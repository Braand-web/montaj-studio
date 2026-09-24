import { useState } from 'react';
import { Users, Link2, Copy } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead, Switch } from '../ui/kit';
import { useIdentity } from '../lib/identity';

// Team space. Real multi-user work (members, roles, shared kits, approvals, co-editing)
// needs accounts on a server; until then the page says so and shows what works today.

export function Team() {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const brand = useApp((s) => s.brand);
  const id = useIdentity();
  const [email, setEmail] = useState('');
  const roles = [T('Propriétaire', 'Owner'), T('Éditeur', 'Editor'), T('Commentateur', 'Commenter'), T('Lecteur', 'Viewer')];
  const name = id.name || T('Toi', 'You');
  return (
    <div className="page narrow screen-in" style={{ maxWidth: 1000, gap: 22 }}>
      <PageHead color="#5E5CE6" icon={<Users size={19} />} title={T('Équipe', 'Team')} sub={T('Membres, rôles, ressources partagées et validations. Chaque espace sera isolé des autres comptes.', 'Members, roles, shared resources and approvals. Each space will be isolated from other accounts.')} />
      <div className="pretty" style={{ fontSize: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--panel2)', color: 'var(--tx2)' }}>
        <b>{T('Espaces d’équipe : bientôt.', 'Team spaces: coming soon.')}</b> {T('Inviter des membres, partager des documents et co-éditer demandent des comptes synchronisés sur un serveur. Aujourd’hui, tes documents restent sur cet appareil.', 'Inviting members, sharing documents and co-editing need synced accounts on a server. Today, your documents stay on this device.')}
      </div>
      <div className="card">
        <div className="row wrap" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 8 }}>
          <span className="eyebrow" style={{ marginRight: 'auto' }}>{T('Membres', 'Members')}</span>
          <input id="team-invite" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T('e-mail à inviter', 'email to invite')} style={{ width: 240 }} />
          <button className="btn primary md" disabled title={T('Disponible avec les comptes', 'Available with accounts')}>{T('Inviter', 'Invite')}</button>
        </div>
        <div className="row wrap" style={{ gap: 12, padding: '10px 16px' }}>
          {id.avatarUrl ? <img src={id.avatarUrl} alt="" width={30} height={30} style={{ borderRadius: 15 }} /> : <div style={{ width: 30, height: 30, borderRadius: 15, background: 'var(--panel2)', border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>{name.charAt(0).toUpperCase()}</div>}
          <div className="col grow" style={{ minWidth: 160 }}><span style={{ fontWeight: 500 }}>{name}</span><span className="faint" style={{ fontSize: 12 }}>{id.status === 'claude' ? T('Compte Claude', 'Claude account') : T('Mode local', 'Local mode')}</span></div>
          <div className="row wrap" style={{ gap: 4 }}>{roles.map((r, i) => <span key={r} className={'chip' + (i === 0 ? ' on' : '')} style={{ opacity: i === 0 ? 1 : 0.45 }}>{r}</span>)}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <div className="card col" style={{ padding: '14px 16px', gap: 10 }}>
          <span className="eyebrow">{T('Ressources partagées', 'Shared resources')}</span>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}><div className="col"><span style={{ fontWeight: 500 }}>{T('Kit', 'Kit')} {brand.name}</span><span className="faint" style={{ fontSize: 12 }}>{T('Couleurs et polices imposées aux membres', 'Colors and fonts enforced for members')}</span></div><Switch on={false} onChange={() => notify(T('Le verrouillage du kit arrive avec les espaces d’équipe.', 'Kit locking comes with team spaces.'), 'info')} /></div>
          {[T('Modèles d’équipe', 'Team templates'), T('Dossiers partagés', 'Shared folders'), T('Co-édition en temps réel', 'Real-time co-editing'), T('Validations de designs', 'Design approvals')].map((x) => (
            <div key={x} className="row" style={{ justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: '1px solid var(--line)' }}><span>{x}</span><span className="tag">{T('Bientôt', 'Soon')}</span></div>
          ))}
        </div>
        <div className="card col" style={{ padding: '14px 16px', gap: 10 }}>
          <span className="eyebrow">{T('Dès aujourd’hui', 'Available today')}</span>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}><Link2 size={15} color="var(--accTx)" style={{ flex: 'none', marginTop: 2 }} /><span className="muted pretty" style={{ fontSize: 12 }}>{T('Partage l’application avec le menu Partager de claude.ai : chaque personne l’utilise avec son propre compte et ses propres documents.', 'Share the app with the claude.ai Share menu: each person uses it with their own account and their own documents.')}</span></div>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}><Copy size={15} color="var(--accTx)" style={{ flex: 'none', marginTop: 2 }} /><span className="muted pretty" style={{ fontSize: 12 }}>{T('Pour passer un projet à quelqu’un : Paramètres › Données › Télécharger une sauvegarde, puis Restaurer sur son appareil.', 'To hand a project to someone: Settings › Data › Download a backup, then Restore on their device.')}</span></div>
        </div>
      </div>
    </div>
  );
}
