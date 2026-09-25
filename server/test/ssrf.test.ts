import { describe, expect, it } from 'vitest';
import { isPrivateIp, isBlockedHostname, parsePublicUrl, robotsAllows, assertPublicDns } from '../src/ssrf';

describe('SSRF protection', () => {
  it('flags private and special IPs', () => {
    for (const ip of ['127.0.0.1', '10.2.3.4', '192.168.1.10', '172.16.0.1', '172.31.255.255', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '172.32.0.1', '1.1.1.1', '2606:4700::1111']) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it('blocks internal hostnames and every IP literal', () => {
    for (const h of ['localhost', 'app.localhost', 'printer.local', 'metadata.google.internal', 'router', '127.0.0.1', '8.8.8.8', '2130706433', '0x7f000001', '[::1]']) expect(isBlockedHostname(h), h).toBe(true);
    expect(isBlockedHostname('example.com')).toBe(false);
  });
  it('validates URLs', () => {
    expect(parsePublicUrl('https://example.com/a?b=1').hostname).toBe('example.com');
    expect(() => parsePublicUrl('file:///etc/passwd')).toThrow();
    expect(() => parsePublicUrl('http://169.254.169.254/latest/meta-data')).toThrow();
    expect(() => parsePublicUrl('http://user:pw@example.com')).toThrow();
    expect(() => parsePublicUrl('http://example.com:22')).toThrow();
  });
  it('refuses names that resolve to private addresses', async () => {
    const fake = (async (u: string) => new Response(JSON.stringify({ Answer: u.includes('type=A&') || u.endsWith('type=A') ? [{ type: 1, data: '10.0.0.5' }] : [] }))) as unknown as typeof fetch;
    await expect(assertPublicDns('evil.example', fake)).rejects.toThrow();
    const ok = (async () => new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }))) as unknown as typeof fetch;
    await expect(assertPublicDns('example.com', ok)).resolves.toBeUndefined();
  });
  it('follows robots.txt', () => {
    const txt = 'User-agent: *\nDisallow: /private\nAllow: /private/ok\n\nUser-agent: MontajBot\nDisallow: /nobots\n';
    expect(robotsAllows(txt, '/private/x', 'otherbot')).toBe(false);
    expect(robotsAllows(txt, '/nobots/page')).toBe(false);
    expect(robotsAllows(txt, '/private/x', 'otherbot')).toBe(false);
    expect(robotsAllows(txt, '/private/ok/y', 'otherbot')).toBe(true);
    expect(robotsAllows(txt, '/private/x', 'montajbot')).toBe(true); // our own group replaces *
    expect(robotsAllows('User-agent: *\nDisallow: /', '/anything')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow:', '/anything')).toBe(true);
  });
});
