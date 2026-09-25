import { getSample } from './claude';

// Shared helpers for the AI features: what this view can send, and follow-up suggestions.

let limitsP: Promise<{ images: number; tools: boolean }> | null = null;
export function aiLimits(): Promise<{ images: number; tools: boolean }> {
  if (!limitsP) {
    limitsP = getSample().then(async (s) => {
      if (!s) return { images: 0, tools: false };
      try { const l = await s.limits(); return { images: l.images?.maxCount ?? 0, tools: !!l.tools }; } catch { return { images: 0, tools: false }; }
    });
  }
  return limitsP;
}

// Every assistant answer ends with one machine-read line of next steps, shown as chips.
export const NEXT_RULE = (fr: boolean) => fr
  ? 'Termine TOUJOURS ta réponse par une dernière ligne exactement au format « SUITE: idée 1 | idée 2 | idée 3 » : trois prochaines actions courtes (6 mots max chacune) que l’utilisateur pourrait te demander.'
  : 'ALWAYS end your answer with one last line exactly in the form "NEXT: idea 1 | idea 2 | idea 3": three short next requests (6 words max each) the user could ask you.';

const NEXT_RE = /\n?\s*(?:SUITE|NEXT)\s*:\s*([^\n]*)\s*$/i;
export function splitNext(text: string): { body: string; next: string[] } {
  const m = text.match(NEXT_RE);
  if (!m) {
    // While streaming, hide a follow-up line that is still being written.
    const cut = text.search(/\n\s*(?:SUITE|NEXT)\s*:?[^\n]*$/i);
    return { body: cut >= 0 ? text.slice(0, cut).trimEnd() : text, next: [] };
  }
  const next = m[1].split('|').map((x) => x.trim().replace(/^["«»“”]+|["«»“”.]+$/g, '')).filter((x) => x && x.length < 80).slice(0, 3);
  return { body: text.slice(0, m.index).trimEnd(), next };
}

export async function blobFromCanvas(c: HTMLCanvasElement, type = 'image/jpeg', q = 0.85): Promise<Blob | null> {
  return new Promise((res) => { try { c.toBlob((b) => res(b), type, q); } catch { res(null); } });
}
