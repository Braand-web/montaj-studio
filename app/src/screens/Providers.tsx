import { PROVIDER_LOGOS } from '../ui/providerLogos';
import { useEffect, useState } from 'react';
import { KeyRound, CircleCheck, CircleAlert, Sparkles, Image as ImageIcon, Clapperboard, Mic, Wand2, Globe, Lock } from 'lucide-react';
import { useApp, useT, type AgentMode, type Tier } from '../store/app';
import { PageHead, Chips } from '../ui/kit';
import { getSample, sampleErrorText } from '../lib/claude';
import { tracked } from '../lib/usage';

export type ClaudeStatus = 'checking' | 'ok' | 'notools' | 'off';

export function useClaudeStatus() {
  const [status, setStatus] = useState<ClaudeStatus>('checking');
  useEffect(() => {
    void (async () => {
      const s = await getSample();
      if (!s) { setStatus('off'); return; }
      try { const l = await s.limits(); setStatus(l.tools ? 'ok' : 'notools'); } catch { setStatus('notools'); }
    })();
  }, []);
  return status;
}

export const PROVIDERS: { id: string; name: string; c: string; icon: typeof Sparkles; caps: [string, string]; live?: boolean }[] = [
  { id: 'claude', name: 'Claude', c: '#D97757', icon: Sparkles, caps: ['Assistant, Studio Chat, rédaction, traduction', 'Assistant, Studio Chat, writing, translation'], live: true },
  { id: 'openai', name: 'OpenAI', c: '#30D158', icon: ImageIcon, caps: ['Images (gpt-image), texte', 'Images (gpt-image), text'] },
  { id: 'google', name: 'Google', c: '#64D2FF', icon: ImageIcon, caps: ['Images (Imagen), vidéo (Veo)', 'Images (Imagen), video (Veo)'] },
  { id: 'fal', name: 'fal.ai', c: '#BF5AF2', icon: Clapperboard, caps: ['Vidéo (Seedance, Kling), FLUX', 'Video (Seedance, Kling), FLUX'] },
  { id: 'runway', name: 'Runway', c: '#FF9F0A', icon: Clapperboard, caps: ['Vidéo Gen-4, image → vidéo', 'Gen-4 video, image → video'] },
  { id: 'higgsfield', name: 'Higgsfield', c: '#FF375F', icon: Clapperboard, caps: ['Vidéo, mouvements de caméra', 'Video, camera moves'] },
  { id: 'elevenlabs', name: 'ElevenLabs', c: '#FFD60A', icon: Mic, caps: ['Voix off, doublage, effets sonores', 'Voice-over, dubbing, sound effects'] },
  { id: 'mistral', name: 'Mistral', c: '#FF9F0A', icon: Wand2, caps: ['Texte, traduction', 'Text, translation'] },
  { id: 'custom', name: 'Personnalisé', c: '#8E8E93', icon: Globe, caps: ['API compatible OpenAI ou REST', 'OpenAI-compatible or REST API'] },
];

