import { useEffect, useState } from 'react';
import { Shield, FileStack, Images, Sparkles, Lightbulb, HardDrive } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead } from '../ui/kit';
import { useDocs } from '../ui/Shell';
import { useImages } from '../design/LeftPanel';
import { useUsage } from '../lib/usage';
import { get } from '../lib/db';
import { bytes } from '../lib/util';
import { TEMPLATES } from '../model/templates';

// Administration of this installation: content, storage, AI activity and moderation queue.

export function Admin() {
  const T = useT();
  const lang = useApp((s) => s.lang);
  const go = useApp((s) => s.go);
  const docs = useDocs();
  const media = useImages();
  const rows = useUsage((s) => s.rows);
  const [fb, setFb] = useState<{ status: string; hidden?: boolean; title: string; votes: number }[]>([]);
  const [tab, setTab] = useState<'content' | 'storage' | 'moderation' | 'templates'>('content');
  useEffect(() => { void get<typeof fb>('kv', 'feedback').then((v) => setFb(v ?? [])); }, []);
  const week = Date.now() - 7 * 86400_000;
  const live = docs.filter((d) => !d.trashedAt);
  const size = media.reduce((s, m) => s + m.size, 0);
  const kpis: [typeof Shield, string, string, string, string][] = [
    [FileStack, '#0A84FF', T('Documents', 'Documents'), String(live.length), `${live.filter((d) => d.kind === 'design').length} design · ${live.filter((d) => d.kind === 'video').length} ${T('vidéo', 'video')}`],
    [Images, '#FF9F0A', T('Médias', 'Media'), String(media.length), bytes(size, lang)],
    [Sparkles, '#5E5CE6', T('Requêtes IA (7 j)', 'AI requests (7 d)'), String(rows.filter((r) => r.at >= week).length), T(`${rows.filter((r) => r.status !== 'ok').length} en échec au total`, `${rows.filter((r) => r.status !== 'ok').length} failed in total`)],
    [Lightbulb, '#FFD60A', T('Suggestions ouvertes', 'Open suggestions'), String(fb.filter((f) => !['done', 'declined'].includes(f.status)).length), T(`${fb.length} au total`, `${fb.length} in total`)],
  ];
  const tabBtn = (on: boolean): React.CSSProperties => ({ height: 30, padding: '0 14px', borderRadius: 9, border: 0, background: on ? 'var(--panel)' : 'transparent', color: on ? 'var(--tx)' : 'var(--tx2)', boxShadow: on ? '0 1px 3px rgba(0,0,0,.2)' : 'none', fontSize: 12, fontWeight: 500 });
  return (
    <div className="page screen-in" style={{ maxWidth: 1300 }}>
      <PageHead color="#FF453A" icon={<Shield size={19} />} title={T('Administration', 'Admin')} sub={T('Contenu, stockage, activité IA et modération de cette installation.', 'Content, storage, AI activity and moderation for this installation.')} />
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
        {kpis.map(([I, c, l, v, s]) => (
          <div key={l} className="col" style={{ borderRadius: 18, padding: 16, background: `color-mix(in oklab, ${c} 12%, var(--panel))`, gap: 6 }}>
            <span className="row muted" style={{ gap: 6, fontSize: 12 }}><I size={13} color={c} />{l}</span>
            <span className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{v}</span>
            <span className="faint" style={{ fontSize: 11 }}>{s}</span>
          </div>
        ))}
      </div>
      <div className="row wrap" style={{ padding: 3, borderRadius: 12, background: 'var(--panel2)', gap: 2, alignSelf: 'flex-start' }}>
        {([['content', T('Contenu', 'Content')], ['storage', T('Stockage', 'Storage')], ['moderation', T('Modération', 'Moderation')], ['templates', T('Modèles', 'Templates')]] as const).map(([k, l]) => <button key={k} style={tabBtn(tab === k)} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'content' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 620 }}>
            <div className="eyebrow" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 90px 150px 150px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}><span>{T('Document', 'Document')}</span><span>{T('Type', 'Type')}</span><span>{T('Format', 'Format')}</span><span>{T('Statut', 'Status')}</span></div>
            {docs.map((d) => (
              <button key={d.id} onClick={() => !d.trashedAt && go(d.kind === 'video' ? 'video' : 'design', d.id)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 90px 150px 150px', gap: 12, padding: '10px 16px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', width: '100%', textAlign: 'left', fontSize: 13 }}>
                <span className="ell">{d.name}</span><span className="muted">{d.kind === 'video' ? T('Vidéo', 'Video') : 'Design'}</span><span className="mono muted" style={{ fontSize: 12 }}>{d.format}</span><span style={{ color: d.trashedAt ? 'var(--warn)' : '#30D158', fontSize: 12 }}>{d.trashedAt ? T('Corbeille', 'Trash') : T('Actif', 'Active')}</span>
              </button>
            ))}
            {!docs.length && <div className="faint" style={{ padding: 24, textAlign: 'center', fontSize: 12 }}>{T('Aucun document.', 'No documents.')}</div>}
          </div>
        </div>
      )}
      {tab === 'storage' && (
        <div className="card col" style={{ padding: 16, gap: 10 }}>
          <span className="row" style={{ gap: 8, fontWeight: 600 }}><HardDrive size={15} />{T('Médias les plus lourds', 'Largest media')}</span>
          {[...media].sort((a, b) => b.size - a.size).slice(0, 12).map((m) => (
            <div key={m.id} className="row" style={{ gap: 10, fontSize: 12 }}>
              <span className="grow ell">{m.name}</span><span className="muted">{m.kind}</span>
              <div style={{ width: 160 }} className="bar"><div style={{ width: `${(m.size / Math.max(1, media[0] ? Math.max(...media.map((x) => x.size)) : 1)) * 100}%` }} /></div>
              <span className="mono" style={{ width: 80, textAlign: 'right' }}>{bytes(m.size, lang)}</span>
            </div>
          ))}
          {!media.length && <span className="faint" style={{ fontSize: 12 }}>{T('Aucun média.', 'No media.')}</span>}
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => go('library')}>{T('Gérer dans la médiathèque', 'Manage in the library')}</button>
        </div>
      )}
      {tab === 'moderation' && (
        <div className="card">
          {fb.map((f, i) => (
            <div key={i} className="row wrap" style={{ gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <Lightbulb size={15} color="#FFD60A" />
              <div className="col grow" style={{ minWidth: 200 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</span><span className="faint" style={{ fontSize: 11 }}>{f.votes} ▲ · {f.status}{f.hidden ? ' · ' + T('masqué', 'hidden') : ''}</span></div>
            </div>
          ))}
          {!fb.length && <div className="faint" style={{ padding: 24, textAlign: 'center', fontSize: 12 }}>{T('Aucune suggestion à modérer.', 'No suggestions to moderate.')}</div>}
          <div style={{ padding: '10px 16px' }}><button className="btn" onClick={() => go('feedback')}>{T('Ouvrir Idées & bugs (vue admin)', 'Open Ideas & bugs (admin view)')}</button></div>
        </div>
      )}
      {tab === 'templates' && (
        <div className="card">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="row" style={{ gap: 14, padding: '10px 16px', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <span className="grow">{T(t.fr, t.en)}</span><span className="mono muted" style={{ fontSize: 12 }}>{t.formatId}</span><span className="pill ok">{T('Publié', 'Published')}</span>
            </div>
          ))}
          <div className="faint pretty" style={{ padding: '10px 16px', fontSize: 12 }}>{T('Les modèles proposés par la communauté et leur validation arriveront avec les comptes.', 'Community-submitted templates and their review will come with accounts.')}</div>
        </div>
      )}
    </div>
  );
}
