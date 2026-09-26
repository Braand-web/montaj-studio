import { planOf } from '../../app/src/lib/pricing';
import { BillingError, type BillingEnv, type Wallet } from './billing';

// "Your own API keys" (Pro and Team). Keys are encrypted at rest with AES-256-GCM under a key
// derived from the KEYS_SECRET Worker secret, bound to the wallet and provider (additional
// data), and never sent back to the browser: only the last 4 characters are.

export interface KeysEnv extends BillingEnv { KEYS_SECRET?: string }

// Providers whose key is used today. Others are listed in the app as coming soon.
export const LIVE_PROVIDERS = ['anthropic'] as const;
type Provider = (typeof LIVE_PROVIDERS)[number];
const FORMAT: Record<Provider, RegExp> = { anthropic: /^sk-ant-[A-Za-z0-9_-]{20,200}$/ };

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => { let s = ''; for (const c of u) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function aesKey(secret: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('montaj-provider-keys'), info: enc.encode('v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(secret: string, aad: string, plain: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, await aesKey(secret), enc.encode(plain));
  return { ciphertext: b64(new Uint8Array(ct)), iv: b64(iv) };
}
export async function open(secret: string, aad: string, ciphertext: string, iv: string): Promise<string> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv), additionalData: enc.encode(aad) }, await aesKey(secret), unb64(ciphertext));
  return new TextDecoder().decode(pt);
}

export const byokAvailable = (env: KeysEnv) => !!env.DB && !!env.KEYS_SECRET;

function allowed(env: KeysEnv, w: Wallet) {
  if (!byokAvailable(env)) throw new BillingError('byok_unavailable', 'Les clés personnelles ne sont pas activées sur ce serveur (secret KEYS_SECRET)', 503);
  if (!planOf(w.plan).byok) throw new BillingError('plan_required', 'Tes propres clés API sont incluses dans les formules Pro et Équipe', 402);
}

export async function listKeys(env: KeysEnv, w: Wallet) {
  const r = await env.DB!.prepare('SELECT provider, last4, created_at FROM provider_keys WHERE wallet_id = ?1').bind(w.id).all<{ provider: string; last4: string; created_at: number }>();
  return { available: byokAvailable(env), allowed: planOf(w.plan).byok, keys: r.results };
}

export async function saveKey(env: KeysEnv, w: Wallet, body: { provider?: string; key?: string }) {
  allowed(env, w);
  const provider = String(body.provider ?? '') as Provider;
  if (!LIVE_PROVIDERS.includes(provider)) throw new BillingError('invalid_request', 'Fournisseur pas encore pris en charge', 400);
  const key = String(body.key ?? '').trim();
  if (!FORMAT[provider].test(key)) throw new BillingError('invalid_key', 'Format de clé invalide (une clé Anthropic commence par sk-ant-)', 400);
  const { ciphertext, iv } = await seal(env.KEYS_SECRET!, `${w.id}|${provider}`, key);
  await env.DB!.prepare('INSERT INTO provider_keys (wallet_id, provider, ciphertext, iv, last4, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT (wallet_id, provider) DO UPDATE SET ciphertext = ?3, iv = ?4, last4 = ?5, created_at = ?6')
    .bind(w.id, provider, ciphertext, iv, key.slice(-4), Date.now()).run();
  return listKeys(env, w);
}

export async function deleteKey(env: KeysEnv, w: Wallet, provider: string) {
  await env.DB!.prepare('DELETE FROM provider_keys WHERE wallet_id = ?1 AND provider = ?2').bind(w.id, provider).run();
  return listKeys(env, w);
}

// The wallet's own key for a provider, or null (no key, plan without keys, or vault off).
export async function userKey(env: KeysEnv, w: Wallet | null, provider: Provider): Promise<string | null> {
  if (!w || !byokAvailable(env) || !planOf(w.plan).byok) return null;
  const row = await env.DB!.prepare('SELECT ciphertext, iv FROM provider_keys WHERE wallet_id = ?1 AND provider = ?2').bind(w.id, provider).first<{ ciphertext: string; iv: string }>();
  if (!row) return null;
  try { return await open(env.KEYS_SECRET!, `${w.id}|${provider}`, row.ciphertext, row.iv); } catch { return null; }
}
