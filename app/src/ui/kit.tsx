import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../store/app';

export function Switch({ on, onChange, label }: { on: boolean; onChange(v: boolean): void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={'sw' + (on ? ' on' : '')} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function Modal({ title, onClose, children, footer, width = 560, z = 50 }: { title: ReactNode; onClose(): void; children: ReactNode; footer?: ReactNode; width?: number; z?: number }) {
  return (
    <div className="overlay" style={{ zIndex: z }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" style={{ width }}>
        <div className="modal-h">
          <span>{title}</span>
          <button className="btn bare icon" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, small }: { options: { id: T; label: ReactNode; disabled?: boolean }[]; value: NoInfer<T> | NoInfer<T>[] | undefined; onChange(v: NoInfer<T>): void; small?: boolean }) {
  const on = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return (
    <div className="row wrap" style={{ gap: 4 }}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" disabled={o.disabled} className={'chip' + (small ? ' sm' : '') + (on(o.id) ? ' on' : '')} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  );
}

export function PageHead({ color, icon, title, sub, right }: { color: string; icon: ReactNode; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="t">
        <span className="badge-ic" style={{ background: color, boxShadow: `inset 0 1px 0 rgba(255,255,255,.25), 0 6px 16px color-mix(in oklab, ${color} 35%, transparent)` }}>{icon}</span>
        <h1 className="h1">{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Toast() {
  const toast = useApp((s) => s.toast);
  if (!toast) return null;
  const color = toast.kind === 'err' ? '#FF8A5B' : toast.kind === 'info' ? '#4DA3FF' : '#30D158';
  return (
    <div className="toast" role="status" key={toast.id}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flex: 'none' }} />
      {toast.text}
    </div>
  );
}

export function LogoMark({ size = 14 }: { size?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: size, marginTop: 4 }} aria-hidden>
      <span style={{ width: 4, height: '100%', borderRadius: 2, background: '#fff' }} />
      <span style={{ position: 'relative', width: 4, height: '52%', borderRadius: 2, background: '#fff' }}>
        <span style={{ position: 'absolute', left: '50%', top: -6, width: 4, height: 4, marginLeft: -2, borderRadius: '50%', background: '#FFD60A', boxShadow: '0 0 4px rgba(255,214,10,.8)' }} />
      </span>
      <span style={{ width: 4, height: '100%', borderRadius: 2, background: '#fff' }} />
    </span>
  );
}

export function ColorRow({ colors, value, onPick, size = 28 }: { colors: string[]; value?: string; onPick(c: string): void; size?: number }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {colors.map((c) => (
        <button key={c} type="button" title={c} onClick={() => onPick(c)} style={{ width: size, height: size, borderRadius: 10, border: value?.toUpperCase() === c.toUpperCase() ? '2px solid var(--acc)' : '1px solid var(--line2)', background: c, padding: 0 }} />
      ))}
      <label title="Couleur personnalisée" style={{ width: size, height: size, borderRadius: 10, border: '1px dashed var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', fontSize: 14, color: 'var(--tx2)' }}>
        +
        <input type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'} onChange={(e) => onPick(e.target.value.toUpperCase())} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
      </label>
    </div>
  );
}

export function NumField({ label, value, onChange, step = 1, id }: { label: string; value: number | undefined; onChange(v: number): void; step?: number; id: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        id={id}
        className="input mono"
        type="number"
        step={step}
        value={value === undefined ? '' : Math.round(value * 100) / 100}
        onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
        style={{ height: 28, width: '100%' }}
      />
    </label>
  );
}

export function Progress({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <div className="row mono" style={{ justifyContent: 'space-between', fontSize: 10 }}><span>{label}</span><span>{Math.round(pct)} %</span></div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
