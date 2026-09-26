import { PLANS, PACKS, PACK_VALIDITY_DAYS, planOf, MIN_TO_START, type Tier, type PlanId, type PackId } from '../../app/src/lib/pricing';

// Credit wallets on D1. Until accounts exist (Supabase), a wallet is identified by a random
// device id the app keeps (x-montaj-wallet). Free credits are granted once per new wallet,
// with a cap on new wallets per IP per day to limit abuse.

export interface BillingEnv {
  DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_CREATOR?: string; STRIPE_PRICE_PRO?: string; STRIPE_PRICE_TEAM?: string;
  STRIPE_PRICE_CREATOR_YEAR?: string; STRIPE_PRICE_PRO_YEAR?: string; STRIPE_PRICE_TEAM_YEAR?: string;
}

export class BillingError extends Error { constructor(public code: string, message: string, public status = 402) { super(message); } }

export interface Wallet {
  id: string; plan: PlanId; seats: number; sub_credits: number; pack_credits: number; pack_expires_at: number | null;
  period_start: number; stripe_customer: string | null; stripe_subscription: string | null;
}

const DAY = 86_400_000;
const PERIOD = 30 * DAY;
const today = () => new Date().toISOString().slice(0, 10);
const NEW_WALLETS_PER_IP_DAY = 3;

export const walletIdOk = (id: string | null): id is string => !!id && /^[a-f0-9-]{36}$/.test(id);

async function bump(db: D1Database, key: string): Promise<number> {
  const r = await db.prepare('INSERT INTO daily (key, day, count) VALUES (?1, ?2, 1) ON CONFLICT (key, day) DO UPDATE SET count = count + 1 RETURNING count').bind(key, today()).first<{ count: number }>();
  return r?.count ?? 1;
}
async function peek(db: D1Database, key: string): Promise<number> {
  const r = await db.prepare('SELECT count FROM daily WHERE key = ?1 AND day = ?2').bind(key, today()).first<{ count: number }>();
  return r?.count ?? 0;
}

async function log(db: D1Database, w: Wallet, kind: string, credits: number, extra: Partial<{ model: string; tier: string; tokens_in: number; tokens_out: number; cache_read: number; cache_write: number; cost_usd: number; ref: string }> = {}) {
  await db.prepare('INSERT INTO ledger (id, wallet_id, at, kind, credits, balance_after, model, tier, tokens_in, tokens_out, cache_read, cache_write, cost_usd, ref) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)')
    .bind(crypto.randomUUID(), w.id, Date.now(), kind, credits, w.sub_credits + w.pack_credits, extra.model ?? null, extra.tier ?? null, extra.tokens_in ?? null, extra.tokens_out ?? null, extra.cache_read ?? null, extra.cache_write ?? null, extra.cost_usd ?? null, extra.ref ?? null).run();
}

// Loads (or creates) the wallet and applies what time implies: free monthly refill, pack expiry.
export async function getWallet(env: BillingEnv, id: string, ip: string): Promise<Wallet> {
  const db = env.DB;
  if (!db) throw new BillingError('billing_unavailable', 'Base de facturation non configurée', 503);
  let w = await db.prepare('SELECT * FROM wallets WHERE id = ?1').bind(id).first<Wallet>();
  const now = Date.now();
  if (!w) {
    // Many people can share one IP (mobile carriers, offices): past the daily cap the wallet is
    // still created, only without the welcome credits, so nobody is locked out.
    const capped = (await peek(db, 'ip:' + ip)) >= NEW_WALLETS_PER_IP_DAY;
    await bump(db, 'ip:' + ip);
    const free = capped ? 0 : planOf('free').monthlyCredits;
    await db.prepare('INSERT INTO wallets (id, plan, seats, sub_credits, pack_credits, period_start, created_ip, created_at, updated_at) VALUES (?1, \'free\', 1, ?2, 0, ?3, ?4, ?3, ?3)').bind(id, free, now, ip).run();
    w = { id, plan: 'free', seats: 1, sub_credits: free, pack_credits: 0, pack_expires_at: null, period_start: now, stripe_customer: null, stripe_subscription: null };
    await log(db, w, 'grant', free, { ref: capped ? 'welcome-capped' : 'welcome' });
    return w;
  }
  let changed = false;
  if (w.pack_credits > 0 && w.pack_expires_at && w.pack_expires_at < now) { await log(db, { ...w, pack_credits: 0 }, 'expire', -w.pack_credits); w.pack_credits = 0; w.pack_expires_at = null; changed = true; }
  // Free plan refills with time; paid plans refill when Stripe confirms the renewal payment.
  if (w.plan === 'free' && now - w.period_start >= PERIOD) {
    const periods = Math.floor((now - w.period_start) / PERIOD);
    w.period_start += periods * PERIOD;
    w.sub_credits = planOf('free').monthlyCredits;
    changed = true;
    await log(db, w, 'refill', w.sub_credits, { ref: 'free-month' });
  }
  if (changed) await db.prepare('UPDATE wallets SET sub_credits = ?2, pack_credits = ?3, pack_expires_at = ?4, period_start = ?5, updated_at = ?6 WHERE id = ?1').bind(w.id, w.sub_credits, w.pack_credits, w.pack_expires_at, w.period_start, now).run();
  return w;
}

