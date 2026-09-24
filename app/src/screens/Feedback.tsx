import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Bug, Plus, Shield, Search, ChevronUp, MessageCircle, Pin, EyeOff, ArrowLeft, Bell, BellRing, Copy, Trophy, TrendingUp, Clock, LayoutList, CalendarCheck, Loader, CircleCheck, BadgeCheck, Target, Send } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { get, put } from '../lib/db';
import { uid, ago } from '../lib/util';
import { useIdentity } from '../lib/identity';
import { openComposerOn } from '../lib/comments';
import { notify } from '../lib/notify';

// Ideas & bugs board. Stored on this device; "Send to the team" posts a real claude.ai
// comment on the page, which the artifact's owner receives.

type Status = 'review' | 'planned' | 'progress' | 'done' | 'declined';
interface Reply { id: string; at: number; author: string; team: boolean; text: string; votes: number; voted?: boolean }
interface Item { id: string; at: number; type: 'idea' | 'bug'; title: string; body: string; cat: string; status: Status; votes: number; voted: boolean; follow: boolean; pinned?: boolean; hidden?: boolean; merged?: string; replies: Reply[]; author: string }

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function useFeedbackSeen() {
  const [seen, setSeen] = useState(true);
  useEffect(() => { void get<boolean>('kv', 'fbSeen').then((v) => setSeen(!!v)); }, []);
  return seen;
}

