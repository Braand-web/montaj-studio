import type { CSSProperties } from 'react';
import type { El, Page } from '../model/types';
import { fontCss } from '../model/fonts';
import { prims } from './prims';
import { mediaUrlSync } from '../lib/media';
import { bgBoxColor, outlineColor, textInk, ANIM_DUR } from './render';
import { adjFilter, lsEm, shapePath } from './shapes';

// DOM view of one element. Coordinates are percentages of the page and type sizes are in
// container units, so the same markup renders the canvas, thumbnails and presentation mode.

const pct = (v: number, of: number) => `${(v / of) * 100}%`;
const cq = (v: number, pw: number) => `${(v / pw) * 100}cqw`;

export function ElementView({ el, page, animate, outline, onPointerDown, dim }: {
  el: El;
  page: Page;
  animate?: boolean;
  outline?: string;
  dim?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  if (el.hidden) return null;
  const pw = page.w;
  const base: CSSProperties = {
    position: 'absolute',
    left: pct(el.x, pw), top: pct(el.y, page.h), width: pct(el.w, pw), height: pct(el.h, page.h),
    opacity: (el.opacity ?? 1) * (dim ? 0.35 : 1),
    transform: [el.rot ? `rotate(${el.rot}deg)` : '', el.flipX ? 'scaleX(-1)' : '', el.flipY ? 'scaleY(-1)' : ''].filter(Boolean).join(' ') || undefined,
    outline, outlineOffset: 2,
    cursor: onPointerDown ? (el.locked ? 'default' : 'move') : undefined,
    userSelect: 'none',
    touchAction: 'none',
    animation: animate && el.anim && el.anim !== 'none' ? `ms-a-${el.anim} ${ANIM_DUR}s cubic-bezier(.2,.8,.2,1) ${el.delay ?? 0}s both` : undefined,
  };
  let inner: React.ReactNode = null;
  switch (el.type) {
    case 'rect':
      base.background = el.fill ?? '#FFD23F';
      base.borderRadius = cq(el.radius ?? 0, pw);
      if (el.stroke && el.strokeW) base.boxShadow = `inset 0 0 0 ${cq(el.strokeW, pw)} ${el.stroke}`;
      break;
    case 'circle':
      base.background = el.fill ?? '#FFD23F';
      base.borderRadius = '50%';
      break;
    case 'line':
      inner = <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: cq(Math.max(1, el.strokeW ?? 6), pw), transform: 'translateY(-50%)', background: el.fill ?? '#0F1115' }} />;
      break;
    case 'image': {
      const url = mediaUrlSync(el.mediaId);
      base.borderRadius = cq(el.radius ?? 0, pw);
      base.overflow = 'hidden';
      if (url) {
        inner = <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit ?? 'cover', display: 'block', pointerEvents: 'none', filter: adjFilter(el.adj, (px) => cq(px, pw)) }} />;
      } else {
        base.background = 'repeating-linear-gradient(135deg, rgba(140,140,140,.35) 0 10px, rgba(140,140,140,.16) 10px 20px), #2A2D31';
        inner = <span style={{ position: 'absolute', left: 6, bottom: 6, fontFamily: 'var(--mono)', fontSize: 10, color: '#C9CCD1', background: 'rgba(0,0,0,.45)', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap', maxWidth: 'calc(100% - 12px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{el.name} · photo</span>;
      }
      break;
    }
    case 'text': {
      const size = el.size ?? 48;
      const ink = textInk(el);
      Object.assign(base, {
        color: ink,
        fontFamily: fontCss(el.font),
        fontSize: cq(size, pw),
        fontWeight: el.weight ?? 700,
        lineHeight: el.lh ?? 1.1,
        letterSpacing: `${lsEm(el.ls)}em`,
        fontStyle: el.italic ? 'italic' : undefined,
        textAlign: el.align ?? 'left',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        textTransform: el.upper ? 'uppercase' : undefined,
        textShadow: el.fx?.shadow ? '0 .04em .16em rgba(0,0,0,.45)' : undefined,
        WebkitTextStroke: el.fx?.outline ? `.12em ${outlineColor(ink)}` : undefined,
        paintOrder: el.fx?.outline ? 'stroke fill' : undefined,
        background: el.fx?.bg ? bgBoxColor(ink) : undefined,
        borderRadius: el.fx?.bg ? '.18em' : undefined,
        boxShadow: el.fx?.bg ? `0 0 0 .2em ${bgBoxColor(ink)}` : undefined,
      } as CSSProperties);
      inner = el.text;
      break;
    }
    case 'shape':
      inner = (
        <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
          <path d={shapePath(el.shape ?? 'star', el.w, el.h)} fill={el.fill ?? '#FFD23F'} stroke={el.stroke && el.strokeW ? el.stroke : undefined} strokeWidth={el.strokeW || undefined} strokeLinejoin="round" />
        </svg>
      );
      break;
    case 'chart':
    case 'table':
    case 'qr': {
      const ps = prims(el);
      inner = (
        <svg viewBox={`0 0 ${el.w} ${el.h}`} width="100%" height="100%" style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
          {ps.map((p, i) =>
            p.t === 'rect' ? (
              <rect key={i} x={p.x} y={p.y} width={Math.max(0, p.w)} height={Math.max(0, p.h)} rx={p.r ?? 0} fill={p.fill === 'transparent' ? 'none' : p.fill} stroke={p.stroke} strokeWidth={p.stroke ? Math.max(1, el.w / 400) : undefined} />
            ) : (
              <text key={i} x={p.x} y={p.y} fontSize={p.size} fill={p.color} fontWeight={p.weight} textAnchor={p.align} fontFamily={fontCss('sans')}>{p.text}</text>
            ),
          )}
        </svg>
      );
      break;
    }
  }
  return (
    <div data-id={el.id} style={base} onPointerDown={onPointerDown}>
      {inner}
    </div>
  );
}

export function PageView({ page, animate, style, children, onPointerDown }: {
  page: Page;
  animate?: boolean;
  style?: CSSProperties;
  children?: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ position: 'relative', aspectRatio: `${page.w}/${page.h}`, background: page.bg, containerType: 'inline-size', overflow: 'hidden', maxWidth: '100%', ...style }}
    >
      {page.els.map((el) => <ElementView key={el.id} el={el} page={page} animate={animate} />)}
      {children}
    </div>
  );
}
