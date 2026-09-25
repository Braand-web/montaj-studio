import { X, FileText, FileSpreadsheet, FileCode, FileArchive, Film, Image as ImageIcon, Globe, LoaderCircle, CircleAlert, File as FileIcon } from 'lucide-react';
import { useT } from '../store/app';
import type { Attachment } from '../lib/attach/process';
import type { LinkInfo } from '../lib/attach/links';
import { fmtSize, type FileKind } from '../lib/attach/extract';

const ICON: Partial<Record<FileKind, typeof FileText>> = { pdf: FileText, docx: FileText, text: FileText, xlsx: FileSpreadsheet, csv: FileSpreadsheet, code: FileCode, json: FileCode, zip: FileArchive, video: Film, image: ImageIcon, svg: ImageIcon };
const TINT: Partial<Record<FileKind, string>> = { pdf: '#FF453A', docx: '#0A84FF', xlsx: '#30D158', csv: '#30D158', code: '#BF5AF2', json: '#BF5AF2', zip: '#FF9F0A', video: '#FF375F', text: '#8E8E93' };

export function AttachmentChip({ a, onRemove, compact }: { a: Attachment; onRemove?(): void; compact?: boolean }) {
  const T = useT();
  const I = ICON[a.kind] ?? FileIcon;
  const busy = a.status === 'uploading' || a.status === 'processing';
  return (
    <div className="att-chip" data-status={a.status} title={a.error ?? a.summary}>
      <span className="att-thumb" style={{ background: a.thumb ? `center/cover url(${a.thumb})` : `color-mix(in oklab, ${TINT[a.kind] ?? '#8E8E93'} 22%, var(--panel2))` }}>
        {!a.thumb && <I size={16} color={TINT[a.kind] ?? 'var(--tx2)'} />}
        {a.kind === 'video' && a.thumb && <span className="att-badge"><Film size={9} /></span>}
      </span>
      <span className="col grow" style={{ minWidth: 0, gap: 2 }}>
        <span className="ell" style={{ fontSize: 12, fontWeight: 500 }}><span className="faint">#{a.n}</span> {a.name}</span>
        {a.status === 'error'
          ? <span className="warn ell" style={{ fontSize: 10 }}><CircleAlert size={10} /> {a.error}</span>
          : busy
            ? (
              <span className="col" style={{ gap: 3 }}>
                <span className="att-bar"><span style={{ width: `${Math.round(a.progress * 100)}%` }} /></span>
                {!compact && <span className="faint ell" style={{ fontSize: 10 }}>{a.step ?? T('Traitement…', 'Processing…')}</span>}
              </span>
            )
            : <span className="faint ell" style={{ fontSize: 10 }}>{fmtSize(a.size)}{compact ? '' : ' · ' + a.summary}</span>}
      </span>
      {busy && <LoaderCircle size={13} className="spin" color="var(--tx3)" />}
      {onRemove && <button className="btn bare icon" aria-label={T('Retirer', 'Remove')} title={T('Retirer', 'Remove')} onClick={onRemove} style={{ width: 22, height: 22, flex: 'none' }}><X size={12} /></button>}
    </div>
  );
}

export function LinkCard({ l, onRemove }: { l: LinkInfo; onRemove?(): void }) {
  const T = useT();
  return (
    <div className="link-card" data-status={l.status}>
      {l.image ? <span className="link-img" style={{ backgroundImage: `url(${l.image})` }} /> : null}
      <span className="col grow" style={{ minWidth: 0, gap: 2 }}>
        <span className="row" style={{ gap: 6, minWidth: 0 }}>
          {l.favicon ? <img src={l.favicon} alt="" width={14} height={14} style={{ borderRadius: 3, flex: 'none' }} /> : <Globe size={13} color="var(--tx3)" style={{ flex: 'none' }} />}
          <span className="ell" style={{ fontSize: 12, fontWeight: 600 }}>{l.title || l.host}</span>
        </span>
        <span className="faint ell" style={{ fontSize: 10 }}>
          {l.status === 'analyzing' ? T('Analyse du lien…', 'Analyzing link…')
            : l.status === 'error' ? (l.error === 'unavailable' ? T('Analyse impossible ici : colle le texte ou envoie une capture', 'Cannot analyze here: paste the text or send a screenshot') : T('Échec : ', 'Failed: ') + l.error)
              : l.description || l.url}
        </span>
      </span>
      {l.status === 'analyzing' && <LoaderCircle size={13} className="spin" color="var(--tx3)" />}
      {onRemove && <button className="btn bare icon" aria-label={T('Ignorer ce lien', 'Ignore this link')} onClick={onRemove} style={{ width: 22, height: 22, flex: 'none' }}><X size={12} /></button>}
    </div>
  );
}
