# Montaj Studio

Éditeur vidéo et design dans le navigateur, avec Studio Chat et des assistants IA (Claude) qui créent et modifient de vrais documents.

| Dossier | Contenu |
|---|---|
| `app/` | L'application : Vite, React et TypeScript, livrée en un seul fichier HTML. Local-first : projets, médias et versions sont stockés dans le navigateur (IndexedDB). |
| `server/` | Le serveur Cloudflare (un Worker) qui sert l'app et son API : pièces jointes dans R2, extraction de documents, transcription Whisper, analyse de liens protégée contre le SSRF, accès à Claude avec la clé API du propriétaire. Voir `server/README.md`. |
| `project/`, `chats/` | Le prototype Claude Design d'origine et sa conversation. |
| `.github/workflows/deploy.yml` | Tests puis déploiement sur Cloudflare à chaque push sur `main`. |

## Deux façons d'utiliser l'app

- **Dans claude.ai (Artifact).** L'IA passe par le compte Claude de la personne qui regarde la page. La page ne peut joindre aucun serveur : les pièces jointes sont traitées dans le navigateur et l'analyse de liens n'est pas disponible.
- **Sur Cloudflare (production).** L'IA, les pièces jointes, la transcription et l'analyse de liens passent par le Worker.

## Démarrer

```bash
npm ci --prefix app && npm ci --prefix server
npm run dev --prefix app          # l'app seule
npm test --prefix app             # tests unitaires
npm test --prefix server          # SSRF, robots.txt, analyse HTML
```

## Déployer

Ajoute ces secrets au dépôt GitHub (Settings → Secrets and variables → Actions) : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`.

Ensuite, chaque push sur `main` teste puis déploie. Le détail est dans `server/README.md`.
