import { describe, it, expect } from 'vitest';
import { seal, open } from '../src/keys';
import { PLANS, xofOf } from '../../app/src/lib/pricing';

describe('provider key vault', () => {
  it('round-trips, and refuses another wallet or a tampered ciphertext', async () => {
    const key = 'sk-ant-api03-' + 'x'.repeat(40);
    const s = await seal('server-secret', 'wallet-a|anthropic', key);
    expect(s.ciphertext).not.toContain('sk-ant');
    expect(await open('server-secret', 'wallet-a|anthropic', s.ciphertext, s.iv)).toBe(key);
    await expect(open('server-secret', 'wallet-b|anthropic', s.ciphertext, s.iv)).rejects.toThrow();
    await expect(open('other-secret', 'wallet-a|anthropic', s.ciphertext, s.iv)).rejects.toThrow();
  });
});

describe('plans', () => {
  it('own keys only on Pro and Team; FCFA follows the euro peg', () => {
    expect(PLANS.filter((p) => p.byok).map((p) => p.id)).toEqual(['pro', 'team']);
    expect(xofOf(7.99)).toBe(5250);
    expect(xofOf(19.99)).toBe(13100);
    expect(xofOf(10)).toBe(6550);
  });
});
