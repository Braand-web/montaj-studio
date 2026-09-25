import Anthropic from '@anthropic-ai/sdk';

// One model turn for the app's agent loop (tools execute in the browser, which owns the
// documents). Streams NDJSON: {"t":"d","d":text} … then {"t":"end",content,stop_reason}.

export interface ClaudeEnv { ANTHROPIC_API_KEY?: string; UPLOADS: R2Bucket }

type Tier = 'quick' | 'default' | 'complex';
interface Body {
  tier?: Tier;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools?: { name: string; description: string; input_schema: Anthropic.Beta.BetaTool['input_schema'] }[];
  documents?: string[]; // uploaded PDF ids, attached to messages[documentTurn]
  documentTurn?: number;
}

// "Rapide" is the app's fast tier; the other two run Claude Opus 5 at different effort levels.
const MODELS: Record<Tier, { model: string; effort?: 'medium' | 'high' }> = {
  quick: { model: 'claude-haiku-4-5' },
  default: { model: 'claude-opus-5', effort: 'medium' },
  complex: { model: 'claude-opus-5', effort: 'high' },
};

export class ClientError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); } }

function validate(b: unknown): Body {
  const body = b as Body;
  if (!body || !Array.isArray(body.messages) || !body.messages.length) throw new ClientError('invalid_request', 'messages required');
  if (body.messages.length > 80) throw new ClientError('prompt_too_large', 'too many turns');
  if (body.messages[0].role !== 'user') throw new ClientError('invalid_request', 'first turn must be user');
  if ((body.tools?.length ?? 0) > 64) throw new ClientError('invalid_request', 'too many tools');
  for (const t of body.tools ?? []) if (!/^[a-zA-Z0-9_-]{1,64}$/.test(t.name) || t.input_schema?.type !== 'object') throw new ClientError('invalid_request', 'bad tool ' + t.name);
  if ((body.documents?.length ?? 0) > 5) throw new ClientError('invalid_request', 'too many documents');
  return body;
}

function b64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function claudeTurn(env: ClaudeEnv, raw: unknown, ctx: ExecutionContext): Promise<Response> {
  if (!env.ANTHROPIC_API_KEY) throw new ClientError('sampling_disabled', 'ANTHROPIC_API_KEY is not configured on the server', 503);
  const body = validate(raw);
  const messages = body.messages;
  // PDFs are read natively by Claude (text and scanned pages), attached before the turn's text.
  if (body.documents?.length) {
    const i = Math.min(Math.max(0, body.documentTurn ?? messages.length - 1), messages.length - 1);
    const docs: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const id of body.documents) {
      if (!/^[a-z0-9-]{36}$/.test(id)) continue;
      const obj = await env.UPLOADS.get('u/' + id);
      if (!obj || obj.httpMetadata?.contentType !== 'application/pdf') continue;
      docs.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64(new Uint8Array(await obj.arrayBuffer())) }, title: obj.customMetadata?.name });
    }
    const turn = messages[i];
    const content: Anthropic.Beta.BetaContentBlockParam[] = typeof turn.content === 'string' ? [{ type: 'text', text: turn.content }] : [...turn.content];
    messages[i] = { role: turn.role, content: [...docs, ...content] };
  }
  const cfg = MODELS[body.tier ?? 'default'] ?? MODELS.default;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter();
  const enc = new TextEncoder();
  const send = (o: unknown) => w.write(enc.encode(JSON.stringify(o) + '\n'));
  const run = (async () => {
    try {
      const params: Anthropic.Beta.MessageCreateParamsStreaming = {
        model: cfg.model,
        max_tokens: 32000,
        messages,
        stream: true,
        ...(body.tools?.length ? { tools: body.tools.map((t) => ({ name: t.name, description: t.description.slice(0, 1024), input_schema: t.input_schema })) } : {}),
        ...(cfg.effort ? { output_config: { effort: cfg.effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      };
      const stream = client.beta.messages.stream(params);
      stream.on('text', (d) => { void send({ t: 'd', d }); });
      const msg = await stream.finalMessage();
      await send({ t: 'end', content: msg.content, stop_reason: msg.stop_reason });
    } catch (e) {
      let code = 'upstream_error';
      if (e instanceof Anthropic.RateLimitError) code = 'rate_limited';
      else if (e instanceof Anthropic.BadRequestError) code = /too long|too large|prompt is too long/i.test(e.message) ? 'prompt_too_large' : 'invalid_request';
      else if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) code = 'sampling_disabled';
      await send({ t: 'err', code, error: e instanceof Error ? e.message : String(e) }).catch(() => undefined);
    } finally {
      await w.close().catch(() => undefined);
    }
  })();
  ctx.waitUntil(run);
  return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
