import { useMemo, useState } from 'react';
import { Table2 } from 'lucide-react';
import { zipSync } from 'fflate';
import { useApp, useT } from '../store/app';
import { PageHead, Progress } from '../ui/kit';
import { parseCsv, slug } from '../lib/util';
import { businessCardPage } from '../model/templates';
import { PageView } from '../design/ElementView';
import { newDesignFromData } from '../lib/create';
import { canvasBlob, renderPage } from '../design/render';
import { saveFile } from '../lib/claude';

const SAMPLE = 'nom;poste;telephone;email\nAwa Diallo;Directrice;+221 77 123 45 67;awa@techlab.sn\nKoffi Mensah;Monteur vidéo;+228 90 11 22 33;koffi@techlab.sn\nSara Benali;Community manager;+212 6 12 34 56 78;sara@techlab.sn\nJean Mukendi;Cadreur;;jean@techlab.sn\nFatou Ndiaye;Graphiste;+221 76 555 01 02;fatou@techlab.sn\nYanis Haddad;Son et mixage;+213 5 50 12 34 56;yanis@techlab.sn';
type Field = 'nom' | 'poste' | 'telephone' | 'email';
const FIELDS: Field[] = ['nom', 'poste', 'telephone', 'email'];

export function Bulk() {
  const T = useT();
  const notify = useApp((s) => s.notify);
  const [csv, setCsv] = useState(SAMPLE);
  const rows = useMemo(() => parseCsv(csv), [csv]);
  const head = rows[0] ?? [];
  const data = rows.slice(1);
  const guess = (f: Field) => {
    const pats: Record<Field, RegExp> = { nom: /nom|name/i, poste: /poste|role|titre|title|job/i, telephone: /t[ée]l|phone|mobile/i, email: /mail/i };
    const i = head.findIndex((h) => pats[f].test(h));
    return i;
  };
  const [map, setMap] = useState<Record<Field, number> | null>(null);
  const mapping: Record<Field, number> = map ?? { nom: guess('nom'), poste: guess('poste'), telephone: guess('telephone'), email: guess('email') };
  const [busy, setBusy] = useState<number | null>(null);
  const labels: Record<Field, string> = { nom: T('Nom', 'Name'), poste: T('Poste', 'Role'), telephone: T('Téléphone', 'Phone'), email: T('E-mail', 'Email') };
  const cards = data.map((r) => {
    const v = Object.fromEntries(FIELDS.map((f) => [f, mapping[f] >= 0 ? (r[mapping[f]] ?? '').trim() : ''])) as Record<Field, string>;
    const missing = FIELDS.filter((f) => mapping[f] >= 0 && !v[f]);
    return { v, missing, page: businessCardPage(v) };
  });

  const generate = async () => {
    if (!cards.length) return;
    await newDesignFromData(T('Cartes de visite — équipe', 'Business cards — team'), { pages: cards.map((c) => businessCardPage(c.v)) }, false);
    notify(T(`${cards.length} cartes générées dans le document « Cartes de visite — équipe ». Chaque carte reste modifiable.`, `${cards.length} cards generated in the “Business cards — team” document. Each card stays editable.`));
  };
  const exportZip = async () => {
    setBusy(0);
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < cards.length; i++) {
      const c = await renderPage(cards[i].page, cards[i].page.w);
      files[`${String(i + 1).padStart(2, '0')}-${slug(cards[i].v.nom || 'carte')}.png`] = new Uint8Array(await (await canvasBlob(c)).arrayBuffer());
      setBusy(((i + 1) / cards.length) * 100);
    }
    const r = await saveFile('cartes-de-visite.zip', new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }));
    setBusy(null);
    if (r === 'saved') notify(T('Archive enregistrée.', 'Archive saved.'));
    else if (r === 'failed') notify(T('Enregistrement impossible dans cette vue.', 'Saving is not possible in this view.'), 'err');
  };

  return (
    <div className="page screen-in">
      <PageHead color="#30D158" icon={<Table2 size={19} />} title={T('Création en masse', 'Bulk create')} sub={T('Colle un tableau (CSV, séparateur ; ou ,). Chaque ligne devient une carte du modèle « Carte de visite », avec les champs remplis automatiquement.', 'Paste a table (CSV, ; or , separator). Each row becomes a card of the “Business card” template, with fields filled automatically.')} right={<span className="pill acc">{T('Gratuit · local', 'Free · local')}</span>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 20, alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card col" style={{ padding: 14, gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">{T('Données', 'Data')}</span>
              <label className="btn ghost sm" style={{ cursor: 'pointer' }}>{T('Importer un CSV', 'Import CSV')}<input type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setCsv((await f.text()).replace(/\t/g, ';')); setMap(null); } }} /></label>
            </div>
            <textarea id="bulk-csv" className="input mono" rows={9} spellCheck={false} value={csv} onChange={(e) => { setCsv(e.target.value); setMap(null); }} style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre' }} />
            <span className="muted" style={{ fontSize: 12 }}>{data.length} {T('lignes', 'rows')} · {head.length} {T('colonnes', 'columns')} · {T('XLSX : exporte-le d’abord en CSV depuis ton tableur.', 'XLSX: export it as CSV from your spreadsheet first.')}</span>
          </div>
          <div className="card col" style={{ padding: 14, gap: 10 }}>
            <span className="eyebrow">{T('Liaison des champs', 'Field mapping')}</span>
            {FIELDS.map((f) => (
              <div key={f} style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                <span style={{ fontSize: 12, lineHeight: '28px' }}>{labels[f]}</span>
                <div className="row wrap" style={{ gap: 4 }}>
                  {[...head.map((h, i) => ({ i, l: h || `#${i + 1}` })), { i: -1, l: T('— aucune —', '— none —') }].map((o) => (
                    <button key={o.i} className={'chip sm' + (mapping[f] === o.i ? ' on' : '')} onClick={() => setMap({ ...mapping, [f]: o.i })}>{o.l}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 12 }}>
          <div className="row wrap" style={{ justifyContent: 'space-between', gap: 12 }}>
            <span className="eyebrow">{T('Aperçu', 'Preview')} · {T('Carte de visite 85×55 mm', 'Business card 85×55 mm')}</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" disabled={!cards.length || busy !== null} onClick={() => void exportZip()}>{T('Exporter en zip (PNG 300 dpi)', 'Export zip (PNG 300 dpi)')}</button>
              <button className="btn primary" disabled={!cards.length} onClick={() => void generate()}>{T(`Générer ${cards.length} cartes`, `Generate ${cards.length} cards`)}</button>
            </div>
          </div>
          {busy !== null && <Progress label={T('Rendu des cartes', 'Rendering cards')} pct={busy} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
            {cards.map((c, i) => (
              <div key={i} className="col" style={{ gap: 6 }}>
                <div style={{ borderRadius: 10, overflow: 'hidden', outline: c.missing.length ? '2px solid var(--warn)' : undefined, outlineOffset: 2 }}><PageView page={c.page} /></div>
                <span style={{ fontSize: 11, color: c.missing.length ? 'var(--warn)' : 'var(--tx3)' }}>{c.missing.length ? `${T('Valeur manquante', 'Missing value')} : ${c.missing.map((f) => labels[f]).join(', ')}` : T('Prête', 'Ready')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
