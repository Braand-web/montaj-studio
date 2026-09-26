// Montaj Studio pricing — one source of truth for the app (what is shown) and the server
// (what is charged). 1 credit = €0.01 of value. AI is metered on the real tokens of each call:
// credits = provider cost × EUR rate × markup, so heavy runs pay more and short ones less.

export type PlanId = 'free' | 'creator' | 'pro' | 'team';
export type PackId = 'pack_500' | 'pack_1100' | 'pack_3000';
export type Tier = 'quick' | 'default' | 'complex';

// FCFA (XOF) is pegged to the euro: 1 € = 655,957 FCFA. Prices are shown in both, rounded to 50 FCFA.
export const XOF_PER_EUR = 655.957;
export const xofOf = (eur: number) => Math.round((eur * XOF_PER_EUR) / 50) * 50;

export interface Plan {
  id: PlanId;
  fr: string; en: string;
  tagFr: string; tagEn: string; // who it is for
  monthlyCredits: number;
  eurMonth: number; eurYear: number;
  perSeat?: boolean; minSeats?: number;
  tiers: Tier[]; // allowed model tiers
  dailyRequests: number; // hard cap on AI calls per day (per seat for Team)
  crawlPages: number; // internal pages explored by a link analysis
  byok: boolean; // own API keys (AI with the user's key uses no credits)
  support: { fr: string; en: string };
  features: { fr: string; en: string; soon?: boolean }[];
}

const COMMON = [
  { fr: 'Éditeurs vidéo et design complets, projets illimités', en: 'Full video and design editors, unlimited projects' },
  { fr: 'Export sans filigrane (PNG, PDF, MP4, SRT)', en: 'Watermark-free export (PNG, PDF, MP4, SRT)' },
];

export const PLANS: Plan[] = [
  {
    id: 'free', fr: 'Gratuit', en: 'Free', tagFr: 'Pour découvrir', tagEn: 'To try it out',
    monthlyCredits: 100, eurMonth: 0, eurYear: 0, tiers: ['quick', 'default'], dailyRequests: 25, crawlPages: 0, byok: false,
    support: { fr: 'Aide en ligne', en: 'Help center' },
    features: [
      { fr: '100 crédits IA offerts chaque mois', en: '100 free AI credits every month' },
      { fr: 'Modèles Rapide et Équilibré', en: 'Fast and Balanced models' },
      { fr: 'Pièces jointes : images, PDF, Word, Excel, vidéos', en: 'Attachments: images, PDF, Word, Excel, videos' },
      { fr: 'Analyse de liens (page seule)', en: 'Link analysis (single page)' },
      ...COMMON,
    ],
  },
  {
    id: 'creator', fr: 'Créateur', en: 'Creator', tagFr: 'Créateurs et indépendants', tagEn: 'Creators and freelancers',
    monthlyCredits: 1200, eurMonth: 7.99, eurYear: 79, tiers: ['quick', 'default'], dailyRequests: 200, crawlPages: 3, byok: false,
    support: { fr: 'Support par e-mail', en: 'Email support' },
    features: [
      { fr: '1 200 crédits IA par mois (≈ 30 créations Studio Chat)', en: '1,200 AI credits a month (≈ 30 Studio Chat creations)' },
      { fr: 'Modèles Rapide et Équilibré', en: 'Fast and Balanced models' },
      { fr: '200 requêtes IA par jour', en: '200 AI requests a day' },
      { fr: 'Analyse de liens + 3 pages internes du site', en: 'Link analysis + 3 internal pages' },
      { fr: 'Transcription des vidéos', en: 'Video transcription' },
      { fr: 'Packs de crédits en complément', en: 'Top-up credit packs' },
      ...COMMON,
    ],
  },
  {
    id: 'pro', fr: 'Pro', en: 'Pro', tagFr: 'Pros et petites agences', tagEn: 'Pros and small agencies',
    monthlyCredits: 3000, eurMonth: 19.99, eurYear: 199, tiers: ['quick', 'default', 'complex'], dailyRequests: 600, crawlPages: 5, byok: true,
    support: { fr: 'Support prioritaire (réponse sous 24 h ouvrées)', en: 'Priority support (reply within 1 business day)' },
    features: [
      { fr: '3 000 crédits IA par mois (≈ 75 créations Studio Chat)', en: '3,000 AI credits a month (≈ 75 Studio Chat creations)' },
      { fr: 'Modèle Avancé pour les créations exigeantes', en: 'Advanced model for demanding work' },
      { fr: 'Tes propres clés API : avec ta clé Claude, l’IA ne consomme aucun crédit', en: 'Your own API keys: with your Claude key, AI uses no credits' },
      { fr: '600 requêtes IA par jour', en: '600 AI requests a day' },
      { fr: 'Analyse de liens + 5 pages internes du site', en: 'Link analysis + 5 internal pages' },
      { fr: 'Transcription des vidéos', en: 'Video transcription' },
      ...COMMON,
    ],
  },
  {
    id: 'team', fr: 'Équipe', en: 'Team', tagFr: 'Agences et équipes marketing', tagEn: 'Agencies and marketing teams',
    monthlyCredits: 2000, eurMonth: 12, eurYear: 120, perSeat: true, minSeats: 3, tiers: ['quick', 'default', 'complex'], dailyRequests: 600, crawlPages: 5, byok: true,
    support: { fr: 'Support prioritaire et aide à la prise en main', en: 'Priority support and onboarding help' },
    features: [
      { fr: '2 000 crédits par siège et par mois, mis en commun', en: '2,000 credits per seat a month, pooled' },
      { fr: 'Tout le plan Pro : modèle Avancé, tes propres clés API', en: 'Everything in Pro: Advanced model, your own API keys' },
      { fr: '600 requêtes IA par jour et par siège', en: '600 AI requests a day per seat' },
      { fr: 'Facturation unique pour toute l’équipe', en: 'One invoice for the whole team' },
      { fr: 'Espace partagé, rôles et validation', en: 'Shared space, roles and approvals', soon: true },
      ...COMMON,
    ],
  },
];

