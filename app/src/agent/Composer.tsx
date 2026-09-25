import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { ArrowUp, Check, CircleAlert, LoaderCircle, Square, Eye, EyeOff, Paperclip, X, ScanEye } from 'lucide-react';
import { runAgent, type AgentTool, type Step } from './runner';
import { useApp, useT, type AgentMode, type Tier } from '../store/app';
import type { Msg } from '../lib/claude';
import { notify } from '../lib/notify';
import { aiLimits, splitNext } from '../lib/ai';
import { importFiles, mediaUrlSync } from '../lib/media';
import { prefs } from '../lib/db';
import type { MediaItem } from '../model/types';

// Conversational Composer (SPEC §9.2). Ask = read-only, Assist = works on a copy and waits
// for Apply/Refuse, Agent = edits directly with Stop and one-step "Undo all".

export interface RunSession {
  tools: AgentTool[];
  changes: string[];
  apply?(): void;
  refuse?(): void;
  undoAll?(): void;
  redoAll?(): void;
  finish?(): void;
}

export interface ComposerHost {
  kind: 'design' | 'video';
  snapshot?(): Promise<Blob | null>;
  snapshotLabel?: string;
  suggestions: string[];
  rules(): string;
  session(mode: AgentMode): RunSession;
}

type Status = 'thinking' | 'running' | 'proposal' | 'done' | 'stopped' | 'refused' | 'applied' | 'reverted' | 'error' | 'answer';
interface Turn {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  steps: Step[];
  status?: Status;
  error?: string;
  mode?: AgentMode;
  session?: RunSession;
  showChanges?: boolean;
  next?: string[];
  images?: number;
  attach?: string[];
}

export const useAgentRun = create<{ running: boolean; abort: (() => void) | null; set(p: { running: boolean; abort: (() => void) | null }): void }>((set) => ({
  running: false, abort: null, set: (p) => set(p),
}));

let turnSeq = 0;

