import { getSample, sampleErrorText, type Msg, type SampleTool } from '../lib/claude';
import type { AgentMode, Tier } from '../store/app';
import { overBudget, useUsage, type UsageSource } from '../lib/usage';
import { NEXT_RULE } from '../lib/ai';

// Agent loop (SPEC §9): Claude reads the document summary, calls page tools that go through
// the same engine as the UI, and reports what it did. Nothing is simulated.

export interface AgentTool {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
  required?: string[];
  write: boolean;
  run(input: Record<string, unknown>): unknown;
}

export interface Step { id: number; tool: string; args: string; status: 'run' | 'ok' | 'err'; note?: string; write: boolean }

export interface RunCallbacks {
  onText(text: string): void;
  onStep(step: Step): void;
}

export interface RunResult { text: string; error?: string; code?: string; truncated?: boolean; sentImages?: number }

let stepSeq = 0;

function summarizeArgs(a: Record<string, unknown>) {
  const s = JSON.stringify(a);
  return s.length > 90 ? s.slice(0, 87) + '…' : s;
}

export async function runAgent(opts: {
  rules: string;
  history: Msg[];
  prompt: string;
  mode: AgentMode;
  tier: Tier;
  tools: AgentTool[];
  signal: AbortSignal;
  fr: boolean;
  cb: RunCallbacks;
  source: UsageSource;
  images?: Blob[];
}): Promise<RunResult> {
  if (overBudget()) {
    return { text: '', code: 'budget', error: opts.fr ? 'Limite quotidienne de requêtes atteinte. Modifie-la dans Utilisation IA.' : 'Daily request limit reached. Change it in AI usage.' };
  }
  const sample = await getSample();
  if (!sample) {
    return {
      text: '',
      code: 'unavailable',
      error: opts.fr
        ? "L'assistant utilise ton compte Claude : ouvre cette application depuis claude.ai, connecté, pour l'activer. L'édition manuelle fonctionne partout."
        : 'The assistant runs on your Claude account: open this app from claude.ai, signed in, to turn it on. Manual editing works everywhere.',
    };
  }
  let toolsOk = true, maxImages = 0;
  try {
    const lim = await sample.limits();
    toolsOk = !!lim.tools;
    maxImages = lim.images?.maxCount ?? 0;
  } catch { toolsOk = false; }
  const images = maxImages ? (opts.images ?? []).slice(0, maxImages) : [];

  const usable = opts.tools.filter((t) => opts.mode !== 'ask' || !t.write);
  const sampleTools: SampleTool[] = toolsOk
    ? usable.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: { type: 'object', properties: t.schema ?? {}, required: t.required ?? [] },
        execute: async (input, ctx) => {
          if (ctx.signal.aborted) throw new Error('stopped');
          calls++;
          const step: Step = { id: ++stepSeq, tool: t.name, args: summarizeArgs(input), status: 'run', write: t.write };
          opts.cb.onStep({ ...step });
          try {
            const out = await t.run(input);
            opts.cb.onStep({ ...step, status: 'ok' });
            return out ?? { ok: true };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            opts.cb.onStep({ ...step, status: 'err', note: msg });
            throw e;
          }
        },
      }))
    : [];

  const modeLine = opts.mode === 'ask'
    ? (opts.fr ? 'MODE ASK : lecture seule. Explique et conseille, ne modifie rien.' : 'ASK MODE: read-only. Explain and advise, change nothing.')
    : !toolsOk
      ? (opts.fr ? "Les outils ne sont pas disponibles dans cette vue : réponds par des conseils concrets, sans prétendre avoir modifié le document." : 'Tools are unavailable in this view: answer with concrete advice and never claim you changed the document.')
      : (opts.fr ? 'Utilise les outils pour faire réellement les modifications demandées, puis résume ce que tu as fait.' : 'Use the tools to actually make the requested changes, then summarize what you did.');

  const input: Msg[] = [
    { role: 'user', content: opts.rules + '\n\n' + modeLine + '\n' + NEXT_RULE(opts.fr) },
    ...opts.history.slice(-8),
    { role: 'user', content: opts.prompt },
  ];
  // Adjacent same-role turns are allowed; make sure the list ends on the user.
  const t0 = performance.now();
  let calls = 0;
  const log = (status: 'ok' | 'error' | 'stopped', code?: string, chars = 0) => useUsage.getState().log({ source: opts.source, tier: opts.tier, tools: calls, ms: Math.round(performance.now() - t0), status, code, chars });
  try {
    const res = await sample(input, {
      signal: opts.signal,
      tools: sampleTools.length ? sampleTools : undefined,
      modelTier: opts.tier,
      images: images.length ? images : undefined,
      cache: sampleTools.length ? undefined : false,
      onText: ({ text }) => opts.cb.onText(text),
    });
    log('ok', undefined, res.text.length);
    return { text: res.text, truncated: res.truncated, sentImages: images.length };
  } catch (e) {
    const err = e as { code?: string; text?: string };
    if (err?.code === 'cancelled') { log('stopped', 'cancelled'); return { text: err.text ?? '', code: 'cancelled' }; }
    log('error', err?.code);
    return { text: err?.text ?? '', code: err?.code, error: sampleErrorText(err?.code, opts.fr) };
  }
}

// Coercion helpers for tool inputs (Claude's arguments are not validated by the platform).
export const num = (v: unknown, d?: number): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
export const str = (v: unknown, d?: string): string | undefined => (typeof v === 'string' ? v : v == null ? d : String(v));
export const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : undefined);
