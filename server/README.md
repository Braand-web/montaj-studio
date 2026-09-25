# Montaj Studio — serveur Cloudflare

Un seul Worker Cloudflare sert l'application et son API, sur le même domaine.

| Route | Rôle |
|---|---|
| `PUT /api/upload` | Stocke une pièce jointe dans R2. Limites : 20 Mo par image ou fichier, 100 Mo par vidéo, types autorisés seulement. |
| `POST /api/extract` | Extrait le texte d'un fichier stocké : PDF, Word, Excel, CSV, texte, code, JSON, ZIP (arborescence et contenu). |
| `POST /api/transcribe` | Transcrit l'audio d'une vidéo avec Whisper (Workers AI). Le navigateur extrait l'audio en WAV 16 kHz. |
| `POST /api/scrape` | Analyse une page web : rendu dans un navigateur headless (Browser Rendering), capture d'écran, textes, structure, couleurs, polices, images, exploration de 5 pages internes au maximum. Repli en HTTP simple. |
| `POST /api/claude` | Un tour de Claude pour la boucle d'agent de l'app (outils exécutés dans le navigateur). Les PDF sont lus directement par Claude, y compris les pages scannées. |
| `GET /api/health` | Fonctions disponibles. |

## Sécurité

- **Protection SSRF.**
  - Seulement `http` et `https`, sur les ports 80, 443, 8080 et 8443.
  - Refusés : localhost, `.local`, `.internal`, noms sans point, toutes les IP littérales, métadonnées cloud (169.254.169.254, `metadata.google.internal`).
  - Chaque nom de domaine est vérifié par DNS-over-HTTPS : il est refusé s'il pointe vers une adresse privée.
  - Chaque redirection est revérifiée.
  - Dans le navigateur headless, les requêtes vers des hôtes internes sont bloquées.
- **robots.txt respecté.** Les pages qui demandent une connexion sont ignorées (réponse 401 ou 403, ou formulaire de mot de passe).
- **Limites.** Délai de 15 s (25 s pour le rendu), page de 3 Mo au maximum, 5 redirections au maximum.
- **Accès.** Même origine uniquement. 60 requêtes par minute, par IP et par route. Code d'accès facultatif (`ACCESS_CODE`), à saisir dans Paramètres → Sécurité.
- **Clé API.** La clé Anthropic reste côté serveur (secret Wrangler) et n'est jamais envoyée au navigateur.

## Modèles

| Choix dans l'app | Modèle |
|---|---|
| Rapide | `claude-haiku-4-5` |
| Équilibré | `claude-opus-5`, effort `medium` |
| Avancé | `claude-opus-5`, effort `high` |

Sur Opus, le repli côté serveur est activé (`fallbacks: "default"`) : si une demande est refusée, un modèle de secours la reprend.

## Déploiement

Le site est relié à Cloudflare par l'intégration Git (Workers Builds) : chaque push sur `main` redéploie le Worker `montaj-studio`. Réglages conseillés dans Cloudflare → Workers → montaj-studio → Settings → Build : dossier racine `server`, commande de build `npm ci --prefix ../app && npm ci && npm run build`, commande de déploiement `npx wrangler d1 migrations apply montaj-studio --remote && npx wrangler deploy`. La page construite (`server/public/index.html`) est aussi versionnée, donc un déploiement sans build reste complet. Les secrets (`ANTHROPIC_API_KEY`, Stripe) se règlent dans Settings → Variables and Secrets du Worker.

Le workflow GitHub `.github/workflows/deploy.yml` lance les tests à chaque push ; il ne déploie lui-même que si les secrets ci-dessous sont présents dans GitHub.

Secrets à ajouter au dépôt GitHub (Settings → Secrets and variables → Actions) :

- `CLOUDFLARE_API_TOKEN` : jeton avec les droits Workers Scripts, Workers R2 Storage, D1, Workers AI et Browser Rendering en modification ;
- `CLOUDFLARE_ACCOUNT_ID` ;
- `ANTHROPIC_API_KEY` ;
- facultatif, pour encaisser : `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`.