export function Feedback() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const toast = useApp((s) => s.notify);
  const composeReq = useApp((s) => s.pendingPrompt);
  const me = useIdentity((s) => s.name) || T('Toi', 'You');
  const isOwner = useIdentity((s) => s.isOwner);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<'all' | 'idea' | 'bug' | 'planned' | 'progress' | 'done'>('all');
  const [sort, setSort] = useState<'top' | 'trend' | 'comments' | 'recent'>('top');
  const [q, setQ] = useState('');
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ type: 'idea' as Item['type'], title: '', body: '', cat: 'design' });
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const [asTeam, setAsTeam] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void get<Item[]>('kv', 'feedback').then((v) => setItems(v ?? []));
    void put('kv', 'fbSeen', true);
    if (composeReq === '__feedback__') { setCompose(true); useApp.getState().set({ pendingPrompt: null }); }
  }, [composeReq]);
  const save = (v: Item[]) => { setItems(v); void put('kv', 'feedback', v); };
  const upd = (id: string, fn: (i: Item) => Item) => save(items.map((x) => (x.id === id ? fn(x) : x)));

  const ST: Record<Status, [string, string]> = { review: [T('À l’étude', 'Under review'), '#8E8E93'], planned: [T('Planifié', 'Planned'), '#5E5CE6'], progress: [T('En cours', 'In progress'), '#FF9F0A'], done: [T('Livré', 'Shipped'), '#30D158'], declined: [T('Refusé', 'Declined'), '#FF453A'] };
  const CATS: [string, string][] = [['chat', 'Studio Chat'], ['video', T('Éditeur vidéo', 'Video editor')], ['design', 'Design'], ['ai', T('Assistant IA', 'AI assistant')], ['publish', T('Publication', 'Publishing')], ['team', T('Équipe', 'Team')], ['other', T('Autre', 'Other')]];
  const catL = (k: string) => CATS.find((c) => c[0] === k)?.[1] ?? k;
  const visible = items.filter((i) => !i.merged && (admin || !i.hidden));
  const age = (t: number) => (Date.now() - t) / 86400_000;
  const score = (i: Item) => Math.round(i.votes + 3 * i.replies.length + Math.max(0, 40 - 2 * age(i.at)));
  let list = visible.filter((i) => tab === 'all' ? true : tab === 'idea' || tab === 'bug' ? i.type === tab : i.status === tab).filter((i) => !q || norm(i.title + ' ' + i.body).includes(norm(q)));
  const sorters = { top: (a: Item, b: Item) => b.votes - a.votes, trend: (a: Item, b: Item) => score(b) - score(a), comments: (a: Item, b: Item) => b.replies.length - a.replies.length, recent: (a: Item, b: Item) => b.at - a.at };
  list = list.slice().sort(sorters[sort]).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const count = (k: string) => visible.filter((i) => (k === 'all' ? true : k === 'idea' || k === 'bug' ? i.type === k : i.status === k)).length;
  const words = norm(draft.title).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const similar = useMemo(() => (words.length ? visible.map((i) => ({ i, n: words.filter((w) => norm(i.title).includes(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.i) : []), [draft.title, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = open ? items.find((i) => i.id === open) : undefined;
  const vote = (i: Item) => upd(i.id, (x) => ({ ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) }));

  const publish = () => {
    const t = draft.title.trim();
    if (t.length < 8) { setErr(T('Donne un titre d’au moins 8 caractères.', 'Give a title of at least 8 characters.')); return; }
    const it: Item = { id: uid('f'), at: Date.now(), type: draft.type, title: t, body: draft.body.trim(), cat: draft.cat, status: 'review', votes: 1, voted: true, follow: true, replies: [], author: me };
    save([it, ...items]);
    setCompose(false); setDraft({ type: 'idea', title: '', body: '', cat: 'design' }); setOpen(it.id); setSort('recent'); setTab('all');
    toast(T('Suggestion enregistrée. Envoie-la à l’équipe depuis sa fiche.', 'Suggestion saved. Send it to the team from its page.'));
  };
  const setStatus = (i: Item, s: Status) => {
    upd(i.id, (x) => ({ ...x, status: s }));
    if (i.follow && s !== i.status) notify({ kind: 'feedback', text: T(`« ${i.title} » est passé à ${ST[s][0]}`, `“${i.title}” is now ${ST[s][0]}`), to: 'feedback' });
  };
  const sendToTeam = async () => {
    if (!detailRef.current) return;
    const r = await openComposerOn(detailRef.current);
    if (r === 'opened') toast(T('Écris ton message dans la fenêtre de commentaire de claude.ai : il arrive directement à l’équipe.', 'Write your message in the claude.ai comment box: it goes straight to the team.'), 'info');
    else if (r === 'busy') toast(T('Un commentaire est déjà en cours dans claude.ai. Termine-le d’abord.', 'A comment is already open in claude.ai. Finish it first.'), 'info');
    else toast(T('L’envoi à l’équipe fonctionne quand l’app est ouverte dans claude.ai.', 'Sending to the team works when the app is open in claude.ai.'), 'err');
  };
  const tabBtn = (on: boolean): React.CSSProperties => ({ height: 30, padding: '0 12px', borderRadius: 9, border: 0, background: on ? 'var(--panel)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.2)' : 'none', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 });
  const typeChip = (i: Item) => i.type === 'bug' ? { l: 'Bug', c: '#FF453A', I: Bug } : { l: T('Idée', 'Idea'), c: '#B38F00', I: Lightbulb };

  return (
    <div className="page screen-in" style={{ maxWidth: 1200, gap: 18 }}>
      <div className="page-head">
        <div className="t">
          <span className="badge-ic" style={{ background: '#FFD60A' }}><Lightbulb size={19} color="#111113" /></span>
          <h1 className="h1">{T('Idées & bugs', 'Ideas & bugs')}</h1>
          <p>{T('Propose une fonctionnalité, signale un bug, vote pour ce qui compte. Envoie ensuite ta suggestion à l’équipe en un clic.', 'Suggest a feature, report a bug, vote for what matters. Then send it to the team in one click.')}</p>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {isOwner && <button onClick={() => setAdmin(!admin)} className="btn" style={{ height: 36, borderRadius: 999, border: `1px solid ${admin ? '#FF453A' : 'var(--line2)'}`, background: admin ? 'color-mix(in oklab, #FF453A 12%, transparent)' : 'transparent', color: admin ? '#FF453A' : 'var(--tx2)' }}><Shield size={13} />{T('Vue admin', 'Admin view')}</button>}
          <button className="btn primary lg" onClick={() => { setCompose(true); setOpen(null); setErr(''); }}><Plus size={14} />{T('Nouvelle suggestion', 'New suggestion')}</button>
        </div>
      </div>

      {compose && (
        <div className="card col" style={{ padding: 18, gap: 12 }}>
          <div className="row" style={{ gap: 6 }}>
            {([['idea', Lightbulb, '#B38F00', T('Idée', 'Idea')], ['bug', Bug, '#FF453A', 'Bug']] as const).map(([k, I, c, l]) => (
              <button key={k} onClick={() => setDraft({ ...draft, type: k })} className="row" style={{ height: 32, padding: '0 14px', borderRadius: 16, border: `1px solid ${draft.type === k ? 'var(--acc)' : 'var(--line2)'}`, background: draft.type === k ? 'var(--accSoft)' : 'transparent', fontSize: 13, gap: 6 }}><I size={13} color={c} />{l}</button>
            ))}
          </div>
          <input id="fb-title" className="input lg" value={draft.title} onChange={(e) => { setDraft({ ...draft, title: e.target.value }); setErr(''); }} placeholder={draft.type === 'bug' ? T('Résume le problème en une phrase', 'Summarize the problem in one line') : T('Quelle fonctionnalité veux-tu ?', 'What feature do you want?')} style={{ height: 42, fontSize: 15, fontWeight: 600 }} />
          {similar.length > 0 && (
            <div className="col" style={{ borderRadius: 12, background: 'color-mix(in oklab, #FFD60A 12%, var(--panel2))', padding: '10px 12px', gap: 6 }}>
              <span className="muted" style={{ fontSize: 12 }}>{T('Ça ressemble peut-être à :', 'This might already exist:')}</span>
              {similar.map((i) => (
                <div key={i.id} className="row" style={{ gap: 10 }}>
                  <span className="mono muted" style={{ fontSize: 12, minWidth: 36 }}>▲ {i.votes}</span>
                  <button className="grow" onClick={() => { setOpen(i.id); setCompose(false); }} style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontSize: 13 }}>{i.title}</button>
                  <button className="btn primary sm" disabled={i.voted} onClick={() => vote(i)}>{i.voted ? T('Voté', 'Voted') : T('Voter', 'Vote')}</button>
                </div>
              ))}
            </div>
          )}
          <textarea id="fb-body" className="input" rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder={draft.type === 'bug' ? T('Étapes pour reproduire, ce qui se passe, ce qui devrait se passer, navigateur et appareil', 'Steps to reproduce, what happens, what should happen, browser and device') : T('Explique ton besoin et comment tu l’utiliserais', 'Explain your need and how you would use it')} style={{ fontSize: 13 }} />
          <div className="row wrap" style={{ gap: 6 }}><span className="muted" style={{ fontSize: 12, marginRight: 4 }}>{T('Catégorie', 'Category')}</span>{CATS.map(([k, l]) => <button key={k} className={'chip' + (draft.cat === k ? ' on' : '')} style={{ borderRadius: 14 }} onClick={() => setDraft({ ...draft, cat: k })}>{l}</button>)}</div>
          {err && <span className="warn" style={{ fontSize: 12 }}>{err}</span>}
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn lg" style={{ borderRadius: 999 }} onClick={() => { setCompose(false); setErr(''); }}>{T('Annuler', 'Cancel')}</button>
            <button className="btn primary lg" onClick={publish}>{T('Publier', 'Publish')}</button>
          </div>
        </div>
      )}

      {!cur && (
        <>
          <div className="row wrap" style={{ gap: 10 }}>
            <div className="row wrap" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2 }}>
              {([['all', LayoutList, T('Tout', 'All')], ['idea', Lightbulb, T('Idées', 'Ideas')], ['bug', Bug, 'Bugs'], ['planned', CalendarCheck, T('Planifié', 'Planned')], ['progress', Loader, T('En cours', 'In progress')], ['done', CircleCheck, T('Livré', 'Shipped')]] as const).map(([k, I, l]) => (
                <button key={k} onClick={() => setTab(k)} style={tabBtn(tab === k)}><I size={13} />{l}<span className="mono faint" style={{ fontSize: 10 }}>{count(k)}</span></button>
              ))}
            </div>
            <div className="grow" />
            <div className="row" style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: 11, color: 'var(--tx3)' }} /><input id="fb-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('Rechercher', 'Search')} style={{ height: 36, width: 240, paddingLeft: 34, borderRadius: 999 }} /></div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12, marginRight: 4 }}>{T('Trier par', 'Sort by')}</span>
            {([['top', Trophy, T('Les plus votées', 'Most voted')], ['trend', TrendingUp, T('Tendance', 'Trending')], ['comments', MessageCircle, T('Les plus commentées', 'Most discussed')], ['recent', Clock, T('Récentes', 'Recent')]] as const).map(([k, I, l]) => (
              <button key={k} onClick={() => setSort(k)} className="row" style={{ height: 28, padding: '0 12px', borderRadius: 14, border: 0, background: sort === k ? 'var(--accSoft)' : 'var(--panel2)', color: sort === k ? 'var(--accTx)' : 'var(--tx2)', fontSize: 12, gap: 5 }}><I size={12} />{l}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: admin && window.innerWidth > 1100 ? 'minmax(0,1fr) 300px' : 'minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
            <div className="col" style={{ gap: 10, minWidth: 0 }}>
              {list.map((i) => {
                const ty = typeChip(i);
                return (
                  <div key={i.id} className="row" style={{ gap: 14, alignItems: 'flex-start', padding: 14, borderRadius: 18, border: `1px solid ${i.pinned ? 'color-mix(in oklab, #0A84FF 45%, var(--line))' : 'var(--line)'}`, background: 'var(--panel)', opacity: i.hidden ? 0.55 : 1 }}>
                    <button onClick={() => vote(i)} className="col" style={{ flex: 'none', width: 54, height: 62, borderRadius: 16, border: `1px solid ${i.voted ? 'var(--acc)' : 'transparent'}`, background: i.voted ? 'var(--acc)' : 'var(--panel2)', color: i.voted ? '#fff' : 'var(--tx)', alignItems: 'center', justifyContent: 'center', gap: 2 }}><ChevronUp size={18} /><span style={{ fontSize: 15, fontWeight: 700 }}>{i.votes}</span></button>
                    <button onClick={() => setOpen(i.id)} className="col grow" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', gap: 8, minWidth: 0 }}>
                      <div className="row wrap" style={{ gap: 6 }}>
                        <span className="row" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: `color-mix(in oklab, ${ty.c} 16%, transparent)`, color: ty.c, fontSize: 11, fontWeight: 600, gap: 4 }}><ty.I size={11} />{ty.l}</span>
                        <span className="row" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: `color-mix(in oklab, ${ST[i.status][1]} 16%, transparent)`, color: ST[i.status][1], fontSize: 11, fontWeight: 600 }}>{ST[i.status][0]}</span>
                        <span className="row muted" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: 'var(--panel2)', fontSize: 11 }}>{catL(i.cat)}</span>
                        {i.pinned && <Pin size={13} color="#0A84FF" />}
                        {i.hidden && <span className="pill warn">{T('Masqué', 'Hidden')}</span>}
                      </div>
                      <span className="pretty" style={{ fontSize: 15, fontWeight: 600 }}>{i.title}</span>
                      {i.body && <span className="muted" style={{ fontSize: 13, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{i.body}</span>}
                      <span className="row faint wrap" style={{ gap: 14, fontSize: 12 }}><span className="row" style={{ gap: 5 }}><MessageCircle size={12} />{i.replies.length}</span><span>{T('par ', 'by ')}{i.author} · {ago(i.at, lang)}</span>{i.replies.some((r) => r.team) && <span className="row acc" style={{ gap: 4 }}><BadgeCheck size={12} />{T('Réponse de l’équipe', 'Team replied')}</span>}</span>
                    </button>
                  </div>
                );
              })}
              {!list.length && <div className="faint pretty" style={{ padding: 50, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 18 }}>{items.length ? T('Aucune suggestion ne correspond.', 'No matching suggestion.') : T('Rien ici pour l’instant. Propose la première idée ou signale un bug.', 'Nothing here yet. Suggest the first idea or report a bug.')}</div>}
            </div>
            {admin && window.innerWidth > 1100 && (
              <div className="card col" style={{ padding: 16, gap: 10, position: 'sticky', top: 16 }}>
                <span className="row" style={{ gap: 8, fontWeight: 600 }}><Target size={15} color="#FF453A" />{T('Priorités', 'Priorities')}</span>
                <span className="faint pretty" style={{ fontSize: 11 }}>{T('Score = votes + 3 × réponses + bonus de récence.', 'Score = votes + 3 × replies + recency bonus.')}</span>
                {visible.filter((i) => !['done', 'declined'].includes(i.status)).sort((a, b) => score(b) - score(a)).slice(0, 6).map((i, k) => (
                  <button key={i.id} onClick={() => setOpen(i.id)} className="row" style={{ gap: 10, padding: 8, border: 0, borderRadius: 10, background: 'var(--panel2)', textAlign: 'left' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 11, background: ['#FFD60A', '#FF9F0A', '#FF9F0A'][k] ?? '#AEAEB2', color: '#111113', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{k + 1}</span>
                    <span className="col grow"><span className="ell" style={{ fontSize: 12, fontWeight: 500 }}>{i.title}</span><span className="faint" style={{ fontSize: 11 }}>{ST[i.status][0]} · {i.votes} ▲ · {i.replies.length} {T('rép.', 'repl.')}</span></span>
                    <span className="mono muted" style={{ fontSize: 11 }}>{score(i)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {cur && (
        <div className="col" style={{ gap: 14 }}>
          <button onClick={() => setOpen(null)} className="row acc" style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', padding: 0, fontSize: 13, gap: 6 }}><ArrowLeft size={14} />{T('Toutes les suggestions', 'All suggestions')}</button>
          <div ref={detailRef} className="row" style={{ gap: 18, alignItems: 'flex-start', padding: 20, borderRadius: 18, border: '1px solid var(--line)', background: 'var(--panel)' }}>
            <button onClick={() => vote(cur)} className="col" style={{ flex: 'none', width: 64, height: 72, borderRadius: 16, border: 0, background: cur.voted ? 'var(--acc)' : 'var(--panel2)', color: cur.voted ? '#fff' : 'var(--tx)', alignItems: 'center', justifyContent: 'center' }}><ChevronUp size={20} /><span style={{ fontSize: 17, fontWeight: 700 }}>{cur.votes}</span></button>
            <div className="col grow" style={{ gap: 10, minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 6 }}>
                {(() => { const ty = typeChip(cur); return <span className="row" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: `color-mix(in oklab, ${ty.c} 16%, transparent)`, color: ty.c, fontSize: 11, fontWeight: 600, gap: 4 }}><ty.I size={11} />{ty.l}</span>; })()}
                <span className="row" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: `color-mix(in oklab, ${ST[cur.status][1]} 16%, transparent)`, color: ST[cur.status][1], fontSize: 11, fontWeight: 600 }}>{ST[cur.status][0]}</span>
                <span className="row muted" style={{ height: 22, padding: '0 8px', borderRadius: 11, background: 'var(--panel2)', fontSize: 11 }}>{catL(cur.cat)}</span>
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>{cur.title}</h2>
              <span className="faint" style={{ fontSize: 12 }}>{T('par ', 'by ')}{cur.author} · {ago(cur.at, lang)}</span>
              {cur.body && <p className="muted pretty" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{cur.body}</p>}
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn primary" style={{ height: 32 }} onClick={() => void sendToTeam()}><Send size={13} />{T('Envoyer à l’équipe', 'Send to the team')}</button>
                <button className="btn" style={{ height: 32, color: cur.follow ? 'var(--accTx)' : undefined }} onClick={() => upd(cur.id, (x) => ({ ...x, follow: !x.follow }))}>{cur.follow ? <BellRing size={13} /> : <Bell size={13} />}{cur.follow ? T('Suivi', 'Following') : T('Suivre', 'Follow')}</button>
                <button className="btn" style={{ height: 32 }} onClick={async () => { try { await navigator.clipboard.writeText(`${cur.title}\n\n${cur.body}`); toast(T('Texte copié.', 'Text copied.')); } catch { toast(T('Copie impossible ici.', 'Copy not possible here.'), 'err'); } }}><Copy size={13} />{T('Copier le texte', 'Copy text')}</button>
              </div>
            </div>
          </div>
          {admin && (
            <div className="col" style={{ borderRadius: 18, padding: 16, border: '1px solid color-mix(in oklab, #FF453A 35%, var(--line))', background: 'color-mix(in oklab, #FF453A 6%, var(--panel))', gap: 12 }}>
              <span className="row" style={{ gap: 8, fontWeight: 600, fontSize: 13 }}><Shield size={14} color="#FF453A" />{T('Outils admin', 'Admin tools')}</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {(Object.keys(ST) as Status[]).map((k) => <button key={k} onClick={() => setStatus(cur, k)} className="row" style={{ height: 30, padding: '0 12px', borderRadius: 15, border: `1px solid ${cur.status === k ? ST[k][1] : 'var(--line2)'}`, background: cur.status === k ? `color-mix(in oklab, ${ST[k][1]} 16%, transparent)` : 'transparent', fontSize: 12, gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: ST[k][1] }} />{ST[k][0]}</button>)}
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn" style={{ height: 32 }} onClick={() => upd(cur.id, (x) => ({ ...x, pinned: !x.pinned }))}><Pin size={13} />{cur.pinned ? T('Désépingler', 'Unpin') : T('Épingler', 'Pin')}</button>
                <button className="btn" style={{ height: 32 }} onClick={() => upd(cur.id, (x) => ({ ...x, hidden: !x.hidden }))}><EyeOff size={13} />{cur.hidden ? T('Rendre visible', 'Unhide') : T('Masquer', 'Hide')}</button>
                {visible.filter((o) => o.id !== cur.id).sort((a, b) => b.votes - a.votes).slice(0, 3).map((o) => (
                  <button key={o.id} className="chip" style={{ borderStyle: 'dashed', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => { save(items.map((x) => x.id === o.id ? { ...x, votes: x.votes + cur.votes, replies: [...x.replies, ...cur.replies] } : x.id === cur.id ? { ...x, merged: o.id } : x)); setOpen(o.id); toast(T('Fusionné : votes et réponses regroupés.', 'Merged: votes and replies combined.')); }}>{T('Fusionner dans → ', 'Merge into → ')}{o.title}</button>
                ))}
              </div>
            </div>
          )}
          <span style={{ fontSize: 15, fontWeight: 600 }}>{cur.replies.length} {T('réponse(s)', 'repl(ies)')}</span>
          {cur.replies.map((r) => (
            <div key={r.id} className="row" style={{ gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 18, border: `1px solid ${r.team ? 'color-mix(in oklab, #0A84FF 40%, var(--line))' : 'var(--line)'}`, background: r.team ? 'color-mix(in oklab, #0A84FF 6%, var(--panel))' : 'var(--panel)' }}>
              <span style={{ width: 32, height: 32, borderRadius: 16, background: r.team ? 'linear-gradient(145deg,#0A84FF,#BF5AF2)' : '#FF9F0A', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{r.team ? 'M' : r.author.slice(0, 2).toUpperCase()}</span>
              <div className="col grow" style={{ gap: 6 }}>
                <span className="row wrap" style={{ gap: 8, fontSize: 12 }}><b style={{ fontSize: 13 }}>{r.author}</b>{r.team && <span className="row" style={{ height: 20, padding: '0 7px', borderRadius: 10, background: 'var(--acc)', color: '#fff', fontSize: 10, fontWeight: 600, gap: 3 }}><BadgeCheck size={10} />{T('Équipe', 'Team')}</span>}<span className="faint">{ago(r.at, lang)}</span></span>
                <p className="pretty" style={{ margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{r.text}</p>
              </div>
            </div>
          ))}
          <div className="card col" style={{ padding: 14, gap: 10 }}>
            <textarea id="fb-reply" className="input" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={T('Ajoute un détail, un cas d’usage, une capture…', 'Add a detail, a use case, a screenshot…')} />
            <div className="row" style={{ gap: 10 }}>
              {admin && <label className="row muted" style={{ gap: 8, fontSize: 12, cursor: 'pointer' }}><input type="checkbox" checked={asTeam} onChange={(e) => setAsTeam(e.target.checked)} />{T('Répondre au nom de l’équipe', 'Reply as the team')}</label>}
              <div className="grow" />
              <button className="btn primary lg" disabled={!reply.trim()} onClick={() => { upd(cur.id, (x) => ({ ...x, replies: [...x.replies, { id: uid('r'), at: Date.now(), author: admin && asTeam ? T('Équipe Montaj', 'Montaj team') : me, team: admin && asTeam, text: reply.trim(), votes: 0 }] })); setReply(''); }}>{T('Répondre', 'Reply')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
