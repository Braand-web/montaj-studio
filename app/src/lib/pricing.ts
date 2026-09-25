// Montaj Studio pricing — one source of truth for the app (what is shown) and the server
// (what is charged). 1 credit = €0.01 of value. AI is metered on the real tokens of each call:
// credits = provider cost × EUR rate × markup, so heavy runs pay more and short ones less.

export type PlanId = 'free' | 'creator' | 'pro' | 'team';
export type PackId = 'pack_500' | 'pack_1100' | 'pack_3000';
export type Tier = 'quick' | 'default' | 'complex';

export interface Plan {
  id: PlanId;
  fr: string; en: string;
  monthlyCredits: number;
  eurMonth: number; eurYear: number; xofMonth: number; // XOF = FCFA (West Africa)
  perSeat?: boolean; minSeats?: number;
  tiers: Tier[]; // allowed model tiers
  dailyRequests: number; // hard cap on AI calls per day
  features: { fr: string; en: string }[];
}

export const PLANS: Plan[] = [
  {
    id: 'free', fr: 'Gratuit', en: 'Free', monthlyCredits: 100, eurMonth: 0, eurYear: 0, xofMonth: 0, tiers: ['quick', 'default'], dailyRequests: 25,
    features: [
      { fr: 'Éditeurs vidéo et design sans limite', en: 'Unlimited video and design editors' },
      { fr: 'Export sans filigrane', en: 'Watermark-free export' },
      { fr: '100 crédits IA par mois', en: '100 AI credits per month' },
    ],
  },
  {
    id: 'creator', fr: 'Créateur', en: 'Creator', monthlyCredits: 1200, eurMonth: 7.99, eurYear: 79, xofMonth: 2500, tiers: ['quick', 'default'], dailyRequests: 200,
    features: [
      { fr: '1 200 crédits IA par mois', en: '1,200 AI credits per month' },
      { fr: 'Pièces jointes et analyse de liens', en: 'Attachments and link analysis' },
      { fr: 'Kit de marque et modèles premium', en: 'Brand kit and premium templates' },
    ],
  },
  {
    id: 'pro', fr: 'Pro', en: 'Pro', monthlyCredits: 3000, eurMonth: 19.99, eurYear: 199, xofMonth: 6500, tiers: ['quick', 'default', 'complex'], dailyRequests: 600,
    features: [
      { fr: '3 000 crédits IA par mois', en: '3,000 AI credits per month' },
      { fr: 'Modèle Avancé', en: 'Advanced model' },
      { fr: 'Création en masse et file prioritaire', en: 'Bulk creation and priority queue' },
    ],
  },
  {
    id: 'team', fr: 'Équipe', en: 'Team', monthlyCredits: 2000, eurMonth: 12, eurYear: 120, xofMonth: 4000, perSeat: true, minSeats: 3, tiers: ['quick', 'default', 'complex'], dailyRequests: 600,
    features: [
      { fr: '2 000 crédits par siège, mis en commun', en: '2,000 pooled credits per seat' },
      { fr: 'Espace partagé et rôles (avec les comptes)', en: 'Shared space and roles (with accounts)' },
      { fr: 'Tout le plan Pro', en: 'Everything in Pro' },
    ],
  },
];

export const PACKS: { id: PackId; credits: number; eur: number; xof: number }[] = [
  { id: 'pack_500', credits: 500, eur: 5, xof: 1500 },
  { id: 'pack_1100', credits: 1100, eur: 10, xof: 3000 },
  { id: 'pack_3000', credits: 3000, eur: 25, xof: 7500 },
];
export const PACK_VALIDITY_DAYS = 365;

// Model per tier on the Montaj server, and Anthropic list prices in USD per million tokens.
export const MODEL_OF: Record<Tier, { model: string; effort?: 'medium' | 'high' }> = {
  quick: { model: 'claude-haiku-4-5' },
  default: { model: 'claude-opus-5', effort: 'medium' },
  complex: { model: 'claude-opus-5', effort: 'high' },
};
export const USD_PER_MTOK: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
  'claude-haiku-4-5': { in: 1, out: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-sonnet-5': { in: 2, out: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5': { in: 5, out: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};
export const EUR_PER_USD = 0.92;
export const MARKUP = 2.5; // ≈60 % gross margin on AI before payment fees

export interface TokenUsage { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }

export function usdCost(model: string, u: TokenUsage): number {
  const p = USD_PER_MTOK[model] ?? USD_PER_MTOK['claude-opus-5'];
  return (u.input_tokens * p.in + u.output_tokens * p.out + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6;
}
export const creditsFor = (usd: number) => Math.max(1, Math.ceil(usd * EUR_PER_USD * MARKUP * 100));

// Flat prices for non-AI server work (Cloudflare costs).
export const FLAT: Record<'scrape' | 'transcribe_min' | 'extract', number> = { scrape: 5, transcribe_min: 2, extract: 0 };

// Minimum balance to start a call (a run is charged on its real cost when it ends).
export const MIN_TO_START: Record<Tier, number> = { quick: 2, default: 20, complex: 40 };

// Typical cost shown before running, from measured runs (refined as usage data comes in).
export const TYPICAL: { fr: string; en: string; credits: string }[] = [
  { fr: 'Texte, traduction, légende (Rapide)', en: 'Copy, translation, caption (Fast)', credits: '1–3' },
  { fr: 'Critique, palette, kit de publication', en: 'Critique, palette, publishing kit', credits: '5–15' },
  { fr: 'Analyse de lien', en: 'Link analysis', credits: '5' },
  { fr: 'Création Studio Chat (Équilibré)', en: 'Studio Chat creation (Balanced)', credits: '25–60' },
  { fr: 'Création Studio Chat (Avancé)', en: 'Studio Chat creation (Advanced)', credits: '50–120' },
];

export const planOf = (id: string | undefined) => PLANS.find((p) => p.id === id) ?? PLANS[0];
