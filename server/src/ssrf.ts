// Outbound fetch safety for link analysis: only public http(s) hosts, no internal networks,
// no cloud metadata endpoints, DNS answers checked too (a public name can point inside).

export class BlockedError extends Error { constructor(public code: string, message: string) { super(message); } }

const BLOCKED_NAMES = [/^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i, /\.intranet$/i, /\.lan$/i, /\.home\.arpa$/i, /^metadata(\.google\.internal)?$/i, /^instance-data$/i];

function v4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  return p.every((x) => x <= 255) ? p : null;
}

export function isPrivateIp(ip: string): boolean {
  const a = v4(ip);
  if (a) {
    const [x, y] = a;
    return x === 0 || x === 10 || x === 127 || (x === 100 && y >= 64 && y <= 127) || (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31)
      || (x === 192 && y === 168) || (x === 192 && y === 0 && a[2] === 0) || (x === 198 && (y === 18 || y === 19)) || x >= 224;
  }
  const s = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (!s.includes(':')) return false;
  if (s === '::' || s === '::1') return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return /^(fc|fd)/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s) || s.startsWith('64:ff9b:') || s.startsWith('2001:db8');
}

export function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (BLOCKED_NAMES.some((re) => re.test(h))) return true;
  if (v4(h) || h.includes(':') || h.startsWith('[')) return isPrivateIp(h) || true; // IP literals: never, public or not (keeps the attack surface small)
  if (/^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) return true; // decimal / hex encoded IPs
  if (!h.includes('.')) return true; // single-label names resolve on internal networks
  return false;
}

export function parsePublicUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new BlockedError('bad_url', 'Adresse invalide'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new BlockedError('bad_url', 'Seules les adresses http et https sont acceptées');
  if (u.username || u.password) throw new BlockedError('bad_url', 'Adresse avec identifiants refusée');
  if (u.port && !['80', '443', '8080', '8443'].includes(u.port)) throw new BlockedError('blocked', 'Port non autorisé');
  if (isBlockedHostname(u.hostname)) throw new BlockedError('blocked', 'Adresse interne ou privée refusée');
  return u;
}

// Resolves the name with DNS-over-HTTPS and refuses private answers (DNS rebinding to LAN).
export async function assertPublicDns(host: string, fetcher: typeof fetch = fetch): Promise<void> {
  for (const type of ['A', 'AAAA']) {
    const r = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: 'application/dns-json' } }).catch(() => null);
    if (!r?.ok) continue;
    const j = await r.json().catch(() => ({})) as { Answer?: { type: number; data: string }[] };
    for (const a of j.Answer ?? []) if ((a.type === 1 || a.type === 28) && isPrivateIp(a.data)) throw new BlockedError('blocked', 'Ce nom de domaine pointe vers une adresse privée');
  }
}

// robots.txt: the most specific group for our agent (or *), longest matching rule wins.
export function robotsAllows(txt: string, path: string, agent = 'montajbot'): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
    } else if ((k === 'allow' || k === 'disallow') && cur) {
      lastWasAgent = false;
      if (v || k === 'allow') cur.rules.push({ allow: k === 'allow', path: v });
    } else lastWasAgent = false;
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.includes(a)));
  const group = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  const rules = group.flatMap((g) => g.rules);
  const toRe = (p: string) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!r.path) continue;
    if (toRe(r.path).test(path) && (!best || r.path.length > best.len || (r.path.length === best.len && r.allow))) best = { allow: r.allow, len: r.path.length };
  }
  return best ? best.allow : true;
}
