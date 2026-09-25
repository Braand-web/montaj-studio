import type { Msg, SampleFn, SampleOptions } from './claude';
import { apiHeaders } from './attach/backend';
import { useWallet } from './wallet';

// Same contract as the claude.ai `sample` capability, served by the Montaj Worker (/api/claude)
// with the owner's Anthropic API key. The tool loop runs here, in the page, because the tools
// edit the documents stored in this browser.

type Block = Record<string, unknown> & { type: string };
type ApiMsg = { role: 'user' | 'assistant'; content: string | Block[] };

const MAX_ROUNDS = 10;

async function b64(blob: Blob): Promise<{ data: string; media: string }> {
  // Downscale large images (the model sees ~1.5 MP at most) to keep requests small.
  let out: Blob = blob;
  try {
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
    if (s < 1 || !/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) {
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      out = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.88));
    }
  } catch { /* keep original */ }
  const buf = new Uint8Array(await out.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), media: out.type || 'image/jpeg' };
}

function toApi(input: string | Msg[]): ApiMsg[] {
  const list: Msg[] = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const out: ApiMsg[] = [];
  for (const m of list) {
    const last = out[out.length - 1];
    if (last && last.role === m.role && typeof last.content === 'string') last.content += '\n\n' + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  return out;
}

class SampleError { constructor(public code: string, public message: string, public text?: string) {} }

async function round(body: unknown, signal: AbortSignal | undefined, onDelta: (d: string) => void): Promise<{ content: Block[]; stop_reason: string }> {
  const r = await fetch('/api/claude', { method: 'POST', signal, headers: apiHeaders({ 'content-type': 'application/json' }), body: JSON.stringify(body) });
  if (!r.ok || !r.body) {
    const j = await r.json().catch(() => ({})) as { code?: string; error?: string };
    throw new SampleError(j.code ?? (r.status === 429 ? 'rate_limited' : r.status === 401 || r.status === 403 ? 'not_granted' : 'upstream_error'), j.error ?? `HTTP ${r.status}`);
  }
  // NDJSON: {"t":"d","d":"text delta"} … then {"t":"end","content":[…],"stop_reason":"…"} or {"t":"err",…}
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line) as { t: string; d?: string; content?: Block[]; stop_reason?: string; code?: string; error?: string; billing?: { credits: number; balance: number } };
      if (ev.t === 'd' && ev.d) onDelta(ev.d);
      else if (ev.t === 'end' && ev.billing) useWallet.getState().applyCharge(ev.billing.balance);
      if (ev.t === 'end') return { content: ev.content ?? [], stop_reason: ev.stop_reason ?? 'end_turn' };
      else if (ev.t === 'err') throw new SampleError(ev.code ?? 'upstream_error', ev.error ?? 'error');
    }
  }
  throw new SampleError('upstream_error', 'Réponse interrompue');
}

async function run(input: string | Msg[], opts: SampleOptions & { documents?: string[] } = {}) {
  const messages = toApi(input);
  if (messages[0]?.role !== 'user' || messages[messages.length - 1]?.role !== 'user') throw new SampleError('invalid_request', 'turns must start and end on user');
  // Images and PDFs ride on the last user turn, before its text.
  const lastIdx = messages.length - 1;
  const extra: Block[] = [];
  for (const img of opts.images ?? []) { const { data, media } = await b64(img); extra.push({ type: 'image', source: { type: 'base64', media_type: media, data } }); }
  if (extra.length) messages[lastIdx] = { role: 'user', content: [...extra, { type: 'text', text: String(messages[lastIdx].content) }] };
  const tools = (opts.tools ?? []).map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema ?? { type: 'object', properties: {} } }));
  let text = '';
  const emit = (d: string) => { text += d; opts.onText?.({ text, delta: d }); };
  let stop = 'end_turn';
  for (let r = 0; r < MAX_ROUNDS; r++) {
    if (opts.signal?.aborted) throw new SampleError('cancelled', 'cancelled', text);
    if (r > 0 && text && !text.endsWith('\n\n')) emit('\n\n');
    const res = await round({ tier: opts.modelTier ?? 'default', messages, tools, documents: r === 0 ? opts.documents ?? [] : [], documentTurn: lastIdx }, opts.signal, emit)
      .catch((e) => { if ((e as Error).name === 'AbortError') throw new SampleError('cancelled', 'cancelled', text); if (e instanceof SampleError) { e.text = text || undefined; } throw e; });
    stop = res.stop_reason;
    if (stop === 'refusal') throw new SampleError('refused', 'Claude declined this request');
    const uses = res.content.filter((b) => b.type === 'tool_use') as (Block & { id: string; name: string; input: Record<string, unknown> })[];
    messages.push({ role: 'assistant', content: res.content });
    if (!uses.length || stop !== 'tool_use') break;
    const ctl = new AbortController();
    opts.signal?.addEventListener('abort', () => ctl.abort());
    const results = await Promise.all(uses.map(async (u) => {
      const tool = opts.tools!.find((t) => t.name === u.name);
      try {
        if (!tool) throw new Error('Unknown tool ' + u.name);
        const out = await tool.execute(u.input ?? {}, { signal: ctl.signal });
        const s = typeof out === 'string' ? out : JSON.stringify(out ?? { ok: true });
        return { type: 'tool_result', tool_use_id: u.id, content: s.slice(0, 32_000) };
      } catch (e) {
        return { type: 'tool_result', tool_use_id: u.id, content: 'Error: ' + ((e as Error)?.message ?? String(e)), is_error: true };
      }
    }));
    messages.push({ role: 'user', content: results });
  }
  if (!text.trim()) throw new SampleError('empty_completion', 'no text');
  return { text, truncated: stop === 'max_tokens', modelTierApplied: opts.modelTier ?? 'default' };
}

export function serverSample(): SampleFn {
  const fn = ((input: string | Msg[], opts?: SampleOptions) => run(input, opts)) as SampleFn;
  fn.json = async <T,>(input: string | Msg[], opts?: SampleOptions) => {
    const { text } = await run(input, { ...opts, tools: undefined });
    const tryParse = (s: string) => { try { return JSON.parse(s) as T; } catch { return undefined; } };
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1];
    const a = text.search(/[[{]/), b = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    const v = tryParse(text.trim()) ?? (fence ? tryParse(fence) : undefined) ?? (a >= 0 && b > a ? tryParse(text.slice(a, b + 1)) : undefined);
    if (v === undefined) throw new SampleError('invalid_json', 'no JSON value in the reply', text);
    return v;
  };
  fn.limits = async () => ({ maxPromptBytes: 400_000, images: { maxCount: 20 }, tools: { maxCount: 64 } });
  return fn;
}