export const PACKS: { id: PackId; credits: number; eur: number }[] = [
  { id: 'pack_500', credits: 500, eur: 5 },
  { id: 'pack_1100', credits: 1100, eur: 10 },
  { id: 'pack_3000', credits: 3000, eur: 25 },
];

// Side-by-side comparison (credits page and marketing site). true/false render as ✓ / —.
export type Cell = string | boolean | { fr: string; en: string };
export const COMPARE: { fr: string; en: string; cells: (p: Plan, fr: boolean) => Cell }[] = [
  { fr: 'Prix par mois', en: 'Price per month', cells: (p, fr) => (p.eurMonth ? `${p.eurMonth.toLocaleString('fr-FR')} € · ${xofOf(p.eurMonth).toLocaleString('fr-FR')} FCFA${p.perSeat ? (fr ? ' / siège' : ' / seat') : ''}` : '0 €') },
  { fr: 'Prix par an', en: 'Price per year', cells: (p, fr) => (p.eurYear ? `${p.eurYear.toLocaleString('fr-FR')} € · ${xofOf(p.eurYear).toLocaleString('fr-FR')} FCFA${p.perSeat ? (fr ? ' / siège' : ' / seat') : ''}` : '—') },
  { fr: 'Crédits IA par mois', en: 'AI credits per month', cells: (p, fr) => p.monthlyCredits.toLocaleString('fr-FR') + (p.perSeat ? (fr ? ' / siège' : ' / seat') : '') },
  { fr: 'Créations Studio Chat (environ)', en: 'Studio Chat creations (about)', cells: (p, fr) => '≈ ' + Math.round(p.monthlyCredits / 40) + (p.perSeat ? (fr ? ' / siège' : ' / seat') : '') },
  { fr: 'Requêtes IA par jour', en: 'AI requests per day', cells: (p, fr) => String(p.dailyRequests) + (p.perSeat ? (fr ? ' / siège' : ' / seat') : '') },
  { fr: 'Modèles Rapide et Équilibré', en: 'Fast and Balanced models', cells: () => true },
  { fr: 'Modèle Avancé', en: 'Advanced model', cells: (p, fr) => p.tiers.includes('complex') },
  { fr: 'Tes propres clés API', en: 'Your own API keys', cells: (p, fr) => p.byok },
  { fr: 'Pièces jointes (images, PDF, vidéos…)', en: 'Attachments (images, PDF, videos…)', cells: () => true },
  { fr: 'Pages internes analysées par lien', en: 'Internal pages analyzed per link', cells: (p, fr) => (p.crawlPages ? String(p.crawlPages) : { fr: 'page seule', en: 'single page' }) },
  { fr: 'Packs de crédits', en: 'Credit packs', cells: () => true },
  { fr: 'Éditeurs, export sans filigrane', en: 'Editors, watermark-free export', cells: () => true },
  { fr: 'Support', en: 'Support', cells: (p, fr) => p.support },
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
