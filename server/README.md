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

Le workflow `.github/workflows/deploy.yml` teste puis déploie à chaque push sur `main`.

Secrets à ajouter au dépôt GitHub (Settings → Secrets and variables → Actions) :

- `CLOUDFLARE_API_TOKEN` : jeton avec les droits Workers Scripts, Workers R2 Storage, Workers AI et Browser Rendering en modification ;
- `CLOUDFLARE_ACCOUNT_ID` ;
- `ANTHROPIC_API_KEY`.

Le workflow crée le bucket R2 `montaj-studio-uploads` s'il n'existe pas. Pour supprimer les pièces jointes au bout de 7 jours, ajoute une règle de cycle de vie sur le préfixe `u/` dans le tableau de bord R2.

Déploiement manuel :

```bash
cd server
npm ci && npm ci --prefix ../app
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put ACCESS_CODE   # facultatif
npm run deploy
```

## Développement local

```bash
npm run build:app
npx wrangler dev -c wrangler.dev.toml   # R2 local, sans IA ni navigateur headless
npm test                                # SSRF, robots.txt, analyse HTML
```