// Before an AI call: plan allows the tier, daily cap not reached, enough credits to start.
export async function authorize(env: BillingEnv, w: Wallet, tier: Tier, ownKey = false): Promise<void> {
  const plan = planOf(w.plan);
  if (!plan.tiers.includes(tier)) throw new BillingError('plan_required', 'Le modèle Avancé est inclus dans les formules Pro et Équipe', 402);
  const n = await peek(env.DB!, w.id);
  if (n >= plan.dailyRequests * (plan.perSeat ? w.seats : 1)) throw new BillingError('daily_cap', `Limite de ${plan.dailyRequests} requêtes IA par jour atteinte pour la formule ${plan.fr}`, 429);
  if (!ownKey && w.sub_credits + w.pack_credits < MIN_TO_START[tier]) throw new BillingError('insufficient_credits', 'Crédits insuffisants : recharge ou change de formule', 402);
  await bump(env.DB!, w.id);
}

// Charges what a call really cost (monthly credits first, then packs). Never below zero:
// the last call of a balance is absorbed rather than blocked mid-answer.
export async function charge(env: BillingEnv, w: Wallet, credits: number, kind: string, extra: Parameters<typeof log>[4] = {}): Promise<Wallet> {
  const fromSub = Math.min(w.sub_credits, credits);
  const fromPack = Math.min(w.pack_credits, credits - fromSub);
  const next = { ...w, sub_credits: w.sub_credits - fromSub, pack_credits: w.pack_credits - fromPack };
  await env.DB!.prepare('UPDATE wallets SET sub_credits = MAX(0, sub_credits - ?2), pack_credits = MAX(0, pack_credits - ?3), updated_at = ?4 WHERE id = ?1').bind(w.id, fromSub, fromPack, Date.now()).run();
  await log(env.DB!, next, kind, -credits, extra);
  return next;
}

export async function walletView(env: BillingEnv, w: Wallet) {
  const rows = await env.DB!.prepare('SELECT at, kind, credits, balance_after, model, tier, tokens_in, tokens_out, cache_read, cost_usd, ref FROM ledger WHERE wallet_id = ?1 ORDER BY at DESC LIMIT 60').bind(w.id).all();
  const plan = planOf(w.plan);
  return {
    id: w.id, plan: w.plan, seats: w.seats,
    credits: { sub: w.sub_credits, pack: w.pack_credits, total: w.sub_credits + w.pack_credits, monthly: plan.monthlyCredits * (plan.perSeat ? w.seats : 1) },
    periodEnds: w.period_start + PERIOD, packExpires: w.pack_expires_at,
    today: { requests: await peek(env.DB!, w.id), cap: plan.dailyRequests * (plan.perSeat ? w.seats : 1) },
    hasSubscription: !!w.stripe_subscription,
    ledger: rows.results,
  };
}

// ---------------- Stripe ----------------

