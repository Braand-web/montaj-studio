import { useEffect, useState } from 'react';
import { CreditCard, Check, Sparkle, Sparkles, Crown, Users, Loader2, ExternalLink, Smartphone } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead } from '../ui/kit';
import { useUsage } from '../lib/usage';
import { backend, type BackendInfo } from '../lib/attach/backend';
import { useWallet, startCheckout, openPortal, takeCheckoutReturn } from '../lib/wallet';
import { PLANS, PACKS, TYPICAL, PACK_VALIDITY_DAYS, COMPARE, planOf, xofOf, type PlanId } from '../lib/pricing';

// Plans and credits. Hosted version: a credit wallet on the Montaj server (Stripe Checkout),
// metered on the real tokens of each AI call. Inside claude.ai: AI runs on the viewer's own
// Claude plan, nothing is billed here, and the web plans are shown for reference.

const COLOR: Record<PlanId, string> = { free: '#30D158', creator: '#FF9F0A', pro: '#0A84FF', team: '#BF5AF2' };
const ICON = { free: Sparkle, creator: Sparkles, pro: Crown, team: Users };
const eur = (n: number, fr: boolean) => n.toLocaleString(fr ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 });
const xof = (n: number) => n.toLocaleString('fr-FR') + ' FCFA';
const r50 = (n: number) => Math.round(n / 50) * 50;
const KIND: Record<string, [string, string]> = { ai: ['IA', 'AI'], grant: ['Crédits offerts', 'Free credits'], refill: ['Recharge mensuelle', 'Monthly refill'], purchase: ['Pack acheté', 'Pack bought'], plan: ['Formule', 'Plan'], scrape: ['Analyse de lien', 'Link analysis'], transcribe: ['Transcription', 'Transcription'], expire: ['Expiration', 'Expired'], byok: ['IA avec ta clé', 'AI with your key'] };

