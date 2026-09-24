import { useState } from 'react';
import { Plus, Search, Sparkles, ArrowUp, ArrowRight, Trash2, Clapperboard, Play, Image as ImageIcon, Square, Smartphone, FileImage, ShieldCheck } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { CATS, FORMATS, fmt, type Format } from '../model/formats';
import { newFromFormat } from '../lib/create';
import { trashDoc } from '../lib/docs';
import { useDocs } from '../ui/Shell';
import { ago } from '../lib/util';

function routePrompt(p: string): Format {
  const t = p.toLowerCase();
  if (/tiktok|reel|short|vertical|9:16/.test(t) && /vid|montage|clip|tiktok|reel|short/.test(t)) return fmt('v-tiktok');
  if (/vidéo|video|montage|youtube 16|clip/.test(t)) return fmt('v-youtube');
  if (/story|stories/.test(t)) return fmt('story');
  if (/miniature|thumbnail/.test(t)) return fmt('yt-thumb');
  if (/affiche|poster/.test(t)) return fmt('a3');
  if (/flyer|prospectus/.test(t)) return fmt('a5');
  if (/carte de visite|business card/.test(t)) return fmt('card');
  if (/présentation|presentation|slides|diapo/.test(t)) return fmt('slides');
  if (/linkedin/.test(t)) return fmt('linkedin');
  if (/bannière|banner/.test(t)) return fmt('yt-banner');
  if (/carré|square/.test(t)) return fmt('ig-square');
  return fmt('ig-45');
}

