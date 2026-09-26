import Anthropic from '@anthropic-ai/sdk';
import { MODEL_OF, usdCost, creditsFor } from '../../app/src/lib/pricing';
import { authorize, charge, type Wallet } from './billing';
import { userKey, type KeysEnv } from './keys';

// One model turn for the app's agent loop (tools execute in the browser, which owns the
// documents). Streams NDJSON: {"t":"d","d":text} … then {"t":"end",content,stop_reason}.

export interface ClaudeEnv extends KeysEnv { ANTHROPIC_API_KEY?: string; UPLOADS: R2Bucket }

type Tier = 'quick' | 'default' | 'complex';
interface Body {
  tier?: Tier;
  messages: Anthropic.Beta.BetaMessageParam[];
  tools?: { name: string; description: string; input_schema: Anthropic.Beta.BetaTool['input_schema'] }[];
  documents?: string[]; // uploaded PDF ids, attached to messages[documentTurn]
  documentTurn?: number;
}

// "Rapide" is the app's fast tier; the other two run Claude Opus 5 at different effort levels.
const MODELS = MODEL_OF;

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

export async function claudeTurn(env: ClaudeEnv, raw: unknown, ctx: ExecutionContext, wallet: Wallet | null): Promise<Response> {
  const body = validate(raw);
  const tier: Tier = body.tier === 'quick' || body.tier === 'complex' ? body.tier : 'default';
  // Pro and Team can bring their own Anthropic key: the call then runs on it and uses no credits.
  const own = await userKey(env, wallet, 'anthropic');
  const apiKey = own ?? env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ClientError('sampling_disabled', 'ANTHROPIC_API_KEY is not configured on the server', 503);
  if (wallet) await authorize(env, wallet, tier, !!own);
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
  const cfg = MODELS[tier];
  const client = new Anthropic({ apiKey });
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
        // Tools and instructions repeat on every round of the agent loop: cache them (~10× cheaper reads).
        cache_control: { type: 'ephemeral' },
        ...(body.tools?.length ? { tools: body.tools.map((t) => ({ name: t.name, description: t.description.slice(0, 1024), input_schema: t.input_schema })) } : {}),
        ...(cfg.effort ? { output_config: { effort: cfg.effort }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      };
      const stream = client.beta.messages.stream(params);
      stream.on('text', (d) => { void send({ t: 'd', d }); });
      const msg = await stream.finalMessage();
      // Metered billing on the real tokens of this round (the model that answered, fallbacks included).
      let billing: { credits: number; balance: number } | undefined;
      if (wallet) {
        const u = msg.usage;
        const usd = usdCost(msg.model, u);
        const credits = own ? 0 : creditsFor(usd);
        const w = await charge(env, wallet, credits, own ? 'byok' : 'ai', { model: msg.model, tier, tokens_in: u.input_tokens, tokens_out: u.output_tokens, cache_read: u.cache_read_input_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0, cost_usd: Math.round(usd * 1e6) / 1e6 });
        billing = { credits, balance: w.sub_credits + w.pack_credits };
      }
      await send({ t: 'end', content: msg.content, stop_reason: msg.stop_reason, billing });
    } catch (e) {
      let code = 'upstream_error';
      if (e instanceof Anthropic.RateLimitError) code = 'rate_limited';
      else if (e instanceof Anthropic.BadRequestError) code = /too long|too large|prompt is too long/i.test(e.message) ? 'prompt_too_large' : 'invalid_request';
      else if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) code = own ? 'own_key_invalid' : 'sampling_disabled';
      await send({ t: 'err', code, error: e instanceof Error ? e.message : String(e) }).catch(() => undefined);
    } finally {
      await w.close().catch(() => undefined);
    }
  })();
  ctx.waitUntil(run);
  return new Response(readable, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
