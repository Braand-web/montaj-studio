import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, SquarePen, PanelLeftClose, PanelLeftOpen, PanelRight, ArrowUp, Square, Megaphone, Image as ImageIcon, Clapperboard, Smartphone, Presentation, FileText, Type, Check, CircleAlert, LoaderCircle, Trash2, LayoutGrid, MessageSquare, AtSign } from 'lucide-react';
import { useApp, useT, type Tier } from '../store/app';
import { get, put } from '../lib/db';
import { runAgent, type AgentTool, type Step, str, num } from '../agent/runner';
import { designTools, type DataTarget } from '../agent/designTools';
import { videoTools } from '../agent/videoTools';
import { createDoc, saveDoc, getDoc } from '../lib/docs';
import { FORMATS, fmt } from '../model/formats';
import { TEMPLATES } from '../model/templates';
import type { DesignData, Doc, VideoData } from '../model/types';
import { emptyVideo } from '../lib/create';
import { pageThumb } from '../design/render';
import { PageView } from '../design/ElementView';
import { useImages } from '../design/LeftPanel';
import { useDocs } from '../ui/Shell';
import { notify } from '../lib/notify';
import { LogoMark } from '../ui/kit';
import { uid } from '../lib/util';
import type { Msg } from '../lib/claude';

// Studio Chat: a full-page conversation where Claude creates real documents (designs from
// formats or templates, video projects with titles and captions) with the editors' tools.

type Kind = 'auto' | 'design' | 'video' | 'text';
interface Card { docId: string; kind: 'design' | 'video'; name: string }
interface ChatMsg { id: string; role: 'user' | 'assistant'; text: string; steps?: Step[]; cards?: Card[]; status?: 'thinking' | 'running' | 'done' | 'error' | 'stopped'; error?: string }
interface Thread { id: string; title: string; at: number; msgs: ChatMsg[] }

const RATIOS = ['auto', '9:16', '4:5', '1:1', '16:9'] as const;

