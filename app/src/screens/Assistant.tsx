import { useEffect, useState } from 'react';
import { Sparkles, CircleCheck, CircleAlert } from 'lucide-react';
import { useApp, useT, type AgentMode, type Tier } from '../store/app';
import { PageHead, Chips } from '../ui/kit';
import { getSample, sampleErrorText } from '../lib/claude';

export function Assistant() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const tier = useApp((s) => s.tier);
  const mode = useApp((s) => s.agentMode);
  const set = useApp((s) => s.set);
  const [status, setStatus] = useState<'checking' | 'ok' | 'notools' | 'off'>('checking');
  const [test, setTest] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const s = await getSample();
      if (!s) { setStatus('off'); return; }
      try { const l = await s.limits(); setStatus(l.tools ? 'ok' : 'notools'); } catch { setStatus('notools'); }
    })();
  }, []);
  const runTest = async () => {
    const s = await getSample();
    if (!s) return;
    setTest(T('Test en cours…', 'Testing…'));
    const t0 = performance.now();
    try {
      await s('Reply with the single word OK.', { modelTier: 'quick', cache: false });
      setTest(T(`Connexion OK · ${Math.round(performance.now() - t0)} ms`, `Connection OK · ${Math.round(performance.now() - t0)} ms`));
    } catch (e) {
      setTest(sampleErrorText((e as { code?: string }).code, lang === 'fr'));
    }
  };
  const planned = ['OpenAI · images', 'fal.ai · vidéo', 'ElevenLabs · voix', 'Google · Imagen / Veo', 'Mistral', T('Fournisseur personnalisé (OpenAI-compatible)', 'Custom provider (OpenAI-compatible)')];
  return (
    <div className="page narrow screen-in">
      <PageHead color="#5E5CE6" icon={<Sparkles size={19} />} title={T('Assistant IA', 'AI assistant')} sub={T('L’assistant (Composer) crée et modifie tes designs et tes vidéos avec les mêmes outils que toi. Il fonctionne avec ton compte Claude quand tu ouvres l’application depuis claude.ai.', 'The assistant (Composer) creates and edits your designs and videos with the same tools you use. It runs on your Claude account when you open the app from claude.ai.')} />
      <div className="card col" style={{ padding: 16, gap: 12 }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Claude</span>
          {status === 'checking' && <span className="pill">{T('Vérification…', 'Checking…')}</span>}
          {status === 'ok' && <span className="pill ok row" style={{ gap: 4 }}><CircleCheck size={11} />{T('Connecté · outils actifs', 'Connected · tools on')}</span>}
          {status === 'notools' && <span className="pill warn row" style={{ gap: 4 }}><CircleAlert size={11} />{T('Connecté · conseils seulement', 'Connected · advice only')}</span>}
          {status === 'off' && <span className="pill warn">{T('Non disponible ici', 'Not available here')}</span>}
          <div className="grow" />
          {status !== 'off' && status !== 'checking' && <button className="btn" onClick={() => void runTest()}>{T('Tester la connexion', 'Test connection')}</button>}
        </div>
        {test && <span className="mono acc" style={{ fontSize: 11 }}>{test}</span>}
        {status === 'off' && <span className="muted pretty" style={{ fontSize: 12 }}>{T('Ouvre Montaj Studio depuis claude.ai, connecté à ton compte, pour activer l’assistant. Tout le reste de l’application fonctionne sans lui.', 'Open Montaj Studio from claude.ai, signed in, to turn the assistant on. The rest of the app works without it.')}</span>}
        {status === 'notools' && <span className="muted pretty" style={{ fontSize: 12 }}>{T('Cette vue ne permet pas à Claude d’appeler les outils de la page : il peut conseiller mais pas modifier le document.', 'This view does not let Claude call the page tools: it can advise but not edit the document.')}</span>}
        <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr)', gap: '12px 16px', fontSize: 12, alignItems: 'start' }}>
          <span className="faint" style={{ lineHeight: '28px' }}>{T('Modèle par défaut', 'Default model')}</span>
          <Chips value={tier} onChange={(v: Tier) => set({ tier: v })} options={[{ id: 'quick' as const, label: T('Rapide', 'Fast') }, { id: 'default' as const, label: T('Équilibré', 'Balanced') }, { id: 'complex' as const, label: T('Avancé', 'Advanced') }]} />
          <span className="faint" style={{ lineHeight: '28px' }}>{T('Mode par défaut', 'Default mode')}</span>
          <div className="col" style={{ gap: 6 }}>
            <Chips value={mode} onChange={(v: AgentMode) => set({ agentMode: v })} options={[{ id: 'ask' as const, label: 'Ask' }, { id: 'assist' as const, label: 'Assist' }, { id: 'agent' as const, label: 'Agent' }]} />
            <span className="muted pretty">{mode === 'ask' ? T('Lecture seule : il explique et conseille.', 'Read-only: it explains and advises.') : mode === 'assist' ? T('Il travaille sur une copie ; tu appliques ou refuses la proposition.', 'It works on a copy; you apply or refuse the proposal.') : T('Il applique directement ; tu peux l’arrêter et tout annuler en une fois.', 'It applies directly; you can stop it and undo everything in one step.')}</span>
          </div>
          <span className="faint">{T('Coût', 'Cost')}</span>
          <span className="muted pretty">{T('Chaque demande utilise ton forfait Claude. Montaj Studio ne facture rien et n’a pas de crédits internes.', 'Each request uses your Claude plan. Montaj Studio charges nothing and has no internal credits.')}</span>
        </div>
      </div>
      <div className="col" style={{ gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--panel2)', fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>{T('Ce qui est envoyé à Claude', 'What is sent to Claude')}</span>
        {[T('Ta demande et les derniers échanges de la conversation.', 'Your request and the latest turns of the conversation.'), T('Une description du document : textes, couleurs, positions, noms et durées des clips.', 'A description of the document: texts, colors, positions, clip names and durations.'), T('Ton kit de marque (couleurs, polices, ton).', 'Your brand kit (colors, fonts, voice).'), T('Jamais tes fichiers vidéo, audio ou images.', 'Never your video, audio or image files.')].map((x) => <div key={x} className="row" style={{ gap: 8, alignItems: 'flex-start' }}><span className="acc">•</span><span className="muted pretty">{x}</span></div>)}
      </div>
      <div className="col" style={{ gap: 10 }}>
        <span className="eyebrow">{T('Fournisseurs avec tes propres clés (BYOK) · bientôt', 'Providers with your own keys (BYOK) · coming soon')}</span>
        <span className="muted pretty" style={{ fontSize: 12 }}>{T('La génération d’images, de vidéos et de voix passera par tes clés, chiffrées côté serveur et jamais renvoyées au navigateur. Cette passerelle n’est pas encore déployée.', 'Image, video and voice generation will use your keys, encrypted server-side and never sent back to the browser. This gateway is not deployed yet.')}</span>
        <div className="row wrap" style={{ gap: 6 }}>{planned.map((p) => <span key={p} className="chip" style={{ color: 'var(--tx2)' }}>{p} <span className="faint" style={{ fontSize: 10 }}>{T('Bientôt', 'Soon')}</span></span>)}</div>
      </div>
    </div>
  );
}