export function Credits() {
  const T = useT();
  const fr = useApp((s) => s.lang) === 'fr';
  const go = useApp((s) => s.go);
  const notify = useApp((s) => s.notify);
  const rows = useUsage((s) => s.rows);
  const { enabled, info, error, load } = useWallet();
  const [be, setBe] = useState<BackendInfo | null>(null);
  const [yearly, setYearly] = useState(false);
  const [seats, setSeats] = useState(3);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void backend().then(setBe);
    void load();
    // Back from Stripe Checkout: #/credits?checkout=success|cancel
    const c = takeCheckoutReturn() ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('checkout');
    if (c === 'success') notify(T('Paiement reçu. Tes crédits arrivent dans quelques secondes.', 'Payment received. Your credits arrive in a few seconds.'));
    if (c === 'cancel') notify(T('Paiement annulé.', 'Payment cancelled.'), 'info');
    // The webhook may land a few seconds after the redirect: refresh the balance once more.
    if (c === 'success') { const t = setTimeout(() => void load(), 4000); return () => clearTimeout(t); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hosted = !!be?.ok;
  const pay = be?.payments;
  const cur = info ? planOf(info.plan) : null;

  async function buy(item: string, opts: { interval?: 'month' | 'year'; seats?: number } = {}) {
    setBusy(item);
    try { const { url } = await startCheckout(item, opts); location.href = url; }
    catch (e) { notify((e as Error).message, 'err'); setBusy(null); }
  }
  async function manage() {
    setBusy('portal');
    try { const { url } = await openPortal(); location.href = url; }
    catch (e) { notify((e as Error).message, 'err'); setBusy(null); }
  }

  const sub = !hosted
    ? T('Ici, dans claude.ai, l’IA utilise ton propre compte Claude : rien n’est facturé par Montaj. Les formules ci-dessous concernent la version web.', 'Here in claude.ai, AI uses your own Claude account: Montaj bills nothing. The plans below apply to the web version.')
    : enabled
      ? T('1 crédit = 0,01 €. Chaque requête IA consomme selon sa taille réelle ; l’édition reste illimitée.', '1 credit = €0.01. Each AI request uses credits based on its real size; editing stays unlimited.')
      : T('La facturation n’est pas activée sur ce serveur : l’IA est offerte par son propriétaire.', 'Billing is not enabled on this server: AI is provided by its owner.');

  return (
    <div className="page screen-in" style={{ maxWidth: 1100 }}>
      <PageHead color="#30D158" icon={<CreditCard size={19} />} title={T('Abonnement et crédits', 'Plan and credits')} sub={sub} />

      {hosted && enabled && (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <div className="card col" style={{ padding: 20, gap: 10 }}>
            <span className="faint" style={{ fontSize: 12 }}>{T('Formule actuelle', 'Current plan')}</span>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{cur ? (fr ? cur.fr : cur.en) : '…'}</span>
              {info && info.seats > 1 && <span className="pill">{info.seats} {T('sièges', 'seats')}</span>}
            </div>
            {info && <span className="muted" style={{ fontSize: 12 }}>{T('Renouvellement des crédits le ', 'Credits renew on ')}{new Date(info.periodEnds).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</span>}
            {info?.hasSubscription && <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy === 'portal'} onClick={manage}>{busy === 'portal' ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />}{T('Gérer l’abonnement', 'Manage subscription')}</button>}
          </div>
          <div className="card col" style={{ padding: 20, gap: 8 }}>
            <span className="faint" style={{ fontSize: 12 }}>{T('Crédits disponibles', 'Available credits')}</span>
            <span className="tnum" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.03em' }} data-testid="balance">{info ? info.credits.total.toLocaleString(fr ? 'fr-FR' : 'en-GB') : '…'}</span>
            {info && (
              <>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--panel2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (info.credits.sub / Math.max(1, info.credits.monthly)) * 100)}%`, background: COLOR[info.plan] }} />
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  {info.credits.sub} / {info.credits.monthly} {T('du mois', 'monthly')}
                  {info.credits.pack > 0 && <> · {info.credits.pack} {T('en packs', 'in packs')}{info.packExpires ? ` (${T('jusqu’au', 'until')} ${new Date(info.packExpires).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')})` : ''}</>}
                </span>
              </>
            )}
            {error && <span className="pill warn" style={{ alignSelf: 'flex-start' }}>{error}</span>}
          </div>
          <div className="card col" style={{ padding: 20, gap: 10 }}>
            <span className="faint" style={{ fontSize: 12 }}>{T('Requêtes IA aujourd’hui', 'AI requests today')}</span>
            <span className="tnum" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-.03em' }}>{info ? `${info.today.requests} / ${info.today.cap}` : '…'}</span>
            <span className="muted pretty" style={{ fontSize: 12 }}>{T('Limite journalière de ta formule, pour éviter les abus.', 'Daily limit of your plan, to prevent abuse.')}</span>
          </div>
        </div>
      )}

      {!hosted && (
        <div className="card col" style={{ padding: 20, gap: 8 }}>
          <div className="row" style={{ gap: 10 }}><Sparkles size={16} color="#D97757" /><span style={{ fontWeight: 600 }}>{T('Ton compte Claude alimente l’IA', 'Your Claude account powers the AI')}</span><span className="pill ok">{T('0 € facturé par Montaj', '€0 billed by Montaj')}</span></div>
          <span className="muted" style={{ fontSize: 12 }}>{rows.length} {T('requêtes IA depuis cet appareil.', 'AI requests from this device.')} <button className="link" onClick={() => go('usage')}>{T('Voir le détail', 'See details')}</button></span>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span className="h2">{T('Formules', 'Plans')}</span>
        <div className="seg" role="tablist">
          <button className={!yearly ? 'on' : ''} onClick={() => setYearly(false)}>{T('Mensuel', 'Monthly')}</button>
          <button className={yearly ? 'on' : ''} onClick={() => setYearly(true)}>{T('Annuel', 'Yearly')} <span className="pill ok" style={{ marginLeft: 4 }}>−17 %</span></button>
        </div>
      </div>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {PLANS.map((p) => {
          const c = COLOR[p.id]; const Icon = ICON[p.id];
          const isCur = info?.plan === p.id;
          const price = yearly ? p.eurYear / 12 : p.eurMonth;
          const n = p.perSeat ? seats : 1;
          const ready = p.id !== 'free' && !!pay?.stripe && !!pay.plans[p.id]?.[yearly ? 'year' : 'month'];
          let label = T('Choisir', 'Choose');
          if (isCur) label = T('Formule actuelle', 'Current plan');
          else if (p.id === 'free') label = T('Inclus', 'Included');
          else if (!hosted) label = T('Sur la version web', 'On the web version');
          else if (!enabled || !ready) label = T('Paiement bientôt', 'Payment soon');
          else if (info?.hasSubscription) label = T('Changer via Gérer', 'Change via Manage');
          const can = hosted && enabled && ready && !isCur && !info?.hasSubscription;
          return (
            <div key={p.id} className="col" data-plan={p.id} style={{ borderRadius: 22, background: `color-mix(in oklab, ${c} 12%, var(--panel))`, padding: 20, gap: 12, border: `1px solid ${isCur ? c : 'transparent'}` }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 18, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={17} color="#111113" /></span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{fr ? p.fr : p.en}</span>
                {p.id === 'pro' && <span className="pill" style={{ marginLeft: 'auto' }}>{T('Populaire', 'Popular')}</span>}
              </div>
              <span className="muted" style={{ fontSize: 12, marginTop: -6 }}>{fr ? p.tagFr : p.tagEn}</span>
              <div className="col" style={{ gap: 2 }}>
                <div className="row" style={{ alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.03em' }}>{eur(Math.round(price * 100) / 100, fr)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{p.perSeat ? T('/ siège / mois', '/ seat / month') : T('/ mois', '/ month')}</span>
                </div>
                <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                  <span className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{xof(yearly ? r50(xofOf(p.eurYear) / 12) : xofOf(p.eurMonth))}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{p.perSeat ? T('/ siège / mois', '/ seat / month') : T('/ mois', '/ month')}</span>
                </div>
                {yearly && p.eurYear > 0 && <span className="faint" style={{ fontSize: 11 }}>{T('Facturé', 'Billed')} {eur(p.eurYear, fr)} · {xof(xofOf(p.eurYear))} {T('par an', 'per year')}{p.perSeat ? T(' et par siège', ' per seat') : ''}</span>}
              </div>
              <div className="col" style={{ gap: 7 }}>
                {p.features.map((f) => (
                  <span key={f.fr} className="row" style={{ gap: 8, fontSize: 13, alignItems: 'flex-start', opacity: f.soon ? 0.7 : 1 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 9, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}><Check size={11} color="#111113" /></span>
                    <span className="pretty">{fr ? f.fr : f.en}{f.soon && <span className="pill" style={{ marginLeft: 6 }}>{T('bientôt', 'soon')}</span>}</span>
                  </span>
                ))}
                <span className="faint" style={{ fontSize: 11 }}>{fr ? p.support.fr : p.support.en}</span>
              </div>
              {p.perSeat && (
                <label className="row" style={{ gap: 8, fontSize: 12 }}>{T('Sièges', 'Seats')}
                  <input type="number" min={p.minSeats} max={200} value={seats} onChange={(e) => setSeats(Math.max(p.minSeats ?? 1, Math.min(200, Number(e.target.value) || 0)))} style={{ width: 70 }} className="input" />
                  <span className="muted">= {eur(Math.round(price * n * 100) / 100, fr)} · {xof(r50((yearly ? xofOf(p.eurYear) / 12 : xofOf(p.eurMonth)) * n))}{T('/mois', '/mo')}</span>
                </label>
              )}
              <button disabled={!can || busy === p.id} onClick={() => buy(p.id, { interval: yearly ? 'year' : 'month', seats: p.perSeat ? seats : undefined })}
                style={{ marginTop: 'auto', height: 38, borderRadius: 999, border: 0, fontWeight: 600, background: can ? c : 'var(--panel2)', color: can ? '#111113' : 'var(--tx2)', cursor: can ? 'pointer' : 'default', opacity: 1 }}>
                {busy === p.id ? <Loader2 size={14} className="spin" /> : label}
              </button>
            </div>
          );
        })}
      </div>

      <details className="card" style={{ padding: 0, overflow: 'hidden' }} data-compare>
        <summary style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: 600 }}>{T('Comparer les formules en détail', 'Compare plans in detail')}</summary>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 18px', width: '24%' }} />
                {PLANS.map((p) => <th key={p.id} style={{ textAlign: 'left', padding: '10px 12px', color: COLOR[p.id] }}>{fr ? p.fr : p.en}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.fr} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '9px 18px' }} className="muted">{fr ? row.fr : row.en}</td>
                  {PLANS.map((p) => {
                    const v = row.cells(p, fr);
                    return <td key={p.id} className="tnum" style={{ padding: '9px 12px' }}>{v === true ? <Check size={14} color="#30D158" /> : v === false ? <span className="faint">—</span> : typeof v === 'string' ? v : fr ? v.fr : v.en}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <span className="h2">{T('Packs de crédits', 'Credit packs')}</span>
      <span className="muted pretty" style={{ fontSize: 12, marginTop: -8 }}>{T(`Sans abonnement, valables ${PACK_VALIDITY_DAYS} jours, utilisés après les crédits du mois.`, `No subscription, valid for ${PACK_VALIDITY_DAYS} days, used after monthly credits.`)}</span>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {PACKS.map((k) => {
          const can = hosted && enabled && !!pay?.packs;
          return (
            <div key={k.id} className="card col" data-pack={k.id} style={{ padding: 18, gap: 8 }}>
              <span className="tnum" style={{ fontSize: 24, fontWeight: 700 }}>{k.credits.toLocaleString(fr ? 'fr-FR' : 'en-GB')} <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{T('crédits', 'credits')}</span></span>
              <span style={{ fontWeight: 600 }}>{eur(k.eur, fr)} <span style={{ fontWeight: 600 }}>· {xof(xofOf(k.eur))}</span></span>
              {k.credits > k.eur * 100 && <span className="pill ok" style={{ alignSelf: 'flex-start' }}>+{Math.round((k.credits / (k.eur * 100) - 1) * 100)} %</span>}
              <button className={can ? 'btn pri' : 'btn'} disabled={!can || busy === k.id} onClick={() => buy(k.id)} style={{ marginTop: 'auto' }}>
                {busy === k.id ? <Loader2 size={14} className="spin" /> : can ? T('Acheter', 'Buy') : hosted ? T('Paiement bientôt', 'Payment soon') : T('Sur la version web', 'On the web version')}
              </button>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ gap: 8, fontSize: 12 }}>
        <Smartphone size={14} /><span className="muted">{T('Prix en FCFA au taux fixe (1 € = 655,957 FCFA). Paiement par carte via Stripe, débité en euros ; Mobile Money (Orange, MTN, Wave) arrive bientôt, directement en FCFA.', 'FCFA prices at the fixed peg (€1 = 655.957 FCFA). Card payment via Stripe, charged in euros; Mobile Money (Orange, MTN, Wave) is coming soon, directly in FCFA.')}</span>
      </div>

      <span className="h2">{T('Combien coûte une requête ?', 'What does a request cost?')}</span>
      <div className="card col" style={{ padding: 6 }}>
        {TYPICAL.map((r) => (
          <div key={r.fr} className="row" style={{ justifyContent: 'space-between', padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--line)' }}>
            <span>{fr ? r.fr : r.en}</span><span className="tnum muted">{r.credits} {T('crédits', 'credits')}</span>
          </div>
        ))}
        <span className="faint pretty" style={{ fontSize: 11, padding: '9px 12px' }}>{T('Estimations. Le montant réel dépend de la longueur de la conversation et des pièces jointes ; il s’affiche dans l’historique après chaque requête. Upload, extraction de texte et édition : gratuits.', 'Estimates. The real amount depends on conversation length and attachments; it appears in the history after each request. Upload, text extraction and editing: free.')}</span>
      </div>

      {hosted && enabled && !!info?.ledger.length && (
        <>
          <span className="h2">{T('Historique', 'History')}</span>
          <div className="card col" style={{ padding: 6, overflowX: 'auto' }}>
            {info.ledger.map((l, i) => (
              <div key={i} className="row" style={{ gap: 12, padding: '8px 12px', fontSize: 12, borderBottom: '1px solid var(--line)', minWidth: 460 }}>
                <span className="faint tnum" style={{ width: 120, flex: 'none' }}>{new Date(l.at).toLocaleString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="grow">{KIND[l.kind]?.[fr ? 0 : 1] ?? l.kind}{l.model ? <span className="faint"> · {l.model}{l.tokens_in != null ? ` · ${(l.tokens_in + (l.cache_read ?? 0)).toLocaleString()} → ${l.tokens_out?.toLocaleString()} tokens` : ''}</span> : l.ref ? <span className="faint"> · {l.ref}</span> : null}</span>
                <span className="tnum" style={{ fontWeight: 600, color: l.credits > 0 ? 'var(--ok, #30D158)' : undefined }}>{l.credits > 0 ? '+' : ''}{l.credits}</span>
                <span className="tnum faint" style={{ width: 60, textAlign: 'right' }}>{l.balance_after}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