Le workflow applique les migrations D1 (base `montaj-studio`, déjà créée) et crée le bucket R2 `montaj-studio-uploads` s'il n'existe pas. Pour supprimer les pièces jointes au bout de 7 jours, ajoute une règle de cycle de vie sur le préfixe `u/` dans le tableau de bord R2.

Déploiement manuel :

```bash
cd server
npm ci && npm ci --prefix ../app
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ACCESS_CODE   # facultatif
npm run deploy
```

## Crédits et facturation

La tarification vit dans `app/src/lib/pricing.ts`, une seule source pour l'affichage et la facturation.

- **1 crédit = 0,01 €.** Chaque requête IA est facturée sur ses tokens réels : `crédits = coût fournisseur (USD) × 0,92 × 2,5 × 100`, avec un minimum de 1. Chaque analyse de lien coûte 5 crédits par page. La transcription coûte 2 crédits par minute. Upload, extraction et édition sont gratuits.
- **Formules :**

  | Formule | Prix | Crédits par mois | Requêtes IA max. par jour |
  |---|---|---|---|
  | Gratuit | 0 € | 100 | 25 |
  | Créateur | 7,99 €/mois | 1 200 | 200 |
  | Pro | 19,99 €/mois | 3 000 | 600 |
  | Équipe | 12 € par siège et par mois, 3 sièges min. | 2 000 par siège | 600 par siège |

  Les formules Gratuit et Créateur n'ont pas le modèle Avancé.
- **Packs :** 500 crédits à 5 €, 1 100 à 10 €, 3 000 à 25 €. Valables 365 jours, utilisés après les crédits du mois.
- **Portefeuille :** en attendant les comptes, chaque appareil a un portefeuille (en-tête `x-montaj-wallet`, identifiant aléatoire stocké dans le navigateur). Les tables D1 sont `wallets`, `ledger`, `purchases` et `daily`. La colonne `owner_user_id` est réservée pour rattacher un portefeuille à un compte Supabase ; le SQL est portable vers Postgres.
- **Anti-abus :** 3 nouveaux portefeuilles crédités par IP et par jour. Au-delà, le portefeuille est créé sans crédits offerts, pour ne pas bloquer les réseaux mobiles partagés.

### Activer Stripe

1. Dans Stripe, crée trois produits, Créateur, Pro et Équipe, chacun avec un prix mensuel et un prix annuel en EUR. Le prix Équipe est facturé par siège.
2. Colle les identifiants `price_…` dans `[vars]` de `wrangler.toml` (`STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_CREATOR_YEAR`, etc.). Les packs n'ont besoin d'aucun produit, leur prix est envoyé à Checkout.
3. Crée un webhook vers `https://<ton-domaine>/api/stripe/webhook` avec les événements `checkout.session.completed`, `invoice.paid` et `customer.subscription.deleted`.
4. Ajoute `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` aux secrets GitHub. Le workflow les pousse sur le Worker.
5. Active le portail client Stripe (Settings → Billing → Customer portal) pour le bouton « Gérer l'abonnement ».

Tant que Stripe n'est pas configuré, les boutons affichent « Paiement bientôt » et rien n'est encaissé. Les crédits gratuits fonctionnent quand même. Mobile Money n'est pas encore branché ; les prix en FCFA sont affichés pour préparer son arrivée.

## Développement local

```bash
npm run build:app
npx wrangler d1 migrations apply montaj-studio --local -c wrangler.dev.toml
echo 'STRIPE_WEBHOOK_SECRET=whsec_local' > .dev.vars
npx wrangler dev -c wrangler.dev.toml   # R2 et D1 locaux, sans IA ni navigateur headless
npm test                                # SSRF, robots.txt, analyse HTML, signature Stripe, calcul des crédits
```