export function Home() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const go = useApp((s) => s.go);
  const notify = useApp((s) => s.notify);
  const docs = useDocs().filter((d) => !d.trashedAt);
  const [q, setQ] = useState('');
  const [input, setInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const greet = T('Bonjour — on crée quoi aujourd’hui ?', 'Hello — what are we making today?');
  const today = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const shown = docs.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));

  const send = (text = input) => {
    const p = text.trim();
    if (!p) return;
    const f = routePrompt(p);
    void newFromFormat(f, p);
  };

  const tiles: { f: string; label: string; icon: typeof Play; c: string }[] = [
    { f: 'v-tiktok', label: 'TikTok / Reels', icon: Clapperboard, c: '#64D2FF' },
    { f: 'v-youtube', label: 'YouTube', icon: Play, c: '#FF453A' },
    { f: 'yt-thumb', label: T('Miniature', 'Thumbnail'), icon: ImageIcon, c: '#FF9F0A' },
    { f: 'ig-45', label: 'Post 4:5', icon: Square, c: '#30D158' },
    { f: 'story', label: 'Story', icon: Smartphone, c: '#BF5AF2' },
    { f: 'a3', label: T('Affiche A3', 'A3 poster'), icon: FileImage, c: '#AEAEB2' },
  ];
  const sugg = [
    { icon: Clapperboard, label: T('Monte un TikTok de 30 s avec mes rushes', 'Cut a 30 s TikTok from my footage') },
    { icon: ImageIcon, label: T('Fais une miniature YouTube pour mon test de téléphone', 'Make a YouTube thumbnail for my phone review') },
    { icon: Smartphone, label: T('Crée une story pour une promo −20 % cette semaine', 'Create a story for a 20% off promo this week') },
  ];

  return (
    <div className="page screen-in" style={{ gap: 28 }}>
      <div className="page-head" style={{ position: 'relative' }}>
        <div className="col" style={{ gap: 4 }}>
          <span className="faint" style={{ fontSize: 12, textTransform: 'capitalize' }}>{today}</span>
          <h1 className="h1">{greet}</h1>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <div className="row" style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 11, color: 'var(--tx3)', pointerEvents: 'none' }} />
            <input id="home-search" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('Rechercher dans tes documents', 'Search your documents')} style={{ width: 280, maxWidth: '60vw', height: 38, paddingLeft: 34, borderRadius: 16, background: 'var(--panel)' }} />
          </div>
          <button className="btn primary" style={{ height: 38, borderRadius: 16, padding: '0 16px' }} onClick={() => setCreateOpen(!createOpen)}><Plus size={14} />{T('Créer', 'Create')}</button>
        </div>
        {createOpen && (
          <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 20, width: 'min(820px,100%)', background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: 16, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 18, boxShadow: '0 16px 48px rgba(0,0,0,.35)' }}>
            {CATS.map((c) => (
              <div key={c.id} className="col" style={{ gap: 2 }}>
                <div className="eyebrow" style={{ padding: '0 6px 4px' }}>{T(c.fr, c.en)}</div>
                {FORMATS.filter((f) => f.cat === c.id).map((f) => (
                  <button key={f.id} className="row list-item" onClick={() => { setCreateOpen(false); void newFromFormat(f); }} style={{ justifyContent: 'space-between', padding: '5px 6px', border: 0, background: 'transparent', textAlign: 'left' }}>
                    <span>{T(f.fr, f.en)}</span><span className="mono faint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{f.dims}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderRadius: 16, padding: 1, background: 'linear-gradient(135deg, rgba(10,132,255,.9), rgba(191,90,242,.5) 35%, var(--line2) 70%)', boxShadow: '0 20px 50px rgba(10,132,255,.12)' }}>
        <div className="col" style={{ borderRadius: 15, background: 'var(--panel)', padding: '18px 18px 14px', gap: 12 }}>
          <div className="row" style={{ gap: 8, fontWeight: 600 }}><Sparkles size={15} color="var(--accTx)" />{T('Que veux-tu créer ou modifier ?', 'What do you want to create or edit?')}</div>
          <textarea id="home-prompt" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2}
            placeholder={T('Ex. Fais-moi une affiche pour la soirée de lancement de ma boutique samedi à 18 h', 'e.g. Make a poster for my shop’s launch party on Saturday at 6 pm')}
            style={{ resize: 'none', border: 0, background: 'transparent', color: 'var(--tx)', outline: 'none', fontSize: 16, lineHeight: 1.45, padding: 0 }} />
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="row muted" style={{ height: 30, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', gap: 6, fontSize: 12 }}><Sparkles size={13} />Claude</span>
            <button className="row muted" onClick={() => go('providers')} style={{ height: 30, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line2)', gap: 6, fontSize: 12, background: 'transparent' }}><ShieldCheck size={13} />{useApp.getState().agentMode === 'ask' ? 'Ask' : useApp.getState().agentMode === 'agent' ? 'Agent' : 'Assist'}</button>
            <div className="grow" />
            <button className="btn primary" onClick={() => send()} title={T('Envoyer', 'Send')} style={{ width: 36, height: 36, padding: 0, borderRadius: 18 }}><ArrowUp size={16} /></button>
          </div>
          <span className="faint pretty" style={{ fontSize: 11 }}>{T('Crée le document au bon format et lance l’assistant dessus. En mode Assist, tu valides chaque modification.', 'Creates the document in the right format and runs the assistant on it. In Assist mode you approve every change.')}</span>
        </div>
      </div>
      <div className="row wrap" style={{ gap: 8, marginTop: -14 }}>
        {sugg.map((s) => <button key={s.label} className="chip wrap-text" style={{ borderRadius: 15, color: 'var(--tx2)', maxWidth: '100%' }} onClick={() => send(s.label)}><s.icon size={12} />{s.label}</button>)}
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{T('Commencer un format', 'Start a format')}</span>
          <button className="btn bare" onClick={() => setCreateOpen(true)}>{T('Tous les formats', 'All formats')} <ArrowRight size={12} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          {tiles.map((x) => {
            const f = fmt(x.f);
            return (
              <button key={x.f} onClick={() => void newFromFormat(f)} className="col" style={{ alignItems: 'flex-start', gap: 4, padding: 16, minHeight: 128, borderRadius: 20, border: 0, background: `color-mix(in oklab, ${x.c} 14%, var(--panel))`, textAlign: 'left' }}>
                <span style={{ width: 34, height: 34, borderRadius: 17, background: x.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'auto' }}><x.icon size={16} color="#111113" /></span>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em', marginTop: 14 }}>{x.label}</span>
                <span className="muted" style={{ fontSize: 12 }}>{f.dims}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{T('Récents', 'Recent')}</div>
        {shown.length === 0 && (
          <div className="muted pretty" style={{ padding: 28, textAlign: 'center', border: '1px dashed var(--line2)', borderRadius: 16, fontSize: 13 }}>
            {q ? T('Aucun document ne correspond.', 'No matching document.') : T('Aucun document pour l’instant. Choisis un format ci-dessus ou décris ce que tu veux créer.', 'No documents yet. Pick a format above or describe what you want to make.')}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
          {shown.map((d) => (
            <div key={d.id} style={{ position: 'relative' }}>
              <button onClick={async () => { await trashDoc(d.id); notify(T('Déplacé dans la corbeille (restaurable 30 jours).', 'Moved to trash (restorable for 30 days).')); }} title={T('Mettre à la corbeille', 'Move to trash')} style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, width: 28, height: 28, borderRadius: 10, border: 0, background: 'rgba(10,11,13,.55)', color: '#fff', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
              <button onClick={() => go(d.kind === 'video' ? 'video' : 'design', d.id)} className="col" style={{ padding: 0, border: 0, background: 'transparent', gap: 8, textAlign: 'left', width: '100%' }}>
                <div className={d.thumb ? '' : 'stripes'} style={{ width: '100%', aspectRatio: '16/10', borderRadius: 16, border: '1px solid var(--line)', background: d.thumb ? `url(${d.thumb}) center/contain no-repeat, var(--panel2)` : undefined, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 10, background: 'rgba(10,11,13,.6)', color: '#fff' }}>{d.kind === 'video' ? T('Vidéo', 'Video') : 'Design'}</span>
                </div>
                <div className="col" style={{ gap: 1 }}>
                  <span className="ell" style={{ fontWeight: 500 }}>{d.name}</span>
                  <span className="faint" style={{ fontSize: 12 }}>{d.format} · {ago(d.updatedAt, lang)}</span>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
