import { describe, it, expect } from 'vitest';
import { verifyStripe, walletIdOk } from '../src/billing';
import { usdCost, creditsFor, PLANS } from '../../app/src/lib/pricing';

async function sign(secret: string, t: number, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('stripe signature', () => {
  const body = '{"id":"evt_1","type":"checkout.session.completed"}';
  it('accepts a valid signature and rejects tampering or stale timestamps', async () => {
    const t = Math.floor(Date.now() / 1000);
    const v1 = await sign('whsec_test', t, body);
    expect(await verifyStripe('whsec_test', `t=${t},v1=${v1}`, body)).toBe(true);
    expect(await verifyStripe('whsec_test', `t=${t},v1=${v1}`, body + ' ')).toBe(false);
    expect(await verifyStripe('whsec_other', `t=${t},v1=${v1}`, body)).toBe(false);
    expect(await verifyStripe('whsec_test', `t=${t},v1=${v1}`, body, (t + 600) * 1000)).toBe(false);
    expect(await verifyStripe('whsec_test', null, body)).toBe(false);
  });
});

describe('metering', () => {
  it('prices tokens with the markup and never charges 0', () => {
    // 10k input + 1k output on Opus 5: $0.05 + $0.025 = $0.075 → 0.075 × 0.92 × 2.5 × 100 = 17.25 → 18
    const usd = usdCost('claude-opus-5', { input_tokens: 10_000, output_tokens: 1_000 });
    expect(usd).toBeCloseTo(0.075, 6);
    expect(creditsFor(usd)).toBe(18);
    expect(creditsFor(0)).toBe(1);
    // cache reads are ~10× cheaper than fresh input
    const cached = usdCost('claude-opus-5', { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 10_000 });
    expect(cached).toBeCloseTo(0.005, 6);
  });
  it('keeps a margin on every paid plan even if all credits are spent', () => {
    for (const p of PLANS.filter((x) => x.eurMonth > 0)) {
      const providerEur = p.monthlyCredits / 100 / 2.5; // worst case: every credit consumed
      const net = p.eurMonth / 1.2 - (0.25 + p.eurMonth * 0.015); // after 20 % VAT and Stripe fees
      expect(net / providerEur, p.id).toBeGreaterThan(1.15);
    }
  });
  it('validates wallet ids', () => {
    expect(walletIdOk(crypto.randomUUID())).toBe(true);
    expect(walletIdOk("x' OR 1=1 --")).toBe(false);
    expect(walletIdOk(null)).toBe(false);
  });
});
