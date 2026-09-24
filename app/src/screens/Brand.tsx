import { useEffect, useState } from 'react';
import { Palette, X, Upload } from 'lucide-react';
import { useApp, useT } from '../store/app';
import { PageHead } from '../ui/kit';
import { FONTS, FONT_KEYS } from '../model/fonts';
import { importFiles, mediaUrl } from '../lib/media';
import { normHex } from '../lib/util';
import type { FontKey } from '../model/types';

export function Brand() {
  const T = useT();
  const brand = useApp((s) => s.brand);
  const setBrand = useApp((s) => s.setBrand);
  const notify = useApp((s) => s.notify);
  const [logo, setLogo] = useState<string | null>(null);
  const [hex, setHex] = useState('');
  useEffect(() => { setLogo(null); if (brand.logoMediaId) void mediaUrl(brand.logoMediaId).then(setLogo); }, [brand.logoMediaId]);
  const addColor = (c: string) => {
    const h = normHex(c);
    if (!h) { notify(T('Couleur invalide : utilise le format #RRGGBB.', 'Invalid color: use the #RRGGBB format.'), 'err'); return; }
    if (!brand.colors.includes(h)) setBrand({ colors: [...brand.colors, h] });
    setHex('');
  };
  return (
    <div className="page narrow screen-in" style={{ maxWidth: 1000, gap: 28 }}>
      <PageHead color="#BF5AF2" icon={<Palette size={19} />} title={T('Kit de marque', 'Brand kit')} sub={T('Utilisé par les éditeurs (couleurs, logo, polices) et par l’assistant pour respecter ton identité et ton ton.', 'Used by the editors (colors, logo, fonts) and by the assistant to respect your identity and voice.')} />
      <label className="field" style={{ maxWidth: 360 }}><span className="eyebrow">{T('Nom de la marque', 'Brand name')}</span><input id="brand-name" className="input lg" value={brand.name} onChange={(e) => setBrand({ name: e.target.value })} /></label>
      <div className="col" style={{ gap: 10 }}>
        <span className="eyebrow">{T('Logo', 'Logo')}</span>
        <div className="row wrap" style={{ gap: 12 }}>
          <div style={{ width: 180, aspectRatio: '3/2', borderRadius: 16, border: '1px solid var(--line)', background: logo ? `url(${logo}) center/contain no-repeat, var(--panel2)` : 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!logo && <span className="faint" style={{ fontSize: 12 }}>{T('Aucun logo', 'No logo')}</span>}
          </div>
          <div className="col" style={{ gap: 6 }}>
            <label className="btn" style={{ cursor: 'pointer' }}><Upload size={13} />{T('Importer un logo (PNG, SVG, JPG)', 'Upload a logo (PNG, SVG, JPG)')}<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files; e.target.value = ''; if (!f?.length) return; const { ok } = await importFiles(f); if (ok[0]) { setBrand({ logoMediaId: ok[0].id }); notify(T('Logo enregistré.', 'Logo saved.')); } }} /></label>
            {brand.logoMediaId && <button className="btn danger" onClick={() => setBrand({ logoMediaId: undefined })}>{T('Retirer le logo', 'Remove logo')}</button>}
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <span className="eyebrow">{T('Palette', 'Palette')}</span>
        <div className="row wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
          {brand.colors.map((c, i) => (
            <div key={c + i} className="col" style={{ gap: 6, position: 'relative' }}>
              <label style={{ width: 72, height: 72, borderRadius: 10, background: c, border: '1px solid var(--line2)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }} title={T('Modifier', 'Edit')}>
                <input type="color" value={c} onChange={(e) => setBrand({ colors: brand.colors.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)) })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
              <span className="mono muted" style={{ fontSize: 11 }}>{c}</span>
              <button onClick={() => setBrand({ colors: brand.colors.filter((_, j) => j !== i) })} aria-label={T('Retirer', 'Remove')} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, border: '1px solid var(--line2)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={11} /></button>
            </div>
          ))}
          <div className="col" style={{ gap: 6 }}>
            <label style={{ width: 72, height: 72, borderRadius: 10, border: '1px dashed var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx2)', fontSize: 12, cursor: 'pointer', position: 'relative' }}>
              + {T('Couleur', 'Color')}
              <input type="color" onChange={(e) => addColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            <input className="input mono" placeholder="#RRGGBB" value={hex} onChange={(e) => setHex(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addColor(hex); }} style={{ width: 72, height: 26, fontSize: 10, padding: '0 6px' }} />
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <span className="eyebrow">{T('Polices', 'Fonts')}</span>
        <div className="card">
          {(['heading', 'body'] as const).map((r) => (
            <div key={r} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 180px', gap: 16, alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <span className="faint" style={{ fontSize: 12 }}>{r === 'heading' ? T('Titre', 'Heading') : T('Corps', 'Body')}</span>
              <span className="ell" style={{ fontFamily: FONTS[brand.fonts[r]].css, fontSize: r === 'heading' ? 26 : 15, fontWeight: r === 'heading' ? 700 : 400 }}>{T('Le test complet du Pixel 11', 'The full Pixel 11 review')}</span>
              <select className="input" value={brand.fonts[r]} onChange={(e) => setBrand({ fonts: { ...brand.fonts, [r]: e.target.value as FontKey } })}>
                {FONT_KEYS.map((k) => <option key={k} value={k}>{FONTS[k].label}</option>)}
              </select>
            </div>
          ))}
          <div style={{ padding: '10px 16px' }} className="faint">{T('Polices libres (licence OFL) servies par Google Fonts. L’import de polices personnelles arrive bientôt.', 'Free fonts (OFL license) served by Google Fonts. Importing your own fonts is coming soon.')}</div>
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow">{T('Ton de la marque', 'Brand voice')}</span><span className="faint" style={{ fontSize: 12 }}>{T('Texte libre utilisé par l’assistant pour rédiger.', 'Free text the assistant uses when writing.')}</span></div>
        <textarea id="brand-tone" className="input" rows={3} value={brand.tone} onChange={(e) => setBrand({ tone: e.target.value })} style={{ background: 'var(--panel)', fontSize: 13, lineHeight: 1.5 }} />
      </div>
    </div>
  );
}
