import { CreditCard, Check, Sparkle, Sparkles, KeyRound } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead } from '../ui/kit';
import { useUsage } from '../lib/usage';

// Plan and credits. Montaj Studio is free today: AI runs on the viewer's Claude plan.
// Paid credits and the Pro Keys plan need a payment provider and a server: shown as coming soon.

export function Credits() {
  const T = useT();
  const go = useApp((s) => s.go);
  const rows = useUsage((s) => s.rows);
  const plans = [
    { id: 'free', c: '#30D158', icon: Sparkle, name: T('Gratuit', 'Free'), price: '0 €', per: T('pour toujours', 'forever'), desc: T('Tout ce qui existe aujourd’hui.', 'Everything available today.'), feats: [T('Éditeurs design et vidéo complets', 'Full design and video editors'), T('Assistant et Studio Chat avec ton compte Claude', 'Assistant and Studio Chat with your Claude account'), T('Exports sans filigrane (PNG, PDF, MP4)', 'Watermark-free exports (PNG, PDF, MP4)'), T('Aucune limite de projets ni de pages', 'No limit on projects or pages')], current: true },
    { id: 'credits', c: '#FF9F0A', icon: Sparkles, name: T('Crédits', 'Credits'), price: T('dès 5 €', 'from €5'), per: T('à l’usage', 'pay as you go'), desc: T('Générations d’images, de vidéos et de voix sans clé.', 'Image, video and voice generation with no key.'), feats: [T('gpt-image, Seedance, Kling, ElevenLabs…', 'gpt-image, Seedance, Kling, ElevenLabs…'), T('Coût affiché avant chaque génération', 'Cost shown before every generation'), T('Mobile Money, carte, PayPal', 'Mobile Money, card, PayPal')] },
    { id: 'byok', c: '#0A84FF', icon: KeyRound, name: 'Pro Clés', price: '4,99 €', per: T('/ mois', '/ month'), desc: T('Branche tes propres clés, sans marge.', 'Plug in your own keys, no markup.'), feats: [T('OpenAI, fal.ai, Runway, ElevenLabs, API personnalisées', 'OpenAI, fal.ai, Runway, ElevenLabs, custom APIs'), T('Facturé directement par tes fournisseurs', 'Billed directly by your providers'), T('Clés chiffrées côté serveur', 'Keys encrypted server-side')] },
  ];
  return (
    <div className="page screen-in" style={{ maxWidth: 1100 }}>
      <PageHead color="#30D158" icon={<CreditCard size={19} />} title={T('Abonnement et crédits', 'Plan and credits')} sub={T('Montaj Studio est gratuit. L’IA utilise ton compte Claude : rien à acheter ici.', 'Montaj Studio is free. AI uses your Claude account: nothing to buy here.')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        <div className="card col" style={{ padding: 20, gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>{T('Formule actuelle', 'Current plan')}</span>
          <div className="row" style={{ gap: 10 }}><span style={{ fontSize: 22, fontWeight: 700 }}>{T('Gratuit', 'Free')}</span><span className="pill ok">{T('Sans abonnement', 'No subscription')}</span></div>
          <span className="muted pretty" style={{ fontSize: 12 }}>{T('Aucun paiement, aucun crédit interne, aucun filigrane.', 'No payment, no internal credits, no watermark.')}</span>
        </div>
        <div className="card col" style={{ padding: 20, gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>{T('Pour générer, j’utilise', 'To generate, I use')}</span>
          <div className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 14, border: '1px solid var(--acc)', background: 'var(--accSoft)' }}>
            <Sparkles size={16} color="#D97757" /><span className="col grow"><span style={{ fontWeight: 600 }}>{T('Mon compte Claude', 'My Claude account')}</span><span className="faint" style={{ fontSize: 11 }}>{T('Assistant, Studio Chat, rédaction, traduction', 'Assistant, Studio Chat, writing, translation')}</span></span><Check size={15} color="var(--accTx)" />
          </div>
          <div className="row" style={{ gap: 10, padding: '10px 12px', borderRadius: 14, border: '1px solid var(--line2)', opacity: 0.6 }}>
            <KeyRound size={16} /><span className="col grow"><span style={{ fontWeight: 600 }}>{T('Mes propres clés', 'My own keys')}</span><span className="faint" style={{ fontSize: 11 }}>{T('Bientôt, avec Pro Clés', 'Soon, with Pro Keys')}</span></span>
          </div>
        </div>
        <div className="card col" style={{ padding: 20, gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>{T('Requêtes IA', 'AI requests')}</span>
          <span className="tnum" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.03em' }}>{rows.length}</span>
          <span className="muted" style={{ fontSize: 12 }}>{T('depuis cet appareil, 0 € facturé par Montaj', 'from this device, €0 billed by Montaj')}</span>
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => go('usage')}>{T('Voir le détail', 'See details')}</button>
        </div>
      </div>
      <span className="h2">{T('Formules', 'Plans')}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {plans.map((p) => (
          <div key={p.id} className="col" style={{ borderRadius: 22, background: `color-mix(in oklab, ${p.c} 12%, var(--panel))`, padding: 20, gap: 12, border: `1px solid ${p.current ? p.c : 'transparent'}` }}>
            <span style={{ width: 36, height: 36, borderRadius: 18, background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p.icon size={17} color="#111113" /></span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }}>{p.price}</span><span className="muted" style={{ fontSize: 12 }}>{p.per}</span></div>
            <span className="muted pretty" style={{ fontSize: 12 }}>{p.desc}</span>
            <div className="col" style={{ gap: 7 }}>
              {p.feats.map((f) => <span key={f} className="row" style={{ gap: 8, fontSize: 13, alignItems: 'flex-start' }}><span style={{ width: 18, height: 18, borderRadius: 9, background: p.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}><Check size={11} color="#111113" /></span>{f}</span>)}
            </div>
            <button disabled style={{ marginTop: 'auto', height: 38, borderRadius: 999, border: 0, background: 'var(--panel2)', color: 'var(--tx2)', fontWeight: 600, opacity: 1 }}>{p.current ? T('Formule actuelle', 'Current plan') : T('Bientôt', 'Coming soon')}</button>
          </div>
        ))}
      </div>
      <span className="faint pretty" style={{ fontSize: 12 }}>{T('Les formules payantes demandent un prestataire de paiement et une passerelle serveur. Elles ne seront activées qu’une fois ces services en place ; aucun paiement n’est possible aujourd’hui.', 'Paid plans need a payment provider and a server gateway. They will only be turned on once those services exist; no payment is possible today.')}</span>
    </div>
  );
}
