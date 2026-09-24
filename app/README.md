# Montaj Studio — application

Suite créative gratuite et locale d'abord : éditeur de design, éditeur vidéo et assistant IA (Composer),
construite à partir de la maquette Claude Design (`../project/Montaj Studio.dc.html`).

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (Vitest)
npm run build      # typecheck + bundle en un seul fichier : dist/montaj-studio.html
npm run smoke      # parcours Playwright (servir dist/ sur :4173 avant)
```

`dist/montaj-studio.html` est autonome (JS et CSS inclus) : c'est ce fichier qui est publié comme
Artifact claude.ai. Dans claude.ai, la page reçoit deux capacités : `sample` (l'assistant appelle
Claude avec le compte de la personne) et `downloads` (enregistrement des exports).

## Architecture

- `src/model` — format de document unique (pages de design, séquences vidéo), formats, modèles.
- `src/design` — moteur design : store avec historique (`apply`, gestes `begin/live/end`),
  commandes (`actions.ts`), rendu DOM (`ElementView`) et rendu canvas identique pour l'export (`render.ts`).
- `src/video` — moteur vidéo : compositeur canvas + Web Audio (`engine.ts`), timeline, sous-titres SRT/VTT.
- `src/agent` — boucle agent : outils typés qui passent par les mêmes commandes que l'interface,
  modes Ask / Assist (copie + Appliquer/Refuser) / Agent (direct + Stop + Tout annuler).
- `src/lib` — IndexedDB (documents, médias dédupliqués SHA-256, versions), enregistrement MediaRecorder,
  pont vers le runtime claude.ai.

Voir `docs/PROGRESS.md` pour l'état de chaque fonctionnalité.