export function Composer({ host, autoPrompt }: { host: ComposerHost; autoPrompt?: string | null }) {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const mode = useApp((s) => s.agentMode);
  const tier = useApp((s) => s.tier);
  const setApp = useApp((s) => s.set);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const running = useAgentRun((s) => s.running);
  const consumed = useRef<string | null>(null);
  const [maxImages, setMaxImages] = useState(0);
  const [see, setSee] = useState(() => prefs.get('aiSee', true));
  const [attach, setAttach] = useState<{ m: MediaItem; blob: Blob }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void aiLimits().then((l) => setMaxImages(l.images)); }, []);
  const toggleSee = () => { const v = !see; setSee(v); prefs.set('aiSee', v); };
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: { m: MediaItem; blob: Blob }[] = [];
    for (const f of [...files].filter((x) => x.type.startsWith('image/'))) {
      const { ok } = await importFiles([f]);
      if (ok[0]) added.push({ m: ok[0], blob: f });
    }
    setAttach((a) => [...a, ...added].slice(0, Math.max(1, maxImages - 1)));
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (autoPrompt && autoPrompt !== '__feedback__' && consumed.current !== autoPrompt && !running) {
      consumed.current = autoPrompt;
      setApp({ pendingPrompt: null });
      void send(autoPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt]);

  const patch = (id: number, p: Partial<Turn>) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));

  async function send(textArg?: string, opts: { visualCheck?: boolean } = {}) {
    const text = (textArg ?? input).trim();
    if (!text || running) return;
    setInput('');
    // Images: what the user is looking at (optional) + photos they attached (imported as media).
    const images: Blob[] = [];
    const notes: string[] = [];
    if (maxImages && (see || opts.visualCheck) && host.snapshot) {
      const snap = await host.snapshot();
      if (snap) { images.push(snap); notes.push(`[Image ${images.length}: ${host.snapshotLabel ?? 'current view'}]`); }
    }
    const att = attach;
    setAttach([]);
    for (const a of att) {
      if (images.length >= maxImages) break;
      images.push(a.blob);
      notes.push(`[Image ${images.length}: ${lang === 'fr' ? 'photo jointe par l’utilisateur, importée dans la médiathèque' : 'photo attached by the user, imported in the media library'} — media id ${a.m.id}, « ${a.m.name} », ${a.m.w ?? '?'}×${a.m.h ?? '?'} px]`);
    }
    const prompt = notes.length ? `${text}\n\n${notes.join('\n')}` : text;
    const history: Msg[] = turns
      .filter((t) => t.text.trim())
      .map((t) => ({ role: t.role, content: t.text }));
    const userTurn: Turn = { id: ++turnSeq, role: 'user', text, steps: [], images: images.length, attach: att.map((a) => a.m.id) };
    const session = host.session(mode);
    const aid = ++turnSeq;
    const aTurn: Turn = { id: aid, role: 'assistant', text: '', steps: [], status: 'thinking', mode, session };
    setTurns((ts) => [...ts.map((t) => (t.status === 'proposal' ? { ...t } : t)), userTurn, aTurn]);
    const ctl = new AbortController();
    useAgentRun.getState().set({ running: true, abort: () => ctl.abort() });
    const steps: Step[] = [];
    const res = await runAgent({
      rules: host.rules(),
      history,
      prompt,
      images,
      mode,
      tier,
      tools: session.tools,
      signal: ctl.signal,
      fr: lang === 'fr',
      source: host.kind === 'design' ? 'composer-design' : 'composer-video',
      cb: {
        onText: (t) => patch(aid, { text: splitNext(t).body, status: 'running' }),
        onStep: (s) => {
          const i = steps.findIndex((x) => x.id === s.id);
          if (i >= 0) steps[i] = s; else steps.push(s);
          patch(aid, { steps: [...steps], status: 'running' });
        },
      },
    });
    useAgentRun.getState().set({ running: false, abort: null });
    session.finish?.();
    const changed = session.changes.length > 0;
    let status: Status;
    if (res.code === 'cancelled') status = 'stopped';
    else if (res.error) status = 'error';
    else if (mode === 'assist' && changed) status = 'proposal';
    else if (mode === 'agent' && changed) status = 'done';
    else status = 'answer';
    if (status === 'stopped' && mode === 'assist' && changed) status = 'proposal';
    const { body, next } = splitNext(res.text);
    patch(aid, { text: body, next, status, error: res.error, steps: [...steps] });
    if (status === 'done' || status === 'proposal') notify({ kind: 'assistant', text: (lang === 'fr' ? (status === 'done' ? 'Assistant : ' + session.changes.length + ' modification(s) appliquée(s)' : 'Assistant : proposition prête à valider') : (status === 'done' ? 'Assistant: ' + session.changes.length + ' change(s) applied' : 'Assistant: proposal ready to review')), to: host.kind === 'design' ? 'design' : 'video' });
  }

  const modes: { id: AgentMode; label: string }[] = [
    { id: 'ask', label: 'Ask' }, { id: 'assist', label: 'Assist' }, { id: 'agent', label: 'Agent' },
  ];
  const modeDesc = {
    ask: T("Ask · lecture seule : j'explique et je conseille.", 'Ask · read-only: I explain and advise.'),
    assist: T('Assist · je travaille sur une copie, tu appliques ou refuses.', 'Assist · I work on a copy, you apply or refuse.'),
    agent: T("Agent · j'applique directement, tu peux m'arrêter à tout moment.", 'Agent · I apply directly, you can stop me at any time.'),
  }[mode];
  const tiers: { id: Tier; label: string }[] = [
    { id: 'quick', label: T('Rapide', 'Fast') }, { id: 'default', label: T('Équilibré', 'Balanced') }, { id: 'complex', label: T('Avancé', 'Advanced') },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {turns.length === 0 && (
          <>
            <div className="col" style={{ gap: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{T('Je peux créer ou modifier pour toi.', 'I can create or edit for you.')}</span>
              <span className="muted pretty" style={{ fontSize: 12 }}>{T('Décris le résultat voulu. Je travaille avec les mêmes outils que toi, et tout reste annulable.', 'Describe the result you want. I use the same tools you do, and everything can be undone.')}</span>
            </div>
            <div className="eyebrow" style={{ marginTop: 6 }}>{T('Suggestions', 'Suggestions')}</div>
            {host.suggestions.map((s) => (
              <button key={s} className="pretty" onClick={() => void send(s)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line2)', background: 'transparent', fontSize: 12 }}>{s}</button>
            ))}
          </>
        )}
        {turns.map((t, i) => (t.role === 'user'
          ? (
            <div key={t.id} className="col" style={{ alignSelf: 'flex-end', maxWidth: '88%', gap: 4, alignItems: 'flex-end' }}>
              {!!t.attach?.length && <div className="row" style={{ gap: 4 }}>{t.attach.map((id) => { const u = mediaUrlSync(id); return u ? <img key={id} src={u} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : null; })}</div>}
              <div style={{ background: 'var(--panel2)', border: '1px solid var(--line2)', borderRadius: '10px 10px 2px 10px', padding: '8px 10px', fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.text}</div>
              {!!t.images && <span className="faint row" style={{ fontSize: 10, gap: 4 }}><Eye size={10} />{t.images} {T('image(s) envoyée(s) à Claude', 'image(s) sent to Claude')}</span>}
            </div>
          )
          : <AssistantTurn key={t.id} t={t} last={i === turns.length - 1} onPatch={(p) => patch(t.id, p)} onContinue={() => void send(T('Continue.', 'Continue.'))}
              onNext={(q) => void send(q)} canLook={!!maxImages && !!host.snapshot}
              onLook={() => void send(T('Regarde l’image jointe du résultat et corrige les problèmes visibles : texte coupé ou qui déborde, éléments qui se chevauchent, contraste faible, alignements, cadres vides. Si tout est bon, dis-le simplement.', 'Look at the attached image of the result and fix visible problems: cut or overflowing text, overlapping elements, low contrast, alignment, empty frames. If everything is fine, just say so.'), { visualCheck: true })} />))}
      </div>
      <div style={{ borderTop: '1px solid var(--line)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}
        onDragOver={(e) => { if (maxImages) e.preventDefault(); }} onDrop={(e) => { if (!maxImages) return; e.preventDefault(); void onFiles(e.dataTransfer.files); }}>
        {attach.length > 0 && (
          <div className="row wrap" style={{ gap: 6 }}>
            {attach.map((a) => (
              <span key={a.m.id} style={{ position: 'relative' }}>
                <img src={mediaUrlSync(a.m.id) ?? ''} alt={a.m.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line2)' }} />
                <button className="btn icon" aria-label={T('Retirer', 'Remove')} onClick={() => setAttach((x) => x.filter((y) => y.m.id !== a.m.id))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, padding: 0 }}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
        <textarea
          id={`composer-${host.kind}`}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={3}
          placeholder={T('Décris ce que tu veux…', 'Describe what you want…')}
          style={{ resize: 'none' }}
        />
        <div className="row wrap" style={{ gap: 6 }}>
          <select className="input" value={tier} onChange={(e) => setApp({ tier: e.target.value as Tier })} style={{ height: 28, fontSize: 11, padding: '0 6px', width: 'auto' }} title={T('Modèle Claude', 'Claude model')}>
            {tiers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <div className="seg">
            {modes.map((m) => <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setApp({ agentMode: m.id })}>{m.label}</button>)}
          </div>
          {maxImages > 0 && host.snapshot && (
            <button className={'btn icon' + (see ? ' on-acc' : '')} aria-pressed={see} onClick={toggleSee}
              title={see ? T('Claude voit ton travail (une image est jointe à chaque demande)', 'Claude sees your work (an image is attached to each request)') : T('Claude ne voit pas ton travail', 'Claude does not see your work')}>{see ? <Eye size={13} /> : <EyeOff size={13} />}</button>
          )}
          {maxImages > 1 && (
            <>
              <button className="btn icon" onClick={() => fileRef.current?.click()} title={T('Joindre une photo (elle est aussi ajoutée à la médiathèque)', 'Attach a photo (also added to the media library)')}><Paperclip size={13} /></button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
            </>
          )}
          <div className="grow" />
          {running
            ? <button className="btn" onClick={() => useAgentRun.getState().abort?.()} title={T('Arrêter', 'Stop')}><Square size={12} />{T('Stop', 'Stop')}</button>
            : <button className="btn primary" onClick={() => void send()} title={T('Envoyer', 'Send')} style={{ height: 28, padding: '0 10px' }}><ArrowUp size={14} /></button>}
        </div>
        <div className="faint" style={{ fontSize: 11 }}>{modeDesc}</div>
      </div>
    </div>
  );
}

function AssistantTurn({ t, last, onPatch, onContinue, onNext, canLook, onLook }: { t: Turn; last: boolean; onPatch(p: Partial<Turn>): void; onContinue(): void; onNext(q: string): void; canLook: boolean; onLook(): void }) {
  const T = useT();
  const s = t.session;
  const writes = t.steps.filter((x) => x.write);
  const changes = s?.changes ?? [];
  const modeLabel = t.mode === 'assist' ? T('Mode Assist · sur une copie', 'Assist mode · on a copy') : t.mode === 'agent' ? T('Mode Agent · appliqué directement', 'Agent mode · applied directly') : T('Mode Ask · lecture seule', 'Ask mode · read-only');
  return (
    <div className="col" style={{ gap: 10 }}>
      {t.status === 'thinking' && <div className="row faint" style={{ fontSize: 12 }}><span className="pulse" />{T('Claude réfléchit…', 'Claude is thinking…')}</div>}
      {t.steps.length > 0 && (
        <div className="box col" style={{ padding: '10px 12px', gap: 7 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">{T('Plan exécuté', 'Executed plan')}</span><span className="faint" style={{ fontSize: 11 }}>{modeLabel}</span></div>
          {t.steps.map((st) => (
            <div key={st.id} className="row" style={{ gap: 8, fontSize: 11, alignItems: 'flex-start' }}>
              <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center', color: st.status === 'err' ? 'var(--warn)' : st.status === 'ok' ? 'var(--accTx)' : 'var(--tx3)', marginTop: 1 }}>
                {st.status === 'run' ? <LoaderCircle size={12} className="spin" /> : st.status === 'ok' ? <Check size={12} /> : <CircleAlert size={12} />}
              </span>
              <span className="grow col">
                <span className="mono ell" style={{ color: 'var(--tx2)' }}>{st.tool}<span className="faint">({st.args === '{}' ? '' : st.args})</span></span>
                {st.note && <span className="warn" style={{ fontSize: 11 }}>{st.note}</span>}
              </span>
              <span className="acc" style={{ whiteSpace: 'nowrap', fontSize: 10 }}>{T('Gratuit · local', 'Free · local')}</span>
            </div>
          ))}
        </div>
      )}
      {t.text && <div className="pretty" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.text}</div>}
      {t.status === 'error' && <div className="warn pretty" style={{ fontSize: 12 }}>{t.error}</div>}
      {t.status === 'proposal' && (
        <div className="col" style={{ border: '1px solid var(--accTx)', borderRadius: 10, padding: 12, gap: 8 }}>
          <span style={{ fontWeight: 600 }}>{T('Proposition prête', 'Proposal ready')} — {changes.length} {T('modification(s)', 'change(s)')}</span>
          {changes.slice(0, 12).map((c, i) => <div key={i} className="row muted" style={{ fontSize: 12, gap: 8, alignItems: 'flex-start' }}><span className="acc">+</span><span>{c}</span></div>)}
          {last && (
            <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
              <button className="btn primary" style={{ height: 28 }} onClick={() => { s?.apply?.(); onPatch({ status: 'applied' }); }}>{T('Appliquer', 'Apply')}</button>
              <button className="btn" style={{ height: 28 }} onClick={() => { s?.refuse?.(); onPatch({ status: 'refused' }); }}>{T('Refuser', 'Refuse')}</button>
            </div>
          )}
        </div>
      )}
      {(t.status === 'done' || t.status === 'applied' || t.status === 'reverted') && (
        <div className="col" style={{ background: 'var(--panel2)', borderRadius: 10, padding: 12, gap: 8 }}>
          <span style={{ fontWeight: 600 }}>
            {t.status === 'reverted' ? T("Modifications de l'assistant annulées en une action.", "Assistant's changes undone in one step.") : `${T('Terminé', 'Done')} — ${changes.length || writes.length} ${T('modification(s)', 'change(s)')}`}
          </span>
          {t.showChanges && changes.map((c, i) => <div key={i} className="row muted" style={{ fontSize: 12, gap: 8, alignItems: 'flex-start' }}><span className="acc">+</span><span>{c}</span></div>)}
          <div className="row wrap" style={{ gap: 6 }}>
            {t.status !== 'reverted'
              ? <button className="btn ghost" style={{ height: 28 }} onClick={() => { s?.undoAll?.(); onPatch({ status: 'reverted' }); }}>{T('Tout annuler', 'Undo all')}</button>
              : <button className="btn ghost" style={{ height: 28 }} onClick={() => { s?.redoAll?.(); onPatch({ status: 'done' }); }}>{T('Rétablir', 'Redo')}</button>}
            <button className="btn ghost" style={{ height: 28 }} onClick={() => onPatch({ showChanges: !t.showChanges })}>{t.showChanges ? T('Masquer', 'Hide') : T('Voir les changements', 'See changes')}</button>
            {last && <button className="btn ghost" style={{ height: 28 }} onClick={onContinue}>{T('Continuer', 'Continue')}</button>}
            {last && canLook && t.status === 'done' && <button className="btn ghost" style={{ height: 28 }} onClick={onLook} title={T('Claude regarde le résultat et corrige ce qui cloche', 'Claude looks at the result and fixes what is off')}><ScanEye size={12} />{T('Vérifier visuellement', 'Visual check')}</button>}
          </div>
        </div>
      )}
      {last && !!t.next?.length && !['thinking', 'running'].includes(t.status ?? '') && (
        <div className="row wrap" style={{ gap: 6 }}>
          {t.next.map((q) => <button key={q} className="chip wrap-text" style={{ fontSize: 11 }} onClick={() => onNext(q)}>{q}</button>)}
        </div>
      )}
      {t.status === 'refused' && <div className="muted" style={{ fontSize: 12 }}>{T("Proposition refusée. Rien n'a été modifié.", 'Proposal refused. Nothing was changed.')}</div>}
      {t.status === 'stopped' && <div className="muted" style={{ fontSize: 12 }}>{T('Arrêté — les modifications déjà faites sont conservées.', 'Stopped — changes already made are kept.')}</div>}
    </div>
  );
}