async function stripe(env: BillingEnv, path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const j = await r.json() as Record<string, unknown> & { error?: { message?: string } };
  if (!r.ok) throw new BillingError('payment_error', j.error?.message ?? 'Stripe error', 502);
  return j;
}

const PRICE_ENV: Record<Exclude<PlanId, 'free'>, [keyof BillingEnv, keyof BillingEnv]> = {
  creator: ['STRIPE_PRICE_CREATOR', 'STRIPE_PRICE_CREATOR_YEAR'], pro: ['STRIPE_PRICE_PRO', 'STRIPE_PRICE_PRO_YEAR'], team: ['STRIPE_PRICE_TEAM', 'STRIPE_PRICE_TEAM_YEAR'],
};

export const billingConfig = (env: BillingEnv) => ({
  stripe: !!env.STRIPE_SECRET_KEY,
  plans: Object.fromEntries(Object.entries(PRICE_ENV).map(([k, [m, y]]) => [k, { month: !!env[m], year: !!env[y] }])),
  packs: !!env.STRIPE_SECRET_KEY,
  mobileMoney: false,
});

export async function checkout(env: BillingEnv, w: Wallet, origin: string, body: { item?: string; interval?: string; seats?: number }): Promise<{ url: string }> {
  if (!env.STRIPE_SECRET_KEY) throw new BillingError('payment_unavailable', 'Paiement pas encore activé sur ce serveur', 503);
  const item = String(body.item ?? '');
  const base: Record<string, string> = {
    success_url: `${origin}/#/credits?checkout=success`, cancel_url: `${origin}/#/credits?checkout=cancel`,
    client_reference_id: w.id, 'metadata[wallet]': w.id, 'metadata[item]': item, locale: 'auto', allow_promotion_codes: 'true',
  };
  if (w.stripe_customer) base.customer = w.stripe_customer;
  const pack = PACKS.find((p) => p.id === item);
  if (pack) {
    const s = await stripe(env, 'checkout/sessions', {
      ...base, mode: 'payment',
      'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(Math.round(pack.eur * 100)),
      'line_items[0][price_data][product_data][name]': `Montaj Studio — ${pack.credits.toLocaleString('fr-FR')} crédits`,
      ...(w.stripe_customer ? {} : { customer_creation: 'always' }),
    });
    return { url: String(s.url) };
  }
  const plan = PLANS.find((p) => p.id === item && p.id !== 'free');
  if (!plan) throw new BillingError('invalid_request', 'Article inconnu', 400);
  const [m, y] = PRICE_ENV[plan.id as Exclude<PlanId, 'free'>];
  const price = body.interval === 'year' ? env[y] : env[m];
  if (!price) throw new BillingError('payment_unavailable', `Prix Stripe non configuré pour ${plan.fr}`, 503);
  const seats = plan.perSeat ? Math.max(plan.minSeats ?? 1, Math.min(200, Number(body.seats ?? plan.minSeats ?? 1))) : 1;
  const s = await stripe(env, 'checkout/sessions', {
    ...base, mode: 'subscription', 'line_items[0][price]': String(price), 'line_items[0][quantity]': String(seats),
    'subscription_data[metadata][wallet]': w.id, 'subscription_data[metadata][plan]': plan.id, 'metadata[seats]': String(seats),
  });
  return { url: String(s.url) };
}

export async function portal(env: BillingEnv, w: Wallet, origin: string): Promise<{ url: string }> {
  if (!env.STRIPE_SECRET_KEY || !w.stripe_customer) throw new BillingError('payment_unavailable', 'Aucun abonnement à gérer', 400);
  const s = await stripe(env, 'billing_portal/sessions', { customer: w.stripe_customer, return_url: `${origin}/#/credits` });
  return { url: String(s.url) };
}

