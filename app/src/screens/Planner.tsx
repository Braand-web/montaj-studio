import { useEffect, useState } from 'react';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead } from '../ui/kit';
import { get, put } from '../lib/db';
import type { PlannedPost } from '../model/types';
import { useDocs } from '../ui/Shell';
import { uid } from '../lib/util';

const NETS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'LinkedIn', 'X', 'Pinterest'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monday = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

export function Planner() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const notify = useApp((s) => s.notify);
  const go = useApp((s) => s.go);
  const docs = useDocs().filter((d) => !d.trashedAt);
  const [posts, setPosts] = useState<PlannedPost[]>([]);
  const [week, setWeek] = useState(() => monday(new Date()));
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<PlannedPost | null>(null);
  useEffect(() => { void get<PlannedPost[]>('kv', 'posts').then((p) => setPosts(p ?? [])); }, []);
  const save = (p: PlannedPost[]) => { setPosts(p); void put('kv', 'posts', p); };
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return d; });
  const today = iso(new Date());
  const loc = lang === 'fr' ? 'fr-FR' : 'en-US';
  const stColor = { draft: 'var(--tx3)', scheduled: '#0A84FF', published: '#30D158' };
  const stLabel = { draft: T('Brouillon', 'Draft'), scheduled: T('Prévu', 'Planned'), published: T('Publié', 'Published') };
  const cur = posts.find((p) => p.id === sel);
  const newPost = (date: string) => { setSel(null); setForm({ id: uid('q'), date, time: '18:00', nets: [], title: '', caption: '', status: 'scheduled', docId: docs[0]?.id }); };
  const weekLabel = `${days[0].toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="page screen-in" style={{ maxWidth: 1400 }}>
      <PageHead color="#FF375F" icon={<CalendarDays size={19} />} title={T('Planning', 'Planner')} sub={T('Planifie tes contenus sur la semaine, prépare les légendes et suis ce qui est publié.', 'Plan your content over the week, prepare captions and track what is published.')}
        right={<button className="btn primary md" onClick={() => newPost(iso(new Date()))}><Plus size={14} />{T('Nouvelle publication', 'New post')}</button>} />
      <div className="pretty" style={{ fontSize: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--panel2)', color: 'var(--tx2)' }}>
        <b>{T('Publication automatique : bientôt.', 'Automatic publishing: coming soon.')}</b> {T('Elle passera uniquement par les API officielles des réseaux, avec tes comptes connectés. Pour l’instant, exporte ton contenu, copie la légende et marque la publication comme publiée.', 'It will only go through each network’s official API, with your connected accounts. For now, export your content, copy the caption and mark the post as published.')}
      </div>
      <div className="row wrap" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: '1 1 640px', minWidth: 0, overflowX: 'auto' }}>
          <div className="row" style={{ justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn icon" onClick={() => { const d = new Date(week); d.setDate(d.getDate() - 7); setWeek(d); }} aria-label={T('Semaine précédente', 'Previous week')}><ChevronLeft size={14} /></button>
              <button className="btn" style={{ height: 28 }} onClick={() => setWeek(monday(new Date()))}>{T('Aujourd’hui', 'Today')}</button>
              <button className="btn icon" onClick={() => { const d = new Date(week); d.setDate(d.getDate() + 7); setWeek(d); }} aria-label={T('Semaine suivante', 'Next week')}><ChevronRight size={14} /></button>
              <span style={{ fontWeight: 600, marginLeft: 6 }}>{weekLabel}</span>
            </div>
            <span className="mono faint" style={{ fontSize: 11 }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(128px,1fr))', minWidth: 896 }}>
            {days.map((d) => {
              const key = iso(d);
              const list = posts.filter((p) => p.date === key).sort((a, b) => a.time.localeCompare(b.time));
              return (
                <div key={key} className="col" style={{ borderRight: '1px solid var(--line)', minHeight: 380, background: key === today ? 'var(--accSoft)' : undefined }}>
                  <button onClick={() => newPost(key)} className="row" style={{ justifyContent: 'space-between', padding: '8px 10px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', textAlign: 'left' }}>
                    <span style={{ fontSize: 12, fontWeight: key === today ? 700 : 500, color: key === today ? 'var(--accTx)' : 'var(--tx2)', textTransform: 'capitalize' }}>{d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric' })}</span>
                    <span className="faint" style={{ fontSize: 14 }}>+</span>
                  </button>
                  <div className="col" style={{ padding: 6, gap: 6 }}>
                    {list.map((p) => (
                      <button key={p.id} onClick={() => { setForm(null); setSel(p.id); }} className="col" style={{ textAlign: 'left', padding: '7px 8px', borderRadius: 10, border: `1px solid ${sel === p.id ? 'var(--accTx)' : 'var(--line2)'}`, background: 'var(--panel2)', gap: 3 }}>
                        <span className="row mono muted" style={{ justifyContent: 'space-between', fontSize: 10, gap: 4, minWidth: 0 }}><span>{p.time}</span><span className="ell">{p.nets.join(', ')}</span></span>
                        <span className="pretty" style={{ fontSize: 11, lineHeight: 1.3 }}>{p.title || T('Sans titre', 'Untitled')}</span>
                        <span className="row" style={{ gap: 5, fontSize: 10, color: stColor[p.status] }}><span style={{ width: 6, height: 6, borderRadius: 3, background: stColor[p.status] }} />{stLabel[p.status]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card col" style={{ flex: '1 1 300px', maxWidth: '100%', padding: 14, gap: 12 }}>
          {!cur && !form && <span className="muted pretty" style={{ fontSize: 12 }}>{T('Sélectionne une publication ou clique sur « + » dans une journée pour en planifier une.', 'Select a post, or click “+” on a day to plan one.')}</span>}
          {cur && !form && (
            <>
              <div className="col" style={{ gap: 2 }}><span style={{ fontWeight: 600 }}>{cur.title || T('Sans titre', 'Untitled')}</span><span className="mono muted" style={{ fontSize: 11 }}>{new Date(cur.date + 'T00:00').toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })} · {cur.time} · {cur.nets.join(', ') || '—'}</span></div>
              <span className="row" style={{ gap: 6, fontSize: 12, color: stColor[cur.status] }}><span style={{ width: 7, height: 7, borderRadius: 4, background: stColor[cur.status] }} />{stLabel[cur.status]}</span>
              <div className="muted" style={{ fontSize: 12, whiteSpace: 'pre-line', padding: 10, borderRadius: 10, background: 'var(--panel2)' }}>{cur.caption || '—'}</div>
              {cur.docId && docs.find((d) => d.id === cur.docId) && <button className="btn" onClick={() => { const d = docs.find((x) => x.id === cur.docId)!; go(d.kind === 'video' ? 'video' : 'design', d.id); }}>{T('Ouvrir le contenu', 'Open content')} · {docs.find((d) => d.id === cur.docId)!.name}</button>}
              <div className="row wrap" style={{ gap: 6 }}>
                <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(cur.caption); notify(T('Légende copiée.', 'Caption copied.')); } catch { notify(T('Copie impossible dans cette vue : sélectionne le texte.', 'Copy is not possible in this view: select the text.'), 'err'); } }}><Copy size={12} />{T('Copier la légende', 'Copy caption')}</button>
                {cur.status !== 'published' && <button className="btn primary" onClick={() => save(posts.map((p) => (p.id === cur.id ? { ...p, status: 'published' } : p)))}>{T('Marquer comme publié', 'Mark as published')}</button>}
                <button className="btn" onClick={() => setForm({ ...cur })}>{T('Modifier', 'Edit')}</button>
                <button className="btn danger" onClick={() => { save(posts.filter((p) => p.id !== cur.id)); setSel(null); }}>{T('Supprimer', 'Delete')}</button>
              </div>
            </>
          )}
          {form && (
            <>
              <span style={{ fontWeight: 600 }}>{posts.some((p) => p.id === form.id) ? T('Modifier la publication', 'Edit post') : T('Nouvelle publication', 'New post')}</span>
              <label className="field"><span className="eyebrow">{T('Titre', 'Title')}</span><input id="pl-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="field"><span className="eyebrow">{T('Contenu', 'Content')}</span>
                <select className="input" value={form.docId ?? ''} onChange={(e) => setForm({ ...form, docId: e.target.value || undefined })}>
                  <option value="">{T('— aucun —', '— none —')}</option>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Réseaux', 'Networks')}</span>
                <div className="row wrap" style={{ gap: 4 }}>{NETS.map((n) => <button key={n} className={'chip sm' + (form.nets.includes(n) ? ' on' : '')} onClick={() => setForm({ ...form, nets: form.nets.includes(n) ? form.nets.filter((x) => x !== n) : [...form.nets, n] })}>{n}</button>)}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <label className="field grow"><span className="eyebrow">{T('Jour', 'Day')}</span><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="field"><span className="eyebrow">{T('Heure', 'Time')}</span><input type="time" className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
              </div>
              <label className="field"><span className="eyebrow">{T('Légende', 'Caption')}</span><textarea id="pl-caption" className="input" rows={4} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></label>
              <div className="col" style={{ gap: 6 }}><span className="eyebrow">{T('Statut', 'Status')}</span>
                <div className="row wrap" style={{ gap: 4 }}>{(['draft', 'scheduled', 'published'] as const).map((s) => <button key={s} className={'chip sm' + (form.status === s ? ' on' : '')} onClick={() => setForm({ ...form, status: s })}>{stLabel[s]}</button>)}</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn primary" disabled={!form.nets.length} title={!form.nets.length ? T('Choisis au moins un réseau', 'Pick at least one network') : undefined} onClick={() => { const exists = posts.some((p) => p.id === form.id); save(exists ? posts.map((p) => (p.id === form.id ? form : p)) : [...posts, form]); setSel(form.id); setForm(null); const d = new Date(form.date + 'T00:00'); setWeek(monday(d)); }}>{T('Enregistrer', 'Save')}</button>
                <button className="btn" onClick={() => setForm(null)}>{T('Annuler', 'Cancel')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
