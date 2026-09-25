import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface MenuItem { label: string; icon?: React.ReactNode; kbd?: string; go(): void; danger?: boolean; disabled?: boolean }
export type MenuEntry = MenuItem | 'sep';

// Right-click menu shared by the editors. Stays inside the viewport and closes on outside
// click, Escape, scroll or window blur.
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuEntry[]; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) });
  }, [x, y]);
  useEffect(() => {
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    window.addEventListener('blur', onClose);
    window.addEventListener('wheel', onClose, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('wheel', onClose);
    };
  }, [onClose]);
  return (
    <div ref={ref} className="ctx-menu pop" role="menu" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) => it === 'sep'
        ? <div key={i} className="ctx-sep" />
        : (
          <button key={i} role="menuitem" disabled={it.disabled} className={'ctx-item' + (it.danger ? ' danger' : '')} onClick={() => { onClose(); it.go(); }}>
            <span className="ctx-ic">{it.icon}</span>
            <span className="grow">{it.label}</span>
            {it.kbd && <span className="mono ctx-kbd">{it.kbd}</span>}
          </button>
        ))}
    </div>
  );
}