// Real brand mark on a white tile (readable in both themes); monogram or generic icon when no mark is available.
export function ProviderLogo({ p, size = 34 }: { p: (typeof PROVIDERS)[number]; size?: number }) {
  const svg = PROVIDER_LOGOS[p.id];
  const box = { width: size, height: size, borderRadius: size * 0.28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;
  if (svg) return <span title={p.name} style={{ ...box, background: '#fff', color: '#111113', padding: size * 0.2, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }} dangerouslySetInnerHTML={{ __html: svg }} />;
  if (p.id === 'custom') return <span style={{ ...box, background: 'var(--panel2)' }}><p.icon size={size * 0.45} color="var(--tx2)" /></span>;
  return <span title={p.name} style={{ ...box, background: '#111113', color: '#fff', fontWeight: 800, fontSize: size * 0.46, letterSpacing: '-.04em' }}>{p.name[0]}</span>;
}

export function Providers() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const tier = useApp((s) => s.tier);
  const mode = useApp((s) => s.agentMode);
  const set = useApp((s) => s.set);
  const status = useClaudeStatus();
  const [test, setTest] = useState<string | null>(null);
  const [pick, setPick] = useState('claude');
  const runTest = async () => {
    const s = await getSample();
    if (!s) return;
    setTest(T('Test en cours…', 'Testing…'));
    const t0 = performance.now();
    try {
      await tracked('test', 'quick', () => s('Reply with the single word OK.', { modelTier: 'quick', cache: false }));
      setTest(T(`Connexion OK · ${Math.round(performance.now() - t0)} ms`, `Connection OK · ${Math.round(performance.now() - t0)} ms`));
    } catch (e) {
      setTest(sampleErrorText((e as { code?: string }).code, lang === 'fr'));
    }
  };
  const p = PROVIDERS.find((x) => x.id === pick)!;
  return (
    <div className="page narrow screen-in">
      <PageHead color="#8E8E93" icon={<KeyRound size={19} />} title={T('Fournisseurs IA', 'AI providers')} sub={T('Les modèles qui font tourner l’assistant et les générations. Claude fonctionne déjà avec ton compte ; les autres arriveront avec tes propres clés.', 'The models behind the assistant and generations. Claude already works with your account; the others will come with your own keys.')} />
      <div className="row" style={{ gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--panel2)', fontSize: 12, alignItems: 'flex-start' }}>
        <Lock size={14} color="var(--accTx)" style={{ flex: 'none', marginTop: 1 }} />
        <span className="muted pretty">{T('Avec tes clés, chaque clé sera chiffrée côté serveur (AES-256-GCM) et jamais renvoyée au navigateur. Cette passerelle n’est pas encore déployée : aucune clé n’est demandée ni stockée pour l’instant.', 'With your keys, each key will be encrypted server-side (AES-256-GCM) and never sent back to the browser. That gateway is not deployed yet: no key is requested or stored for now.')}</span>
      </div>
      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><span className="h2">{T('Catalogue', 'Catalog')}</span><span className="faint" style={{ fontSize: 12 }}>{T('1 connecté sur', '1 connected of')} {PROVIDERS.length}</span></div>
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {PROVIDERS.map((x) => {
            const on = x.live && status !== 'off' && status !== 'checking';
            return (
              <button key={x.id} onClick={() => setPick(x.id)} className="col" style={{ alignItems: 'flex-start', gap: 6, padding: 14, minHeight: 112, borderRadius: 18, border: `1px solid ${pick === x.id ? 'var(--accTx)' : 'var(--line)'}`, background: `color-mix(in oklab, ${x.c} 10%, var(--panel))`, textAlign: 'left' }}>
                <div className="row" style={{ gap: 8, width: '100%' }}>
                  <ProviderLogo p={x} size={34} />
                  <span className="grow" style={{ fontSize: 14, fontWeight: 600 }}>{x.id === 'custom' ? T('Personnalisé', 'Custom') : x.name}</span>
                  {on && <CircleCheck size={15} color="#30D158" />}
                </div>
                <span className="muted pretty" style={{ fontSize: 12 }}>{T(x.caps[0], x.caps[1])}</span>
                <span style={{ marginTop: 'auto', fontSize: 11, color: on ? '#30D158' : 'var(--tx3)' }}>{x.live ? (on ? T('Connecté · ton compte Claude', 'Connected · your Claude account') : status === 'checking' ? T('Vérification…', 'Checking…') : T('Ouvre l’app dans claude.ai', 'Open the app in claude.ai')) : T('Bientôt · avec ta clé', 'Soon · with your key')}</span>
              </button>
            );
          })}
        </div>
      </div>
      {p.live ? (
        <div className="card col" style={{ padding: 16, gap: 14 }}>
          <div className="row wrap" style={{ gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Claude</span>
            {status === 'checking' && <span className="pill">{T('Vérification…', 'Checking…')}</span>}
            {status === 'ok' && <span className="pill ok row" style={{ gap: 4 }}><CircleCheck size={11} />{T('Connecté · outils actifs', 'Connected · tools on')}</span>}
            {status === 'notools' && <span className="pill warn row" style={{ gap: 4 }}><CircleAlert size={11} />{T('Connecté · conseils seulement', 'Connected · advice only')}</span>}
            {status === 'off' && <span className="pill warn">{T('Non disponible ici', 'Not available here')}</span>}
            <div className="grow" />
            {(status === 'ok' || status === 'notools') && <button className="btn" onClick={() => void runTest()}>{T('Tester la connexion', 'Test connection')}</button>}
          </div>
          {test && <span className="mono acc" style={{ fontSize: 11 }}>{test}</span>}
          {status === 'off' && <span className="muted pretty" style={{ fontSize: 12 }}>{T('Ouvre Montaj Studio depuis claude.ai, connecté à ton compte, pour activer l’assistant et Studio Chat. Tout le reste fonctionne sans lui.', 'Open Montaj Studio from claude.ai, signed in, to turn on the assistant and Studio Chat. Everything else works without it.')}</span>}
          <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr)', gap: '12px 16px', fontSize: 12, alignItems: 'start' }}>
            <span className="faint" style={{ lineHeight: '28px' }}>{T('Modèle par défaut', 'Default model')}</span>
            <Chips value={tier} onChange={(v: Tier) => set({ tier: v })} options={[{ id: 'quick' as const, label: T('Rapide', 'Fast') }, { id: 'default' as const, label: T('Équilibré', 'Balanced') }, { id: 'complex' as const, label: T('Avancé', 'Advanced') }]} />
            <span className="faint" style={{ lineHeight: '28px' }}>{T('Mode par défaut', 'Default mode')}</span>
            <div className="col" style={{ gap: 6 }}>
              <Chips value={mode} onChange={(v: AgentMode) => set({ agentMode: v })} options={[{ id: 'ask' as const, label: 'Ask' }, { id: 'assist' as const, label: 'Assist' }, { id: 'agent' as const, label: 'Agent' }]} />
              <span className="muted pretty">{mode === 'ask' ? T('Lecture seule : il explique et conseille.', 'Read-only: it explains and advises.') : mode === 'assist' ? T('Il travaille sur une copie ; tu appliques ou refuses la proposition.', 'It works on a copy; you apply or refuse the proposal.') : T('Il applique directement ; tu peux l’arrêter et tout annuler en une fois.', 'It applies directly; you can stop it and undo everything in one step.')}</span>
            </div>
            <span className="faint">{T('Coût', 'Cost')}</span>
            <span className="muted pretty">{T('Chaque demande utilise ton forfait Claude. Montaj Studio ne facture rien.', 'Each request uses your Claude plan. Montaj Studio charges nothing.')}</span>
            <span className="faint">{T('Données envoyées', 'Data sent')}</span>
            <span className="muted pretty">{T('Ta demande, une description du document (textes, couleurs, positions, noms et durées des clips) et ton kit de marque. Jamais tes fichiers vidéo, audio ou images.', 'Your request, a description of the document (texts, colors, positions, clip names and durations) and your brand kit. Never your video, audio or image files.')}</span>
          </div>
        </div>
      ) : (
        <div className="card col" style={{ padding: 16, gap: 12 }}>
          <div className="row" style={{ gap: 10 }}><ProviderLogo p={p} size={40} /><span style={{ fontSize: 15, fontWeight: 600 }}>{p.id === 'custom' ? T('Fournisseur personnalisé', 'Custom provider') : p.name}</span><span className="pill">{T('Bientôt', 'Soon')}</span></div>
          <span className="muted pretty" style={{ fontSize: 12 }}>{T(p.caps[0], p.caps[1])}. {T('Tu colleras ici ta clé API ; les générations seront facturées directement par ce fournisseur, sans marge. Le coût estimé sera affiché avant chaque génération.', 'You will paste your API key here; generations will be billed directly by this provider, with no markup. The estimated cost will be shown before every generation.')}</span>
          <div className="row" style={{ gap: 8 }}>
            <input className="input mono grow" disabled placeholder={T('Clé API · disponible avec la passerelle serveur', 'API key · available with the server gateway')} />
            <button className="btn primary" disabled>{T('Enregistrer', 'Save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
