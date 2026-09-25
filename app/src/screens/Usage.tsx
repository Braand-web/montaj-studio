import { useEffect } from 'react';
import { ChartNoAxesColumn } from 'lucide-react';
import { useApp, useT, type AgentMode } from '../store/app';
import { PageHead } from '../ui/kit';
import { useUsage, type UsageSource } from '../lib/usage';

export function Usage() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.agentMode);
  const set = useApp((s) => s.set);
  const rows = useUsage((s) => s.rows);
  const limit = useUsage((s) => s.dailyLimit);
  const today = useUsage((s) => s.today());
  useEffect(() => { void useUsage.getState().load(); }, []);
  const src: Record<UsageSource, string> = {
    'composer-design': T('Assistant · design', 'Assistant · design'), 'composer-video': T('Assistant · vidéo', 'Assistant · video'),
    'studio-chat': 'Studio Chat', 'ai-write': T('Rédaction', 'Writing'), 'ai-translate': T('Traduction', 'Translation'), test: T('Test de connexion', 'Connection test'),
  };
  const tierL: Record<string, string> = { quick: T('Rapide', 'Fast'), default: T('Équilibré', 'Balanced'), complex: T('Avancé', 'Advanced') };
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const perDay = last7.map((d) => rows.filter((r) => r.at >= d.getTime() && r.at < d.getTime() + 86400_000).length);
  const max = Math.max(1, ...perDay);
  const ok = rows.filter((r) => r.status === 'ok').length;
  const tools = rows.reduce((s, r) => s + r.tools, 0);
  const loc = lang === 'fr' ? 'fr-FR' : 'en-US';
  const policies: { id: AgentMode; l: string; s: string }[] = [
    { id: 'assist', l: T('Toujours demander', 'Always ask'), s: T('L’assistant prépare une proposition ; rien ne change sans ton accord (Assist).', 'The assistant prepares a proposal; nothing changes without your approval (Assist).') },
    { id: 'agent', l: T('Appliquer directement', 'Apply directly'), s: T('L’assistant modifie le document ; tu peux l’arrêter et tout annuler (Agent).', 'The assistant edits the document; you can stop it and undo everything (Agent).') },
    { id: 'ask', l: T('Conseils seulement', 'Advice only'), s: T('L’assistant n’a accès à aucun outil d’écriture (Ask).', 'The assistant has no write tools (Ask).') },
  ];
  return (
    <div className="page screen-in" style={{ maxWidth: 1100 }}>
      <PageHead color="#64D2FF" icon={<ChartNoAxesColumn size={19} />} title={T('Utilisation IA', 'AI usage')} sub={T('Chaque requête envoyée à Claude depuis cet appareil. Elles sont décomptées de ton forfait Claude, pas facturées par Montaj.', 'Every request sent to Claude from this device. They count against your Claude plan, not billed by Montaj.')} />
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {[
          [T('Aujourd’hui', 'Today'), String(today), limit ? T(`sur ${limit} autorisées`, `of ${limit} allowed`) : T('sans limite', 'no limit'), '#0A84FF'],
          [T('Total', 'Total'), String(rows.length), T(`${ok} réussies`, `${ok} succeeded`), '#30D158'],
          [T('Actions d’outils', 'Tool actions'), String(tools), T('modifications faites par Claude', 'edits made by Claude'), '#BF5AF2'],
          [T('Coût Montaj', 'Montaj cost'), '0 €', T('toujours gratuit', 'always free'), '#FF9F0A'],
        ].map(([l, v, s, c]) => (
          <div key={l} className="col" style={{ borderRadius: 18, padding: 16, background: `color-mix(in oklab, ${c} 12%, var(--panel))`, gap: 4 }}>
            <span className="muted" style={{ fontSize: 12 }}>{l}</span><span className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{v}</span><span className="faint" style={{ fontSize: 11 }}>{s}</span>
          </div>
        ))}
      </div>
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <div className="card col" style={{ padding: 16, gap: 12 }}>
          <span className="eyebrow">{T('7 derniers jours', 'Last 7 days')}</span>
          <div className="row" style={{ alignItems: 'flex-end', gap: 8, height: 120 }}>
            {perDay.map((n, i) => (
              <div key={i} className="col grow" style={{ alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <span className="mono faint" style={{ fontSize: 10 }}>{n || ''}</span>
                <div style={{ width: '100%', maxWidth: 28, height: `${(n / max) * 80}%`, minHeight: n ? 3 : 1, borderRadius: '4px 4px 0 0', background: i === 6 ? 'var(--acc)' : 'color-mix(in oklab, var(--acc) 45%, var(--panel2))' }} />
                <span className="faint" style={{ fontSize: 10, textTransform: 'capitalize' }}>{last7[i].toLocaleDateString(loc, { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card col" style={{ padding: 16, gap: 12 }}>
          <span className="eyebrow">{T('Budget', 'Budget')}</span>
          <label className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <span>{T('Requêtes maximum par jour', 'Max requests per day')}</span>
            <input id="usage-limit" className="input mono" type="number" min={0} value={limit} onChange={(e) => useUsage.getState().setLimit(Number(e.target.value) || 0)} style={{ width: 90, textAlign: 'right' }} />
          </label>
          <span className="faint pretty" style={{ fontSize: 12 }}>{T('0 = sans limite. Au-delà, l’assistant et Studio Chat s’arrêtent jusqu’au lendemain.', '0 = no limit. Beyond it, the assistant and Studio Chat stop until the next day.')}</span>
          <span className="eyebrow" style={{ marginTop: 4 }}>{T('Approbation des modifications', 'Change approval')}</span>
          {policies.map((p) => (
            <button key={p.id} onClick={() => set({ agentMode: p.id })} className="row" style={{ gap: 10, textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: `1px solid ${mode === p.id ? 'var(--accTx)' : 'var(--line2)'}`, background: mode === p.id ? 'var(--accSoft)' : 'transparent', alignItems: 'flex-start' }}>
              <span style={{ width: 14, height: 14, marginTop: 2, borderRadius: 10, border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ width: 8, height: 8, borderRadius: 4, background: mode === p.id ? 'var(--acc)' : 'transparent' }} /></span>
              <span className="col"><span style={{ fontWeight: 500 }}>{p.l}</span><span className="muted" style={{ fontSize: 12 }}>{p.s}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div className="eyebrow" style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1.3fr) 110px 80px 90px 120px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
            <span>{T('Date', 'Date')}</span><span>{T('Source', 'Source')}</span><span>{T('Modèle', 'Model')}</span><span>{T('Outils', 'Tools')}</span><span>{T('Durée', 'Time')}</span><span>{T('Statut', 'Status')}</span>
          </div>
          {rows.slice(0, 100).map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '140px minmax(0,1.3fr) 110px 80px 90px 120px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 12, alignItems: 'center' }}>
              <span className="mono muted">{new Date(r.at).toLocaleString(loc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              <span>{src[r.source] ?? r.source}</span>
              <span className="muted">Claude · {tierL[r.tier] ?? r.tier}</span>
              <span className="mono">{r.tools}</span>
              <span className="mono">{(r.ms / 1000).toFixed(1)} s</span>
              <span style={{ color: r.status === 'ok' ? '#30D158' : r.status === 'stopped' ? 'var(--tx3)' : 'var(--warn)' }}>{r.status === 'ok' ? T('Terminé', 'Completed') : r.status === 'stopped' ? T('Arrêté', 'Stopped') : T('Échec', 'Failed') + (r.code ? ` · ${r.code}` : '')}</span>
            </div>
          ))}
          {!rows.length && <div className="faint" style={{ padding: 30, textAlign: 'center', fontSize: 12 }}>{T('Aucune requête pour l’instant. Utilise l’assistant ou Studio Chat.', 'No requests yet. Use the assistant or Studio Chat.')}</div>}
        </div>
      </div>
      {rows.length > 0 && <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => useUsage.getState().clear()}>{T('Effacer l’historique', 'Clear history')}</button>}
    </div>
  );
}