export function StudioChat() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const tier = useApp((s) => s.tier);
  const set = useApp((s) => s.set);
  const go = useApp((s) => s.go);
  const brand = useApp((s) => s.brand);
  const media = useImages();
  const docs = useDocs();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [kind, setKind] = useState<Kind>('auto');
  const [ratio, setRatio] = useState<(typeof RATIOS)[number]>('auto');
  const [rail, setRail] = useState(() => window.innerWidth > 900);
  const [side, setSide] = useState(() => window.innerWidth > 1200);
  const [sideTab, setSideTab] = useState<'jobs' | 'els'>('jobs');
  const [view, setView] = useState<'feed' | 'gallery'>('feed');
  const [running, setRunning] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { void get<Thread[]>('kv', 'chats').then((t) => { if (t?.length) { setThreads(t); setActive(t[0].id); } }); }, []);
  const persist = (ts: Thread[]) => { setThreads(ts); void put('kv', 'chats', ts.slice(0, 50)); };
  const thread = threads.find((t) => t.id === active) ?? null;
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [thread?.msgs.length, thread?.msgs[thread?.msgs.length - 1]?.text, thread?.msgs[thread?.msgs.length - 1]?.steps?.length]);

  const allCards = useMemo(() => threads.flatMap((t) => t.msgs.flatMap((m) => m.cards ?? [])), [threads]);
  const allSteps = useMemo(() => threads.flatMap((t) => t.msgs.flatMap((m) => (m.steps ?? []).map((s) => ({ ...s, thread: t.title })))).slice(-30).reverse(), [threads]);

  const recipes = [
    { icon: Megaphone, c: '#FF375F', label: T('Affiche d’événement', 'Event poster'), sub: T('Format A3, titre, date, lieu, couleurs de ta marque', 'A3, headline, date, venue, your brand colors'), prompt: T('Crée une affiche A3 pour la soirée de lancement de ma boutique samedi à 18 h, avec mes couleurs de marque.', 'Create an A3 poster for my shop launch party on Saturday at 6 pm, in my brand colors.'), kind: 'design' as Kind },
    { icon: ImageIcon, c: '#FF9F0A', label: T('Miniature YouTube', 'YouTube thumbnail'), sub: T('Titre percutant, bandeau, contraste vérifié', 'Punchy title, band, checked contrast'), prompt: T('Fais une miniature YouTube 1280×720 pour une vidéo « J’ai testé ce téléphone pendant 30 jours ».', 'Make a 1280×720 YouTube thumbnail for a video “I tested this phone for 30 days”.'), kind: 'design' as Kind },
    { icon: Smartphone, c: '#BF5AF2', label: T('Story promo', 'Promo story'), sub: T('9:16, accroche, bouton d’appel à l’action', '9:16, hook, call-to-action button'), prompt: T('Crée une story 9:16 pour une promo −20 % cette semaine, avec un bouton « Lien en bio ».', 'Create a 9:16 story for a 20% off promo this week, with a “Link in bio” button.'), kind: 'design' as Kind },
    { icon: Presentation, c: '#0A84FF', label: T('Présentation', 'Presentation'), sub: T('3 à 5 diapositives avec un graphique', '3 to 5 slides with a chart'), prompt: T('Fais une présentation de 4 diapositives sur le bilan du trimestre, avec un graphique des ventes.', 'Make a 4-slide presentation on the quarter review, with a sales chart.'), kind: 'design' as Kind },
    { icon: Clapperboard, c: '#64D2FF', label: T('Projet vidéo TikTok', 'TikTok video project'), sub: T('9:16, titres animés et sous-titres depuis ton script', '9:16, animated titles and captions from your script'), prompt: T('Prépare un projet TikTok de 20 s avec un titre d’accroche et des sous-titres pour ce script : « Trois astuces pour économiser la batterie de ton téléphone. »', 'Set up a 20 s TikTok project with a hook title and captions for this script: “Three tips to save your phone battery.”'), kind: 'video' as Kind },
    { icon: FileText, c: '#30D158', label: T('Légendes réseaux', 'Social captions'), sub: T('Texte prêt à publier, au ton de ta marque', 'Ready-to-post copy in your brand voice'), prompt: T('Écris 3 légendes Instagram pour annoncer ma nouvelle collection, avec des hashtags.', 'Write 3 Instagram captions announcing my new collection, with hashtags.'), kind: 'text' as Kind },
  ];

  const newThread = () => { setActive(null); setInput(''); setView('feed'); inputRef.current?.focus(); };

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || running) return;
    setInput('');
    let ts = threads;
    let th = thread;
    if (!th) {
      th = { id: uid('t'), title: text.slice(0, 60), at: Date.now(), msgs: [] };
      ts = [th, ...ts];
      setActive(th.id);
    }
    const history: Msg[] = th.msgs.filter((m) => m.text.trim()).map((m) => ({ role: m.role, content: m.text + (m.cards?.length ? `\n[documents créés : ${m.cards.map((c) => `${c.name} (${c.docId})`).join(', ')}]` : '') }));
    const u: ChatMsg = { id: uid('m'), role: 'user', text };
    const a: ChatMsg = { id: uid('m'), role: 'assistant', text: '', steps: [], cards: [], status: 'thinking' };
    const tid = th.id;
    th = { ...th, at: Date.now(), msgs: [...th.msgs, u, a] };
    ts = [th, ...ts.filter((x) => x.id !== tid)];
    persist(ts);
    const patchA = (p: Partial<ChatMsg>) => setThreads((cur) => {
      const next = cur.map((x) => (x.id === tid ? { ...x, msgs: x.msgs.map((m) => (m.id === a.id ? { ...m, ...p } : m)) } : x));
      void put('kv', 'chats', next.slice(0, 50));
      return next;
    });

    // Documents created during this run, edited in memory, saved as they change.
    const created = new Map<string, Doc>();
    const cards: Card[] = [];
    let activeDesign: string | null = null;
    let activeVideo: string | null = null;
    const dirty = new Set<string>();
    const flush = async () => {
      for (const id of dirty) {
        const d = created.get(id);
        if (!d) continue;
        if (d.kind === 'design') d.thumb = await pageThumb((d.data as DesignData).pages[0]);
        await saveDoc(d);
      }
      dirty.clear();
    };
    const designTarget: DataTarget<DesignData> = {
      read: () => { if (!activeDesign) throw new Error('Call create_design first.'); return created.get(activeDesign)!.data as DesignData; },
      write: (fn) => {
        if (!activeDesign) throw new Error('Call create_design first.');
        const d = created.get(activeDesign)!;
        const next = JSON.parse(JSON.stringify(d.data)) as DesignData;
        fn(next);
        d.data = next;
        dirty.add(d.id);
      },
      changed: new Set(), changes: [],
    };
    const videoTarget: DataTarget<VideoData> = {
      read: () => { if (!activeVideo) throw new Error('Call create_video first.'); return created.get(activeVideo)!.data as VideoData; },
      write: (fn) => {
        if (!activeVideo) throw new Error('Call create_video first.');
        const d = created.get(activeVideo)!;
        const next = JSON.parse(JSON.stringify(d.data)) as VideoData;
        fn(next);
        d.data = next;
        dirty.add(d.id);
      },
      changed: new Set(), changes: [],
    };
    const addCard = (d: Doc) => { cards.push({ docId: d.id, kind: d.kind, name: d.name }); patchA({ cards: [...cards] }); };
    const openExisting = async (id: string) => {
      const d = created.get(id) ?? (await getDoc(id));
      if (!d) throw new Error('Unknown document id');
      created.set(d.id, d as Doc);
      if (d.kind === 'design') activeDesign = d.id; else activeVideo = d.id;
      if (!cards.some((c) => c.docId === d.id)) addCard(d as Doc);
      return d;
    };
    const tools: AgentTool[] = [
      {
        name: 'list_formats', write: false,
        description: 'Lists the available formats (id, label, size, design or video).',
        run: () => FORMATS.map((f) => ({ id: f.id, label: f.en, w: f.w, h: f.h, kind: f.kind })),
      },
      {
        name: 'list_templates', write: false,
        description: 'Lists starter design templates (id, name, format, page count). Use create_design with template to start from one, then update its texts and colors.',
        run: () => TEMPLATES.filter((t) => !t.video).map((t) => ({ id: t.id, name: t.en, format: t.formatId, pages: t.build().pages.length })),
      },
      {
        name: 'create_design', write: true,
        description: 'Creates a new design document and makes it the active one for add_element / update_element / get_document. Give a format id (see list_formats) or w and h, or a template id. Returns its id and page size.',
        schema: { title: { type: 'string' }, format: { type: 'string' }, template: { type: 'string' }, w: { type: 'number' }, h: { type: 'number' }, bg: { type: 'string' } },
        required: ['title'],
        run: async (x) => {
          const tpl = TEMPLATES.find((t) => t.id === str(x.template));
          const f = FORMATS.find((q) => q.id === str(x.format) && q.kind === 'design');
          const w = f?.w ?? num(x.w) ?? 1080, h = f?.h ?? num(x.h) ?? 1350;
          const data: DesignData = tpl ? tpl.build() : { pages: [{ id: uid('p'), w, h, bg: /^#[0-9a-f]{6}$/i.test(str(x.bg) ?? '') ? str(x.bg)! : '#FFFFFF', els: [] }] };
          const d = await createDoc('design', str(x.title) ?? 'Design', f?.dims ?? `${data.pages[0].w}×${data.pages[0].h}`, data);
          created.set(d.id, d as Doc);
          activeDesign = d.id;
          addCard(d as Doc);
          return { id: d.id, pages: data.pages.map((p, i) => ({ page: i + 1, w: p.w, h: p.h })) };
        },
      },
      {
        name: 'create_video', write: true,
        description: 'Creates a new video project and makes it active for the video tools (add_title, set_captions, add_media_clip, set_format…). format: v-tiktok, v-reels, v-shorts (1080x1920), v-youtube (1920x1080), v-square.',
        schema: { title: { type: 'string' }, format: { type: 'string' } }, required: ['title'],
        run: async (x) => {
          const f = FORMATS.find((q) => q.id === str(x.format) && q.kind === 'video') ?? fmt('v-tiktok');
          const d = await createDoc('video', str(x.title) ?? 'Vidéo', f.dims, emptyVideo(f.w, f.h));
          created.set(d.id, d as Doc);
          activeVideo = d.id;
          addCard(d as Doc);
          return { id: d.id, w: f.w, h: f.h };
        },
      },
      {
        name: 'list_documents', write: false,
        description: "Lists the user's existing documents (id, name, kind, format).",
        run: () => docs.filter((d) => !d.trashedAt).slice(0, 40).map((d) => ({ id: d.id, name: d.name, kind: d.kind, format: d.format })),
      },
      {
        name: 'open_document', write: true,
        description: 'Makes an existing document (from list_documents) the active one so the design or video tools edit it.',
        schema: { id: { type: 'string' } }, required: ['id'],
        run: async (x) => { const d = await openExisting(str(x.id)!); return { id: d.id, kind: d.kind, name: d.name }; },
      },
      ...designTools(designTarget, { brand, media: () => media }),
      ...videoTools(videoTarget, { media: () => media, playhead: () => 0 }).filter((t) => t.name !== 'list_media'),
    ];
    const kindLine = kind === 'design' ? 'The user wants a DESIGN (image) document.' : kind === 'video' ? 'The user wants a VIDEO project.' : kind === 'text' ? 'The user wants TEXT only: answer in the chat, do not create documents.' : 'Pick what fits: a design, a video project, or a text answer.';
    const rules = [
      'You are Studio Chat inside Montaj Studio, a free, local-first design and video suite. You create real documents with the tools; they open in the editors.',
      `Reply in ${lang === 'fr' ? 'French (tutoiement)' : 'English'}. Keep replies short: what you made and what the user can do next.`,
      'For a design: create_design (a format or a template), then add_element / update_element to build a clean layout: big readable headline, supporting text, shapes for structure, contrast at least 4.5:1 (check_design). Coordinates are page pixels, origin top-left.',
      'For a video: create_video, then add_title and set_captions. You cannot see or hear media; place user media only if they ask and it exists in list_media.',
      'You cannot generate photos, illustrations, video footage or voices: leave empty photo frames the user can fill, and say so in one line if they asked for generated imagery.',
      `Preferred ratio: ${ratio}. ${kindLine}`,
      `Brand kit "${brand.name}": colors ${brand.colors.join(', ')}; heading font ${brand.fonts.heading}; body font ${brand.fonts.body}; voice: ${brand.tone}`,
    ].join('\n');
    const c = new AbortController();
    ctl.current = c;
    setRunning(true);
    const steps: Step[] = [];
    const wrapped = tools.map((t) => ({ ...t, run: (x: Record<string, unknown>) => { const r = t.run(x); if (r instanceof Promise) return r.then(async (v) => { await flush(); return v; }); void flush(); return r; } }));
    const res = await runAgent({
      rules, history, prompt: text, mode: kind === 'text' ? 'ask' : 'agent', tier, tools: wrapped, signal: c.signal, fr: lang === 'fr', source: 'studio-chat',
      cb: {
        onText: (t) => patchA({ text: t, status: 'running' }),
        onStep: (s) => { const i = steps.findIndex((x) => x.id === s.id); if (i >= 0) steps[i] = s; else steps.push(s); patchA({ steps: [...steps], status: 'running' }); },
      },
    });
    await flush();
    setRunning(false);
    ctl.current = null;
    patchA({ text: res.text, status: res.code === 'cancelled' ? 'stopped' : res.error ? 'error' : 'done', error: res.error, steps: [...steps], cards: [...cards] });
    if (cards.length) notify({ kind: 'chat', text: T(`Studio Chat a créé ${cards.length} document(s) : ${cards.map((x) => x.name).join(', ')}`, `Studio Chat created ${cards.length} document(s): ${cards.map((x) => x.name).join(', ')}`), to: 'chat' });
  }

  const del = (id: string) => { const ts = threads.filter((t) => t.id !== id); persist(ts); if (active === id) setActive(ts[0]?.id ?? null); };
  const cols = `${rail ? '260px ' : ''}minmax(0,1fr)${side ? ' 300px' : ''}`;
  const tiers: { id: Tier; l: string }[] = [{ id: 'quick', l: T('Rapide', 'Fast') }, { id: 'default', l: T('Équilibré', 'Balanced') }, { id: 'complex', l: T('Avancé', 'Advanced') }];
  const kinds: { id: Kind; l: string; I: typeof Type }[] = [{ id: 'auto', l: 'Auto', I: Sparkles }, { id: 'design', l: 'Design', I: ImageIcon }, { id: 'video', l: T('Vidéo', 'Video'), I: Clapperboard }, { id: 'text', l: T('Texte', 'Text'), I: Type }];

  return (
    <div className="screen-in" style={{ display: 'grid', gridTemplateColumns: cols, height: '100%', minHeight: 0, background: 'var(--bg)', position: 'relative' }}>
      {rail && (
        <aside className="col" style={{ borderRight: '1px solid var(--line)', background: 'var(--panel)', minHeight: 0, padding: '14px 10px', gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="logo-btn" onClick={() => go('home')} title={T('Accueil', 'Home')}><LogoMark /></button>
            <button className="btn bare" style={{ height: 30, padding: '0 8px' }} onClick={() => set({ palOpen: true })} title={T('Aller à… (⌘K)', 'Go to… (⌘K)')}><LayoutGrid size={14} /><span className="mono" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 5, background: 'var(--panel2)' }}>⌘K</span></button>
            <span className="grow" style={{ fontWeight: 600, fontSize: 14 }}>Studio Chat</span>
            <button className="btn bare icon" onClick={() => setRail(false)} title={T('Masquer', 'Hide')}><PanelLeftClose size={15} /></button>
          </div>
          <button className="btn primary" style={{ height: 34 }} onClick={newThread}><SquarePen size={14} />{T('Nouvelle discussion', 'New chat')}</button>
          <span className="eyebrow" style={{ padding: '4px 6px 0' }}>{T('Récentes', 'Recent')}</span>
          <div className="col" style={{ gap: 2, overflow: 'auto', minHeight: 0, flex: 1 }}>
            {threads.length === 0 && <span className="faint" style={{ fontSize: 12, padding: '0 6px' }}>{T('Aucune discussion.', 'No chats yet.')}</span>}
            {threads.map((t) => (
              <div key={t.id} className="row" style={{ gap: 4, borderRadius: 10, background: t.id === active ? 'var(--panel2)' : 'transparent' }}>
                <button onClick={() => { setActive(t.id); setView('feed'); }} className="row grow" style={{ gap: 10, minHeight: 36, padding: '6px 10px', border: 0, background: 'transparent', fontSize: 13, textAlign: 'left' }}>
                  <MessageSquare size={14} color="var(--tx3)" /><span className="ell">{t.title}</span>
                </button>
                <button className="btn bare icon" style={{ width: 24, height: 24 }} title={T('Supprimer', 'Delete')} onClick={() => del(t.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div className="col" style={{ borderRadius: 14, background: 'var(--panel2)', padding: 12, gap: 6, fontSize: 12, color: 'var(--tx2)' }}>
            <span className="row" style={{ gap: 6, color: 'var(--tx)', fontWeight: 500 }}><Sparkles size={13} />{T('Ton compte Claude', 'Your Claude account')}</span>
            <span className="pretty">{T('Studio Chat utilise ton forfait Claude. Aucun crédit ni clé à gérer ici.', 'Studio Chat uses your Claude plan. No credits or keys to manage here.')}</span>
            <button className="btn bare" style={{ padding: 0, height: 'auto', color: 'var(--accTx)', alignSelf: 'flex-start' }} onClick={() => go('usage')}>{T('Voir l’utilisation', 'See usage')}</button>
          </div>
        </aside>
      )}
      <section style={{ display: 'grid', gridTemplateRows: '56px minmax(0,1fr) auto', minWidth: 0, minHeight: 0 }}>
        <header className="row" style={{ gap: 10, padding: '0 18px', borderBottom: '1px solid var(--line)', minWidth: 0 }}>
          {!rail && <button className="btn icon" style={{ width: 32, height: 32 }} onClick={() => setRail(true)} title={T('Afficher les discussions', 'Show chats')}><PanelLeftOpen size={15} /></button>}
          <span className="ell" style={{ fontWeight: 600, fontSize: 14 }}>{thread?.title ?? T('Nouvelle discussion', 'New chat')}</span>
          <span className="pill acc row" style={{ gap: 4 }}><Check size={11} />{T('Tout reste modifiable', 'Everything stays editable')}</span>
          <div className="grow" />
          <div className="row" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2 }}>
            {(['feed', 'gallery'] as const).map((v) => <button key={v} onClick={() => setView(v)} className="btn" style={{ height: 28, background: view === v ? 'var(--panel)' : 'transparent', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.2)' : 'none' }}>{v === 'feed' ? T('Fil', 'Feed') : T('Galerie', 'Gallery')}</button>)}
          </div>
          <button className="btn icon" style={{ width: 32, height: 32, position: 'relative' }} onClick={() => setSide(!side)} title={T('Tâches et éléments', 'Jobs and elements')}><PanelRight size={15} />{running && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, background: '#FF9F0A' }} />}</button>
        </header>
        <div ref={scroller} style={{ overflow: 'auto', minHeight: 0 }}>
          {view === 'gallery' ? (
            <div className="col" style={{ maxWidth: 1100, margin: '0 auto', padding: 24, gap: 14 }}>
              <span className="muted" style={{ fontSize: 13 }}>{allCards.length} {T('document(s) créé(s) dans Studio Chat', 'document(s) created in Studio Chat')}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {allCards.map((c) => { const d = docs.find((x) => x.id === c.docId); return d ? <DocCard key={c.docId + Math.random()} name={d.name} thumb={d.thumb} kind={d.kind} onOpen={() => go(d.kind === 'video' ? 'video' : 'design', d.id)} /> : null; })}
              </div>
              {!allCards.length && <div className="faint" style={{ padding: 60, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 18 }}>{T('Les designs et vidéos créés ici apparaîtront dans cette galerie.', 'Designs and videos created here will show up in this gallery.')}</div>}
            </div>
          ) : !thread || !thread.msgs.length ? (
            <div className="col" style={{ maxWidth: 680, margin: '0 auto', padding: '8vh 24px 24px', alignItems: 'center', gap: 28, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: 'linear-gradient(135deg,#0A84FF,#BF5AF2 60%,#FF375F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 50px rgba(10,132,255,.35)' }}><Sparkles size={28} color="#fff" /></div>
              <div className="col" style={{ gap: 10, alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: '-.03em', textWrap: 'balance' }}>{T('Que veux-tu créer aujourd’hui ?', 'What do you want to create today?')}</h1>
                <p className="muted pretty" style={{ margin: 0, maxWidth: 560, fontSize: 15, lineHeight: 1.5 }}>{T('Décris le résultat : Claude crée le document au bon format, avec ta marque, et tu le reprends dans l’éditeur.', 'Describe the result: Claude creates the document in the right format, with your brand, and you pick it up in the editor.')}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, width: '100%', textAlign: 'left' }}>
                {recipes.map((r) => (
                  <button key={r.label} onClick={() => { setInput(r.prompt); setKind(r.kind); inputRef.current?.focus(); }} className="col" style={{ alignItems: 'flex-start', gap: 4, padding: 16, minHeight: 124, borderRadius: 20, border: 0, background: `color-mix(in oklab, ${r.c} 14%, var(--panel))`, textAlign: 'left' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 17, background: r.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'auto' }}><r.icon size={16} color="#111113" /></span>
                    <span style={{ fontSize: 15, fontWeight: 600, marginTop: 14 }}>{r.label}</span>
                    <span className="muted pretty" style={{ fontSize: 12 }}>{r.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="col" style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 16px', gap: 26 }}>
              {thread.msgs.map((m) => m.role === 'user'
                ? <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '74%', padding: '10px 14px', borderRadius: '20px 20px 6px 20px', background: 'var(--acc)', color: '#fff', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                : (
                  <div key={m.id} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 15, flex: 'none', background: 'linear-gradient(135deg,#0A84FF,#BF5AF2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={14} color="#fff" /></div>
                    <div className="col grow" style={{ gap: 12, paddingTop: 4 }}>
                      {m.status === 'thinking' && <div className="row faint" style={{ fontSize: 13 }}><span className="pulse" />{T('Claude réfléchit…', 'Claude is thinking…')}</div>}
                      {!!m.steps?.length && (
                        <div className="col" style={{ gap: 6, padding: '12px 14px', borderRadius: 14, background: 'var(--panel)' }}>
                          {m.steps.map((s) => (
                            <div key={s.id} className="row" style={{ gap: 8, fontSize: 12, color: s.status === 'err' ? 'var(--warn)' : 'var(--tx2)' }}>
                              {s.status === 'run' ? <LoaderCircle size={13} className="spin" /> : s.status === 'ok' ? <Check size={13} color="var(--accTx)" /> : <CircleAlert size={13} />}
                              <span className="mono ell">{s.tool}</span>{s.note && <span className="warn">· {s.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.text && <div className="pretty" style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.text}</div>}
                      {m.status === 'error' && <div className="warn pretty" style={{ fontSize: 13 }}>{m.error}</div>}
                      {m.status === 'stopped' && <div className="muted" style={{ fontSize: 12 }}>{T('Arrêté. Ce qui a déjà été créé est conservé.', 'Stopped. What was already created is kept.')}</div>}
                      {!!m.cards?.length && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                          {m.cards.map((c) => <LiveCard key={c.docId} card={c} onOpen={() => go(c.kind === 'video' ? 'video' : 'design', c.docId)} />)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="row" style={{ padding: '0 24px 20px', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 680, borderRadius: 26, padding: 1, background: 'linear-gradient(135deg, rgba(10,132,255,.85), rgba(191,90,242,.45) 40%, var(--line2) 75%)', boxShadow: '0 20px 50px rgba(0,0,0,.18)' }}>
            <div className="col" style={{ borderRadius: 25, background: 'var(--panel)', padding: '14px 14px 10px 18px', gap: 10 }}>
              <textarea ref={inputRef} id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2}
                placeholder={T('Décris ce que tu veux créer… (Maj+Entrée pour aller à la ligne)', 'Describe what you want to create… (Shift+Enter for a new line)')}
                style={{ resize: 'none', border: 0, background: 'transparent', color: 'var(--tx)', outline: 'none', fontSize: 15, lineHeight: 1.45, padding: 0 }} />
              <div className="row wrap" style={{ gap: 6 }}>
                <div className="row" style={{ padding: 2, borderRadius: 16, background: 'var(--panel2)', gap: 2 }}>
                  {kinds.map((k) => <button key={k.id} onClick={() => setKind(k.id)} className="row" style={{ height: 28, padding: '0 10px', borderRadius: 14, border: 0, background: kind === k.id ? 'var(--acc)' : 'transparent', color: kind === k.id ? '#fff' : 'var(--tx2)', fontSize: 12, fontWeight: 500, gap: 5 }}><k.I size={12} />{k.l}</button>)}
                </div>
                <button className="btn" style={{ height: 32, borderRadius: 16 }} onClick={() => setRatio(RATIOS[(RATIOS.indexOf(ratio) + 1) % RATIOS.length])} title={T('Format préféré', 'Preferred ratio')}>{ratio === 'auto' ? T('Format auto', 'Auto ratio') : ratio}</button>
                <select className="input" value={tier} onChange={(e) => set({ tier: e.target.value as Tier })} style={{ height: 32, borderRadius: 16, fontSize: 12, width: 'auto', background: 'var(--panel2)', border: 0 }}>
                  {tiers.map((x) => <option key={x.id} value={x.id}>Claude · {x.l}</option>)}
                </select>
                <div className="grow" />
                {running
                  ? <button onClick={() => ctl.current?.abort()} title={T('Arrêter', 'Stop')} style={{ width: 38, height: 38, borderRadius: 19, border: 0, background: 'var(--panel2)', color: 'var(--tx)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Square size={14} /></button>
                  : <button onClick={() => void send()} title={T('Envoyer', 'Send')} disabled={!input.trim()} style={{ width: 38, height: 38, borderRadius: 19, border: 0, background: input.trim() ? 'var(--acc)' : 'var(--line2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={17} /></button>}
              </div>
            </div>
          </div>
        </div>
      </section>
      {side && (
        <aside className="col" style={{ borderLeft: '1px solid var(--line)', background: 'var(--panel)', minHeight: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2 }}>
              {(['jobs', 'els'] as const).map((k) => <button key={k} onClick={() => setSideTab(k)} className="btn grow" style={{ height: 28, background: sideTab === k ? 'var(--panel)' : 'transparent', boxShadow: sideTab === k ? '0 1px 3px rgba(0,0,0,.2)' : 'none' }}>{k === 'jobs' ? T('Tâches', 'Jobs') : T('Éléments', 'Elements')}</button>)}
            </div>
          </div>
          {sideTab === 'jobs' ? (
            <>
              <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 10, gap: 4 }}>
                {allSteps.map((s) => (
                  <div key={s.id + s.thread} className="row" style={{ gap: 10, padding: 8, borderRadius: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{s.status === 'run' ? <LoaderCircle size={14} className="spin" /> : s.status === 'ok' ? <Check size={14} color="#30D158" /> : <CircleAlert size={14} color="var(--warn)" />}</div>
                    <div className="col grow"><span className="mono ell" style={{ fontSize: 12 }}>{s.tool}</span><span className="faint ell" style={{ fontSize: 11 }}>{s.thread}</span></div>
                  </div>
                ))}
                {!allSteps.length && <div className="faint pretty" style={{ padding: '30px 12px', textAlign: 'center', fontSize: 12 }}>{T('Les actions de Claude (création, mise en page, sous-titres…) apparaissent ici.', 'Claude’s actions (creation, layout, captions…) show up here.')}</div>}
              </div>
              <div className="col" style={{ padding: '12px 14px', borderTop: '1px solid var(--line)', gap: 4, fontSize: 12 }}>
                <span className="muted">{allCards.length} {T('document(s) créé(s)', 'document(s) created')}</span>
                <button className="btn bare" style={{ padding: 0, height: 'auto', color: 'var(--accTx)', alignSelf: 'flex-start' }} onClick={() => go('usage')}>{T('Voir l’utilisation IA', 'See AI usage')}</button>
              </div>
            </>
          ) : (
            <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 12, gap: 8 }}>
              <span className="muted pretty" style={{ fontSize: 12 }}>{T('Mentionne un élément dans ta demande pour que Claude l’utilise.', 'Mention an element in your request so Claude uses it.')}</span>
              <ElRow mark="Aa" bg={brand.colors[2] ?? '#FFD23F'} name={brand.name} sub={T('Kit de marque', 'Brand kit')} onAt={() => setInput((v) => v + ` @kit « ${brand.name} »`)} />
              {media.filter((m) => m.kind === 'image').slice(0, 12).map((m) => <ElRow key={m.id} img={m.thumb} name={m.name} sub={T('Image · médiathèque', 'Image · library')} onAt={() => setInput((v) => v + ` @image « ${m.name} » (id ${m.id})`)} />)}
              {docs.filter((d) => !d.trashedAt).slice(0, 6).map((d) => <ElRow key={d.id} img={d.thumb} name={d.name} sub={d.kind === 'video' ? T('Projet vidéo', 'Video project') : 'Design'} onAt={() => setInput((v) => v + ` @document « ${d.name} » (id ${d.id})`)} />)}
              <button className="btn ghost" style={{ height: 40, borderStyle: 'dashed' }} onClick={() => go('library')}>{T('Ajouter des médias', 'Add media')}</button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function ElRow({ mark, bg, img, name, sub, onAt }: { mark?: string; bg?: string; img?: string; name: string; sub: string; onAt(): void }) {
  return (
    <div className="row" style={{ gap: 10, padding: 8, borderRadius: 12, background: 'var(--panel2)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: img ? `url(${img}) center/cover` : bg ?? 'var(--panel)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#10110F' }}>{mark}</div>
      <div className="col grow"><span className="ell" style={{ fontSize: 13, fontWeight: 500 }}>{name}</span><span className="faint" style={{ fontSize: 11 }}>{sub}</span></div>
      <button onClick={onAt} title="@" style={{ width: 30, height: 30, borderRadius: 15, border: 0, background: 'var(--panel)', color: 'var(--accTx)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AtSign size={13} /></button>
    </div>
  );
}

function DocCard({ name, thumb, kind, onOpen }: { name: string; thumb?: string; kind: 'design' | 'video'; onOpen(): void }) {
  const T = useT();
  return (
    <button onClick={onOpen} className="col" style={{ padding: 0, border: 0, background: 'transparent', gap: 6, textAlign: 'left' }}>
      <div className={thumb ? '' : 'stripes'} style={{ width: '100%', aspectRatio: '4/3', borderRadius: 14, border: '1px solid var(--line)', background: thumb ? `url(${thumb}) center/contain no-repeat, var(--panel2)` : undefined, display: 'flex', alignItems: 'flex-end', padding: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'rgba(10,11,13,.6)', color: '#fff' }}>{kind === 'video' ? T('Vidéo', 'Video') : 'Design'}</span>
      </div>
      <span className="ell" style={{ fontSize: 12, fontWeight: 500 }}>{name}</span>
    </button>
  );
}

// Card for a document created in the chat: live preview of its first page.
function LiveCard({ card, onOpen }: { card: Card; onOpen(): void }) {
  const T = useT();
  const [doc, setDoc] = useState<Doc | null>(null);
  useEffect(() => { let alive = true; const load = () => void getDoc(card.docId).then((d) => { if (alive && d) setDoc(d as Doc); }); load(); const i = setInterval(load, 1500); return () => { alive = false; clearInterval(i); }; }, [card.docId]);
  const page = doc?.kind === 'design' ? (doc.data as DesignData).pages[0] : null;
  const vd = doc?.kind === 'video' ? (doc.data as VideoData) : null;
  return (
    <div className="col" style={{ gap: 8, padding: 10, borderRadius: 16, background: 'var(--panel)', border: '1px solid var(--line)' }}>
      <div style={{ height: 150, borderRadius: 10, background: 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {page ? <div style={{ width: `min(100%, ${(140 * page.w) / page.h}px)`, pointerEvents: 'none' }}><PageView page={page} /></div>
          : vd ? <div className="col" style={{ alignItems: 'center', gap: 6, color: 'var(--tx2)', fontSize: 12 }}><Clapperboard size={22} />{vd.w}×{vd.h} · {vd.clips.length} {T('clips', 'clips')} · {vd.captions.length} {T('sous-titres', 'captions')}</div>
            : <LoaderCircle size={16} className="spin" />}
      </div>
      <span className="ell" style={{ fontSize: 13, fontWeight: 600 }}>{doc?.name ?? card.name}</span>
      <button className="btn primary" style={{ height: 30 }} onClick={onOpen}>{T('Ouvrir dans l’éditeur', 'Open in editor')}</button>
    </div>
  );
}
