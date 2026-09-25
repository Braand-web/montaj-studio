// Bridge to the claude.ai Artifact runtime. The page asks Claude through the viewer's own
// account (`sample`) and hands files to the viewer (`downloads`). Both are optional:
// outside claude.ai, `window.claude` is missing and every feature degrades.

import { backend } from './attach/backend';
import { serverSample } from './claudeServer';

export interface SampleTool {
  name: string;
  description: string;
  inputSchema?: { type: 'object'; properties?: Record<string, unknown>; required?: string[] };
  execute(input: Record<string, unknown>, ctx: { signal: AbortSignal }): unknown;
}
export interface SampleOptions {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  tools?: SampleTool[];
  modelTier?: 'quick' | 'default' | 'complex';
  cache?: boolean;
  images?: Blob[];
  documents?: string[]; // server only: ids of uploaded PDFs Claude reads natively (ignored by claude.ai)
}
export type Msg = { role: 'user' | 'assistant'; content: string };
export interface SampleFn {
  (input: string | Msg[], opts?: SampleOptions): Promise<{ text: string; truncated: boolean; modelTierApplied: string }>;
  json<T = unknown>(input: string | Msg[], opts?: SampleOptions): Promise<T>;
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number }; tools?: { maxCount: number } }>;
}
interface Downloads { save(r: { filename: string; data: Blob | string | ArrayBuffer }): Promise<{ status: string }> }

declare global {
  interface Window { claude?: { use(name: string): Promise<unknown> } }
}

let sampleP: Promise<SampleFn | null> | null = null;
let dlP: Promise<Downloads | null> | null = null;

// Inside claude.ai: the viewer's own Claude account. Hosted on Cloudflare: the Montaj server
// (owner's API key) through the same interface. Elsewhere: no AI.
export function getSample(): Promise<SampleFn | null> {
  if (!sampleP) {
    sampleP = window.claude?.use
      ? (window.claude.use('sample') as Promise<SampleFn | null>).catch(() => null)
      : backend().then((b) => (b.ai ? serverSample() : null));
  }
  return sampleP;
}

function getDownloads(): Promise<Downloads | null> {
  if (!dlP) {
    dlP = window.claude?.use
      ? (window.claude.use('downloads') as Promise<Downloads | null>).catch(() => null)
      : Promise.resolve(null);
  }
  return dlP;
}

export type SaveOutcome = 'saved' | 'declined' | 'failed';

// Offers a file to the viewer. Inside claude.ai the viewer confirms the save; elsewhere the
// browser download starts directly.
export async function saveFile(filename: string, data: Blob): Promise<SaveOutcome> {
  const dl = await getDownloads();
  if (dl) {
    try {
      await dl.save({ filename, data });
      return 'saved';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'declined') return 'declined';
      if (code !== 'unavailable' && code !== 'not_granted' && code !== 'capability_disabled') return 'failed';
    }
  }
  try {
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export function sampleErrorText(code: string | undefined, fr: boolean): string {
  switch (code) {
    case 'not_granted':
      return fr ? "Tu n'as pas autorisé cette page à utiliser Claude. Recharge la page pour qu'elle te le redemande." : "You didn't allow this page to use Claude. Reload the page to be asked again.";
    case 'sampling_disabled':
    case 'capability_disabled':
    case 'not_declared':
    case 'capability_removed':
      return fr ? "Claude n'est pas disponible pour ce compte dans cette vue." : 'Claude is not available for this account in this view.';
    case 'tools_unavailable':
      return fr ? "Cette vue ne permet pas à Claude d'agir sur le document. Le mode Ask reste disponible." : "This view can't let Claude act on the document. Ask mode still works.";
    case 'insufficient_credits':
      return fr ? 'Crédits insuffisants : recharge ou change de formule (menu Crédits).' : 'Not enough credits: top up or change plan (Credits menu).';
    case 'plan_required':
      return fr ? 'Le modèle Avancé est inclus dans les formules Pro et Équipe. Choisis Équilibré ou change de formule.' : 'The Advanced model comes with the Pro and Team plans. Pick Balanced or upgrade.';
    case 'daily_cap':
      return fr ? 'Limite de requêtes IA du jour atteinte pour ta formule. Réessaie demain ou passe à une formule supérieure.' : 'Daily AI request limit reached for your plan. Try again tomorrow or upgrade.';
    case 'billing_unavailable':
      return fr ? 'La facturation du serveur n’est pas configurée.' : 'Server billing is not configured.';
    case 'budget':
      return fr ? 'Limite quotidienne de requêtes atteinte. Modifie-la dans Utilisation IA.' : 'Daily request limit reached. Change it in AI usage.';
    case 'rate_limited':
      return fr ? 'Trop de demandes pour le moment. Réessaie dans quelques minutes.' : 'Too many requests right now. Try again in a few minutes.';
    case 'session_expired':
      return fr ? 'Ta session claude.ai a expiré. Reconnecte-toi puis réessaie.' : 'Your claude.ai session expired. Sign in again, then retry.';
    case 'prompt_too_large':
      return fr ? 'Le document est trop grand pour être envoyé en entier. Sélectionne une page ou un passage.' : 'The document is too large to send whole. Select a page or a section.';
    case 'refused':
      return fr ? 'Claude a refusé cette demande. Reformule-la.' : 'Claude declined this request. Rephrase it.';
    case 'empty_completion':
      return fr ? "Claude n'a rien répondu. Simplifie la demande." : 'Claude returned nothing. Simplify the request.';
    default:
      return fr ? 'La connexion à Claude a échoué. Réessaie.' : 'The connection to Claude failed. Try again.';
  }
}
