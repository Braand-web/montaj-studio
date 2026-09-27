import { useState } from 'react';
import { Scale, Info } from 'lucide-react';
import { useT } from '../store/app';
import { PageHead } from '../ui/kit';

export function Legal() {
  const T = useT();
  const [tab, setTab] = useState<'cgu' | 'privacy' | 'ai' | 'licenses'>('cgu');
  const S: Record<typeof tab, [string, string][]> = {
    cgu: [
      [T('Le service', 'The service'), T('Montaj Studio fournit des éditeurs vidéo et design dans le navigateur. La connexion Google sert à identifier ton compte, mais ne synchronise pas tes projets. L’assistant IA, les téléversements distants et les paiements ne sont pas activés actuellement.', 'Montaj Studio provides video and design editors in the browser. Google sign in identifies your account but does not sync your projects. The AI assistant, remote uploads and payments are not enabled at this time.')],
      [T('Ton contenu', 'Your content'), T('Tu restes propriétaire de ce que tu importes et crées. Tu garantis disposer des droits sur les médias importés et du consentement des personnes représentées.', 'You keep ownership of what you import and create. You confirm you hold the rights to imported media and the consent of the people shown.')],
      [T('Usage acceptable', 'Acceptable use'), T('N’utilise pas le service pour créer du contenu illégal, trompeur ou portant atteinte à autrui, ni pour usurper une identité.', 'Do not use the service to create illegal, misleading or harmful content, or to impersonate someone.')],
      [T('Disponibilité', 'Availability'), T('Les documents sont stockés dans ton navigateur. Fais des sauvegardes régulières depuis Paramètres › Données : effacer les données du site les supprime.', 'Documents are stored in your browser. Make regular backups from Settings › Data: clearing site data deletes them.')],
    ],
    privacy: [
      [T('Projets et médias', 'Projects and media'), T('Tes projets, médias, versions, kits de marque et plannings restent dans le stockage de ce navigateur. La connexion Google ne les synchronise pas et ne les envoie pas à Supabase.', 'Your projects, media, versions, brand kits and plans stay in this browser storage. Google sign in does not sync them or send them to Supabase.')],
      [T('Connexion Google', 'Google sign in'), T('Si tu choisis Google, Supabase Auth traite et conserve ton adresse e mail, ton identifiant Google et les champs de profil transmis pour gérer ton compte et ta session. La connexion demande uniquement l’identité, l’adresse e mail et le profil de base.', 'If you choose Google, Supabase Auth processes and stores your email address, Google account identifier and returned profile fields to manage your account and session. Sign in requests only identity, email and basic profile access.')],
      [T('Assistant IA', 'AI assistant'), T('L’assistant IA et le stockage distant de fichiers ne sont pas activés actuellement. Si ces fonctions sont activées, cette page sera mise à jour pour décrire les données transmises à leurs fournisseurs.', 'The AI assistant and remote file storage are not enabled at this time. If these features are enabled, this page will be updated to describe the data sent to their providers.')],
      [T('Conservation et demandes', 'Retention and requests'), T('Tu peux exporter ou effacer les projets locaux depuis Paramètres › Données. Pour demander la suppression de ton compte de connexion Google Montaj, écris à novacore629@gmail.com.', 'You can export or erase local projects from Settings › Data. To request deletion of your Montaj Google sign in account, contact novacore629@gmail.com.')],
    ],
    ai: [
      [T('Modèle', 'Model'), T('L’assistant utilise Claude via ton compte claude.ai. Chaque requête est décomptée de ton forfait ; le journal est visible dans Utilisation IA.', 'The assistant uses Claude through your claude.ai account. Each request counts against your plan; the log is in AI usage.')],
      [T('Contrôle', 'Control'), T('En mode Assist, rien n’est appliqué sans ton accord. En mode Agent, tu peux arrêter à tout moment et annuler toutes les modifications en une fois.', 'In Assist mode, nothing is applied without your approval. In Agent mode, you can stop at any time and undo all changes in one step.')],
      [T('Contenu généré', 'Generated content'), T('Vérifie les textes produits par l’IA avant publication, et signale-les comme générés par IA quand la plateforme de diffusion le demande.', 'Check AI-written text before publishing, and label it as AI-generated when the publishing platform requires it.')],
    ],
    licenses: [
      [T('Polices', 'Fonts'), 'Geist, Geist Mono, Anton, Archivo Black, Bebas Neue, Caveat, DM Serif Display, Montserrat, Playfair Display — SIL Open Font License 1.1.'],
      [T('Bibliothèques', 'Libraries'), 'React, Zustand, Lucide (ISC), fflate, jsPDF, qrcode-generator — MIT.'],
      [T('Modèles et formats', 'Templates and formats'), T('Les modèles fournis sont originaux et libres d’utilisation, y compris commerciale.', 'The bundled templates are original and free to use, including commercially.')],
    ],
  };
  const tabBtn = (on: boolean): React.CSSProperties => ({ height: 30, padding: '0 14px', borderRadius: 9, border: 0, background: on ? 'var(--panel)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.2)' : 'none', fontSize: 12, fontWeight: 500 });
  return (
    <div className="page screen-in" style={{ maxWidth: 820 }}>
      <PageHead color="#5E5CE6" icon={<Scale size={19} />} title={T('Documents légaux', 'Legal')} sub={T('Les règles du service, en clair.', 'The service rules, in plain words.')} />
      <div className="row wrap" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2, alignSelf: 'flex-start' }}>
        {([['cgu', T('Conditions', 'Terms')], ['privacy', T('Confidentialité', 'Privacy')], ['ai', T('IA et données', 'AI and data')], ['licenses', T('Licences', 'Licenses')]] as const).map(([k, l]) => <button key={k} style={tabBtn(tab === k)} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="card col" style={{ padding: 26, gap: 18 }}>
        <span className="faint" style={{ fontSize: 12 }}>{T('Dernière mise à jour : 24 septembre 2026', 'Last updated: September 24, 2026')}</span>
        {S[tab].map(([h, p]) => <div key={h} className="col" style={{ gap: 6 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{h}</span><p className="muted pretty" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, maxWidth: '65ch' }}>{p}</p></div>)}
        <div className="row" style={{ gap: 8, padding: '12px 14px', borderRadius: 12, background: 'var(--panel2)', fontSize: 12, color: 'var(--tx3)', alignItems: 'flex-start' }}><Info size={13} style={{ flex: 'none', marginTop: 1 }} /><span className="pretty">{T('Résumé en langage clair. Le texte définitif doit être validé par un juriste avant une ouverture à grande échelle.', 'Plain-language summary. The final text must be reviewed by a lawyer before a wide launch.')}</span></div>
      </div>
    </div>
  );
}
