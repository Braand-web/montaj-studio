import { useState } from 'react';
import { Scale, Info } from 'lucide-react';
import { useT } from '../store/app';
import { PageHead } from '../ui/kit';

export function Legal() {
  const T = useT();
  const [tab, setTab] = useState<'cgu' | 'privacy' | 'ai' | 'licenses'>('cgu');
  const S: Record<typeof tab, [string, string][]> = {
    cgu: [
      [T('Le service', 'The service'), T('Montaj Studio fournit un éditeur vidéo, un éditeur de design et un assistant IA dans le navigateur. Le service est gratuit, sans abonnement ni filigrane.', 'Montaj Studio provides a video editor, a design editor and an AI assistant in the browser. The service is free, with no subscription or watermark.')],
      [T('Ton contenu', 'Your content'), T('Tu restes propriétaire de ce que tu importes et crées. Tu garantis disposer des droits sur les médias importés et du consentement des personnes représentées.', 'You keep ownership of what you import and create. You confirm you hold the rights to imported media and the consent of the people shown.')],
      [T('Usage acceptable', 'Acceptable use'), T('Pas de contenu illégal, trompeur ou portant atteinte à autrui, ni d’usurpation d’identité. Les demandes à l’assistant restent soumises aux conditions d’utilisation de Claude.', 'No illegal, misleading or harmful content, and no impersonation. Requests to the assistant remain subject to Claude’s usage policies.')],
      [T('Disponibilité', 'Availability'), T('Les documents sont stockés dans ton navigateur. Fais des sauvegardes régulières depuis Paramètres › Données : effacer les données du site les supprime.', 'Documents are stored in your browser. Make regular backups from Settings › Data: clearing site data deletes them.')],
    ],
    privacy: [
      [T('Ce qui reste sur ton appareil', 'What stays on your device'), T('Tes médias, tes documents, tes versions, ton kit de marque, ton planning et tes suggestions sont enregistrés dans le stockage local de ton navigateur (IndexedDB). Rien n’est envoyé à un serveur Montaj.', 'Your media, documents, versions, brand kit, planner and suggestions are saved in your browser’s local storage (IndexedDB). Nothing is sent to a Montaj server.')],
      [T('Ce qui est envoyé à Claude', 'What is sent to Claude'), T('Quand tu utilises l’assistant ou Studio Chat : ta demande, une description textuelle du document (textes, couleurs, positions, noms de clips) et ton kit de marque. Jamais tes fichiers.', 'When you use the assistant or Studio Chat: your request, a text description of the document (texts, colors, positions, clip names) and your brand kit. Never your files.')],
      [T('Identité', 'Identity'), T('Dans claude.ai, l’application affiche ton nom et ton avatar fournis par la plateforme. Ils ne sont pas enregistrés par l’application.', 'In claude.ai, the app shows your name and avatar provided by the platform. The app does not store them.')],
      [T('Tes droits', 'Your rights'), T('Exporte ou efface toutes tes données à tout moment depuis Paramètres › Données.', 'Export or erase all your data anytime from Settings › Data.')],
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
