import type { Clip, Keyframe } from '../model/types';

export type KfProp = 'x' | 'y' | 'scale' | 'rot' | 'opacity';
export const KF_PROPS: KfProp[] = ['x', 'y', 'scale', 'rot', 'opacity'];
const base = (c: Clip, k: KfProp) => (k === 'scale' ? c.scale ?? 1 : k === 'opacity' ? c.opacity ?? 1 : (c[k] ?? 0));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// Transform of a clip at a local time, interpolated between keyframes (ease in-out).
// Properties a keyframe does not set keep the clip's base value.
export function transformAt(c: Clip, local: number): Record<KfProp, number> {
  const out = {} as Record<KfProp, number>;
  const kf = [...(c.kf ?? [])].sort((a, b) => a.t - b.t);
  for (const k of KF_PROPS) {
    const pts = kf.filter((f) => f[k] !== undefined) as (Keyframe & Record<KfProp, number>)[];
    if (!pts.length) { out[k] = base(c, k); continue; }
    if (local <= pts[0].t) { out[k] = pts[0][k]; continue; }
    const last = pts[pts.length - 1];
    if (local >= last.t) { out[k] = last[k]; continue; }
    const i = pts.findIndex((f) => f.t > local);
    const a = pts[i - 1], b = pts[i];
    out[k] = a[k] + (b[k] - a[k]) * ease((local - a.t) / (b.t - a.t));
  }
  return out;
}

export const kfIndexAt = (c: Clip, local: number) => (c.kf ?? []).findIndex((f) => Math.abs(f.t - local) < 0.04);

// Adds (or updates) a keyframe at a local time holding the clip's current transform.
export function upsertKf(c: Clip, local: number, patch?: Partial<Record<KfProp, number>>) {
  const cur = transformAt(c, local);
  const kf = c.kf ?? (c.kf = []);
  const i = kfIndexAt(c, local);
  const t = Math.round(Math.max(0, Math.min(c.dur, local)) * 100) / 100;
  const next: Keyframe = i >= 0 ? { ...cur, ...kf[i], ...patch, t: kf[i].t } : { t, ...cur, ...patch };
  if (i >= 0) kf[i] = next; else kf.push(next);
  kf.sort((a, b) => a.t - b.t);
}