// Stripe-Signature: t=…,v1=… — HMAC-SHA256 of `${t}.${body}`, 5-minute tolerance.
export async function verifyStripe(secret: string, header: string | null, body: string, now = Date.now()): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const sent = header.split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  return sent.some((s) => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

async function once(db: D1Database, id: string, wallet: string, item: string, amount: number | null, currency: string | null, credits: number): Promise<boolean> {
  const r = await db.prepare('INSERT INTO purchases (id, wallet_id, provider, item, amount_cents, currency, credits, status, at) VALUES (?1, ?2, \'stripe\', ?3, ?4, ?5, ?6, \'paid\', ?7) ON CONFLICT (id) DO NOTHING').bind(id, wallet, item, amount, currency, credits, Date.now()).run();
  return (r.meta.changes ?? 0) > 0;
}

type StripeObj = Record<string, unknown> & { id: string; metadata?: Record<string, string> };

export async function stripeEvent(env: BillingEnv, ev: { id: string; type: string; data: { object: StripeObj } }): Promise<void> {
  const db = env.DB!;
  const o = ev.data.object;
  const load = (id: string) => db.prepare('SELECT * FROM wallets WHERE id = ?1').bind(id).first<Wallet>();
  if (ev.type === 'checkout.session.completed') {
    const walletId = (o.client_reference_id as string) ?? o.metadata?.wallet;
    const item = o.metadata?.item ?? '';
    const w = walletId ? await load(walletId) : null;
    if (!w) return;
    const customer = (o.customer as string) ?? w.stripe_customer;
    const pack = PACKS.find((p) => p.id === (item as PackId));
    if (pack) {
      if (!(await once(db, o.id, w.id, item, o.amount_total as number, o.currency as string, pack.credits))) return;
      const exp = Date.now() + PACK_VALIDITY_DAYS * DAY;
      await db.prepare('UPDATE wallets SET pack_credits = pack_credits + ?2, pack_expires_at = ?3, stripe_customer = COALESCE(?4, stripe_customer), updated_at = ?5 WHERE id = ?1').bind(w.id, pack.credits, exp, customer, Date.now()).run();
      await log(db, { ...w, pack_credits: w.pack_credits + pack.credits }, 'purchase', pack.credits, { ref: item });
      return;
    }
    const plan = PLANS.find((p) => p.id === item);
    if (!plan || plan.id === 'free') return;
    const seats = Math.max(1, Number(o.metadata?.seats ?? 1));
    const monthly = plan.monthlyCredits * (plan.perSeat ? seats : 1);
    if (!(await once(db, o.id, w.id, item, o.amount_total as number, o.currency as string, monthly))) return;
    await db.prepare('UPDATE wallets SET plan = ?2, seats = ?3, sub_credits = ?4, period_start = ?5, stripe_customer = ?6, stripe_subscription = ?7, updated_at = ?5 WHERE id = ?1')
      .bind(w.id, plan.id, seats, monthly, Date.now(), customer, o.subscription as string).run();
    await log(db, { ...w, sub_credits: monthly }, 'plan', monthly, { ref: plan.id });
  } else if (ev.type === 'invoice.paid' && o.billing_reason === 'subscription_cycle') {
    const w = await db.prepare('SELECT * FROM wallets WHERE stripe_subscription = ?1').bind(o.subscription as string).first<Wallet>();
    if (!w) return;
    const plan = planOf(w.plan);
    const monthly = plan.monthlyCredits * (plan.perSeat ? w.seats : 1);
    if (!(await once(db, o.id, w.id, 'renewal:' + w.plan, o.amount_paid as number, o.currency as string, monthly))) return;
    await db.prepare('UPDATE wallets SET sub_credits = ?2, period_start = ?3, updated_at = ?3 WHERE id = ?1').bind(w.id, monthly, Date.now()).run();
    await log(db, { ...w, sub_credits: monthly }, 'refill', monthly, { ref: 'renewal' });
  } else if (ev.type === 'customer.subscription.deleted') {
    const w = await db.prepare('SELECT * FROM wallets WHERE stripe_subscription = ?1').bind(o.id).first<Wallet>();
    if (!w) return;
    const free = planOf('free').monthlyCredits;
    await db.prepare('UPDATE wallets SET plan = \'free\', seats = 1, sub_credits = MIN(sub_credits, ?2), stripe_subscription = NULL, period_start = ?3, updated_at = ?3 WHERE id = ?1').bind(w.id, free, Date.now()).run();
    await log(db, { ...w, sub_credits: Math.min(w.sub_credits, free) }, 'plan', 0, { ref: 'cancelled' });
  }
}
