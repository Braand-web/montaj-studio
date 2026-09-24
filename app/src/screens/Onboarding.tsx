import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { LogoMark } from '../ui/kit';
import { fmt } from '../model/formats';
import { newFromFormat } from '../lib/create';
import { requestPersist } from '../lib/db';

export function Onboarding() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const set = useApp((s) => s.set);
  const go = useApp((s) => s.go);
  const uses = useApp((s) => s.uses);
  const [step, setStep] = useState(0);
  const finish = (screen: 'home' | 'templates' | 'assistant' = 'home') => { set({ onboarded: true }); void requestPersist(); go(screen); };
  const useOpts = [
    ['yt', T('Vidéos YouTube', 'YouTube videos'), T('Montages longs, miniatures', 'Long edits, thumbnails')],
    ['short', T('Shorts, Reels, TikTok', 'Shorts, Reels, TikTok'), T('Formats verticaux courts', 'Short vertical formats')],
    ['social', T('Visuels réseaux sociaux', 'Social visuals'), T('Posts, stories, bannières', 'Posts, stories, banners')],
    ['print', T('Impression', 'Print'), T('Flyers, affiches, cartes', 'Flyers, posters, cards')],
    ['office', T('Présentations', 'Presentations'), T('Diapositives, documents', 'Slides, documents')],
    ['all', T('Un peu de tout', 'A bit of everything'), T('On te montre tout', 'We show you everything')],
  ];
  const starts = [
    { l: T('Importer une vidéo', 'Import a video'), s: 'MP4, MOV, WebM', bg: 'linear-gradient(135deg,#1F5FBF,#64D2FF)', go: () => { set({ onboarded: true }); void newFromFormat(uses.includes('yt') ? fmt('v-youtube') : fmt('v-tiktok')); } },
    { l: T('Partir d’un modèle', 'Start from a template'), s: T('Modifiable en quelques clics', 'Editable in a few clicks'), bg: 'linear-gradient(135deg,#FF9F0A,#FFD23F)', go: () => finish('templates') },
    { l: T('Page blanche', 'Blank page'), s: T('Choisis un format', 'Pick a format'), bg: 'repeating-linear-gradient(135deg, var(--panel2) 0 8px, var(--panel) 8px 16px)', go: () => finish('home') },
  ];
  return (
    <div className="col screen-in" style={{ height: '100%', overflow: 'auto' }}>
      <div className="row" style={{ justifyContent: 'space-between', padding: '16px 24px' }}>
        <div className="row" style={{ gap: 8 }}><span className="logo-btn" style={{ width: 26, height: 26 }}><LogoMark size={11} /></span><span style={{ fontWeight: 600 }}>Montaj Studio</span></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn" style={{ height: 28 }} onClick={() => useApp.getState().toggleLang()}>{lang === 'fr' ? 'EN' : 'FR'}</button>
          <button className="btn bare" style={{ height: 28 }} onClick={() => finish()}>{T('Passer', 'Skip')}</button>
        </div>
      </div>
      <div className="row" style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <div className="col" style={{ width: '100%', maxWidth: 640, gap: 24 }}>
          <div className="row" style={{ gap: 6 }}>{[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--acc)' : 'var(--line2)' }} />)}</div>
          <div className="mono faint" style={{ fontSize: 11 }}>{T('Étape', 'Step')} {step + 1} / 3</div>
          {step === 0 && (
            <>
              <div className="col" style={{ gap: 6 }}><h1 className="h1" style={{ fontSize: 26 }}>{T('Qu’est-ce que tu crées le plus souvent ?', 'What do you create most often?')}</h1><p className="muted" style={{ margin: 0 }}>{T('On adapte les formats proposés. Tu pourras tout changer.', 'We’ll tailor the suggested formats. You can change everything later.')}</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 8 }}>
                {useOpts.map(([id, l, s]) => {
                  const on = uses.includes(id);
                  return (
                    <button key={id} onClick={() => set({ uses: on ? uses.filter((x) => x !== id) : [...uses, id] })} className="col" style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: `1px solid ${on ? 'var(--accTx)' : 'var(--line2)'}`, background: on ? 'var(--accSoft)' : 'var(--panel)', gap: 2 }}>
                      <span className="row" style={{ justifyContent: 'space-between', fontWeight: 600 }}>{l}{on && <Check size={14} color="var(--accTx)" />}</span><span className="muted" style={{ fontSize: 12 }}>{s}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="h1" style={{ fontSize: 26 }}>{T('Par quoi veux-tu commencer ?', 'How do you want to start?')}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                {starts.map((s) => (
                  <button key={s.l} onClick={s.go} className="col" style={{ textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--panel)', gap: 10 }}>
                    <div style={{ height: 84, borderRadius: 10, background: s.bg, border: '1px solid var(--line)' }} />
                    <span style={{ fontWeight: 600 }}>{s.l}</span><span className="muted" style={{ fontSize: 12, marginTop: -8 }}>{s.s}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="col" style={{ gap: 8 }}><h1 className="h1" style={{ fontSize: 26 }}>{T('L’assistant IA, sans clé à configurer', 'The AI assistant, no key to set up')}</h1><p className="muted pretty" style={{ margin: 0 }}>{T('Tout l’éditeur fonctionne sans IA. Quand tu ouvres Montaj Studio depuis claude.ai, l’assistant utilise ton compte Claude : rien à payer ici, aucune clé à coller.', 'The whole editor works without AI. When you open Montaj Studio from claude.ai, the assistant uses your Claude account: nothing to pay here, no key to paste.')}</p></div>
              <div className="card col" style={{ padding: '14px 16px', gap: 8 }}>
                {[T('Tes fichiers restent sur cet appareil : rien n’est envoyé sans action de ta part.', 'Your files stay on this device: nothing is sent unless you act.'), T('L’assistant ne voit que la description du document (textes, positions, clips), jamais tes médias.', 'The assistant only sees the document description (texts, positions, clips), never your media.'), T('Ask, Assist ou Agent : tu choisis combien de liberté tu lui laisses, et tout reste annulable.', 'Ask, Assist or Agent: you choose how much freedom it gets, and everything can be undone.')].map((p) => (
                  <div key={p} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><span className="acc">✓</span><span className="pretty">{p}</span></div>
                ))}
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn primary lg" onClick={() => finish('home')}>{T('Commencer', 'Get started')}</button>
                <button className="btn lg" onClick={() => finish('assistant')}>{T('Réglages de l’assistant', 'Assistant settings')}</button>
              </div>
            </>
          )}
          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button className="btn ghost md" style={{ opacity: step ? 1 : 0.4 }} disabled={!step} onClick={() => setStep(step - 1)}>{T('Retour', 'Back')}</button>
            {step < 2 && <button className="btn primary md" onClick={() => setStep(step + 1)}>{T('Continuer', 'Continue')}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
