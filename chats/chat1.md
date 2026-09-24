# Continuation demandée

_Started 2026-09-23 17:21 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "# PROMPT MAÎTRE — Suite créative tout-en-un : vidéo + design, gratuite, local-fi"
The project currently has no files except possibly dotfiles — a `list_files` on the project root would return nothing else.
Current date is now September 23, 2026
</system-info>

<default aesthetic_system_instructions>
The user has not attached a design system. If they have ALSO not attached references or art direction, and the project is empty (the auto-managed _ds/ folder doesn't count), ask your opening questions with the ask_user tool. Whenever you ask opening questions in this project, include a design-system question in the form: the user's pick there sets the visual direction, so do NOT also ask about the visual aesthetic (no questions about vibe, colors or palette directions (including color-swatch svg-options questions), typography, mood, or art direction). Spend your other questions on everything else: audience, purpose, content, structure, scope, interactions, tone of copy. Exception: if the request already states the visual direction as a brand or concrete art direction, leave the design-system question out of your own questions (the app may still add one — it's skippable, and a skip doesn't change the stated direction) — but if they name a design system that isn't attached, keep the question: their pick there is what attaches it.

If the design-system question comes back unanswered — skipped without a pick (a "Not sure" / decide-for-me answer counts as a pick: it applies the effective default) — and no references or other art direction arrived either, THEN ask the visual-aesthetic questions before designing: a follow-up round (or one focused question) about vibe, colors, type, and mood is the right move once the design-system ask went unanswered. Do NOT just pick your own. Once you have a direction, use this guidance when creating designs:
- Choose a type pairing from web-safe set or Google Fonts. Helvetica is a good choice. Avoid hard-to-read or overly stylized fonts. Use 1-3 fonts only.
- Foreground and background: choose a color tone (warm, cool, neutral, something in-between). Use subtly-toned whites and blacks; avoid saturations above 0.02 for whites.
- Accents: choose 0-2 additional accent colors using oklch. All accents should share same chroma and lightness; vary hue.
- NEVER write out an SVG yourself that's more complicated than a square, circle, diamond, etc.
- For imagery, never hand-draw SVGs; use subtly-striped SVG placeholders instead with monospace explainers for what should be dropped there (e.g. “product shot”)

CRITICAL: ignore default aesthetic entirely if given other aesthetic instructions like reference images, design systems or guidance, or if there are user-authored files in the project already (the auto-managed _ds/ folder is not user-authored).
</default aesthetic_system_instructions>

<pasted_text name="Pasted text (865 lines)">
# PROMPT MAÎTRE — Suite créative tout-en-un : vidéo + design, gratuite, local-first, BYOK et agentique

&gt; Nom de code du produit : **Montaj Studio**. Le nom est défini dans une seule constante (`APP_NAME`) et doit pouvoir être changé sans toucher au reste du code.

---

## 0. MODE DE TRAVAIL (à lire en premier)

Tu es l'ingénieur principal de ce projet : architecte, développeur full-stack, spécialiste du graphisme et du média sur le web (Canvas, WebGL/WebGPU, WebCodecs, Web Audio, typographie, PDF) et spécialiste des agents IA (tool calling). Ce document est la spécification de référence.

Règles de travail :

1. Enregistre ce document dans le dépôt sous `docs/SPEC.md` et relis la section concernée avant chaque phase.
2. Tiens à jour `docs/PROGRESS.md` : pour chaque fonctionnalité, statut **Fonctionnel / Expérimental / Reporté**. Pour chaque report : ce qui manque, pourquoi, dépendances, fichiers concernés, prochaine étape.
3. Tiens à jour `docs/DECISIONS.md` : chaque décision d'architecture en quelques lignes (contexte, décision, alternatives écartées).
4. Commence par la **Phase 0 (audit)**. Si le dépôt contient déjà du code, réutilise uniquement ce qui est propre et pertinent, et supprime le code mort.
5. Travaille **phase par phase** (section 17). Une phase n'est terminée que lorsque ses critères d'acceptation sont vérifiés et que lint, typecheck et tests passent. À la fin de chaque phase : résume ce qui a été fait, les risques et les écarts avec cette spécification, puis **arrête-toi et attends la validation** avant de passer à la suivante, sauf instruction contraire.
6. Construis l'architecture avant de multiplier les fonctionnalités. L'agent IA ne doit pas être construit avant que les éditeurs soient entièrement pilotables par programmation.
7. En cas de conflit entre exigences, priorité : (1) sécurité des clés et des données, (2) intégrité des projets (aucune perte de travail), (3) fonctionnement réel, (4) performance, (5) étendue fonctionnelle.

Règles de vérité :

- **Pas de faux boutons** : toute fonctionnalité visible fonctionne réellement ou est explicitement marquée « Expérimental » ou « Bientôt » (feature flags).
- Pas de données fictives en production pour masquer l'absence de backend. Pas de faux templates, pas de fausses images de stock.
- Pas de génération IA simulée ni d'appel d'outil simulé dans l'application. Les mocks sont autorisés **uniquement dans les tests**.
- Ne remplace jamais silencieusement un modèle ou un fournisseur demandé. Si un identifiant de modèle n'existe pas ou a changé, marque-le « indisponible » dans le registre, signale-le dans `PROGRESS.md` et continue.
- Ne supprime pas silencieusement une fonctionnalité parce qu'elle est difficile : documente le report.
- Préfère moins de fonctionnalités réellement fonctionnelles à des dizaines de contrôles décoratifs.

---

## 1. VISION ET CONTRAINTES NON NÉGOCIABLES

Construire une application web publique, multi-utilisateur et prête pour la production : une **suite créative tout-en-un** qui réunit dans un seul produit :

- un **éditeur vidéo professionnel** de la classe des meilleurs éditeurs grand public (niveau CapCut Pro) ;
- un **éditeur de design et d'images** de la classe des meilleurs outils de design en ligne (niveau Canva Premium) : posts, stories, miniatures, flyers, affiches, cartes de visite, logos, présentations, documents, retouche photo ;
- des **fonctions IA** d'image, de vidéo, d'audio et de texte ;
- un **agent IA** qui manipule réellement les projets vidéo **et** design via un Composer conversationnel.

Public : grand public, créateurs de contenu, monteurs, graphistes, entrepreneurs, commerçants, YouTubeurs, TikTokers, agences, équipes marketing, associations, enseignants.

Ce n'est pas une démo : c'est un produit réellement exploitable.

Contraintes :

- **Identité 100 % originale** : aucun nom, logo, asset, icône, template, son, interface copiée pixel par pixel ni code propriétaire d'un produit existant. Ne jamais appeler le produit CapCut ou Canva, ni y faire référence dans l'interface.
- **Gratuit** : 0 € / 0 FCFA. Aucun abonnement, aucun crédit interne obligatoire, aucun contenu « Premium » verrouillé, aucun paiement à l'export, aucun watermark, aucune limite artificielle de projets, de pages, de durée, de résolution ou de stockage local.
- **BYOK (Bring Your Own Key)** : les fonctions IA externes utilisent les clés API personnelles de l'utilisateur, qui paie directement ses fournisseurs. La plateforme ne finance aucune génération.
- **Local-first** : médias, rendu, effets et exports s'exécutent dans le navigateur. Le cloud sert uniquement à : authentification, métadonnées, synchronisation facultative des documents, coffre de clés chiffrées, passerelle IA, suivi des jobs IA, proxy des banques d'images gratuites, catalogue de templates.
- **Tout est utilisable sans IA.** Les éditeurs fonctionnent aussi en **mode invité** (sans compte, tout en local). Un compte est requis pour les fonctions IA (protection anti-abus de la passerelle) et pour la synchronisation.
- **Multi-utilisateur = comptes isolés.** Pas d'édition collaborative en temps réel en v1, sans l'empêcher architecturalement.
- **Monétisation future préparée, jamais affichée** : un service `entitlements` centralise les droits (tout est autorisé aujourd'hui) et le registre des fournisseurs prévoit un futur fournisseur « plateforme ». Aucun paywall visible.

Deux façons de travailler, utilisables simultanément dans les deux éditeurs :

- **Mode traditionnel** : l'utilisateur crée tout à la main.
- **Mode IA** : l'utilisateur décrit le résultat (« Fais-moi une affiche pour ma boutique », « Fais-moi une pub TikTok ») et l'agent manipule l'éditeur.

---

## 2. STACK TECHNIQUE

- **Framework** : Next.js 15+ (App Router), React, TypeScript strict. Les éditeurs sont rendus **uniquement côté client** (import dynamique sans SSR).
- **UI** : Tailwind CSS, primitives accessibles (Radix / shadcn/ui), icônes libres (Lucide).
- **État UI** : Zustand (ou équivalent) avec sélecteurs fins. Le moteur de document vit **hors de React**.
- **Backend** : Supabase (Auth, Postgres, Realtime), Drizzle ORM avec migrations versionnées.
- **Validation** : Zod partout (entrées API, commandes, outils de l'agent, format de document).
- **Rendu** : compositeur WebGL2 dans OffscreenCanvas + Web Worker ; WebGPU en option. Rendu du texte avec mise en page typographique fiable (césure, retour à la ligne, texte bidirectionnel, ligatures) ; HarfBuzz WASM ou équivalent si nécessaire pour la fidélité entre aperçu et export.
- **Vectoriel** : formes, tracés et SVG gérés comme vecteurs dans le document (export SVG et PDF vectoriels).
- **PDF** : génération côté client (pdf-lib ou équivalent) avec texte et vecteurs préservés ; lecture de PDF pour import (pdf.js).
- **Vidéo** : WebCodecs pour décoder et encoder ; **Mediabunny** (ou équivalent) pour lire et écrire MP4, MOV, WebM, MKV, MP3, WAV ; FFmpeg.wasm uniquement en repli ciblé.
- **Audio** : Web Audio API, AudioWorklet, OfflineAudioContext.
- **IA locale gratuite** : Transformers.js (Whisper, embeddings, segmentation) en WebGPU avec repli WASM, MediaPipe (segmentation, visages), RNNoise en WASM.
- **Stockage local** : OPFS (médias, proxys, caches), IndexedDB (documents, index).
- **i18n** : français et anglais dès le départ, aucune chaîne en dur.
- **Tests** : Vitest, Playwright.
- **PWA** : installable, édition utilisable hors ligne (phase 8).
- **Rendu serveur** : hors v1. Prévoir seulement une interface `RenderBackend`.

---

## 3. ARCHITECTURE

### 3.1 Principe central n°1 : un seul document, un seul moteur, deux éditeurs

Vidéo et design ne sont pas deux applications collées : ils partagent **le même modèle de document, le même graphe de scène, le même compositeur, le même Command Bus, le même historique et le même agent**.

- Un **Document** contient des **Pages** (design) et/ou des **Séquences** (vidéo).
- Une **Page** est un canevas d'éléments positionnés (image, texte, forme, vecteur, groupe, cadre/masque, graphique, tableau, QR code, vidéo, audio). Une page peut avoir une **durée** et des **animations** : elle s'exporte alors en MP4 ou GIF.
- Une **Séquence** est une timeline de pistes et de clips ; chaque clip visuel est rendu avec les **mêmes types d'éléments** que les pages (un texte vidéo et un texte de design sont le même objet).
- Conséquences voulues : un design peut devenir une vidéo animée, une image de la vidéo peut devenir un design, un template peut contenir des pages et des séquences, le kit de marque s'applique partout, l'agent maîtrise les deux mondes avec les mêmes outils.

### 3.2 Principe central n°2 : tout passe par des commandes

Tout ce qu'un utilisateur peut faire est une **commande structurée**. L'interface, les raccourcis, les templates, les tests et l'agent passent par le même moteur.

```text
Éditeur design ─────┐
Éditeur vidéo ──────┤
Raccourcis ─────────┤
Templates ──────────┼──► Command Bus ──► Document Engine ──► Document State
Tests ──────────────┤          ▲
Agent IA ─► Outils ─┘          │
                  Validation (Zod) + Permissions + Historique
```

Il n'existe pas un moteur pour l'humain et un autre pour l'IA. Un changement fait par l'agent est strictement équivalent à un changement manuel.

### 3.3 Modules

Structure modulaire (dossiers ou packages d'un workspace), dépendances à sens unique :

- `engine/` : domaine pur TypeScript, **sans React ni DOM** — document, graphe de scène, commandes, historique, transactions, temps, contraintes de mise en page, migrations. Testable dans Node.
- `media/` : import, analyse, hachage, miniatures, formes d'onde, proxys, cache (workers).
- `render/` : compositeur partagé (aperçu, export image, export PDF, export vidéo) ; registres d'effets, filtres, transitions et animations.
- `text/` : polices, chargement, mesure, mise en page, effets de texte.
- `audio/` : graphe audio, mixage, analyse, rendu hors ligne.
- `design/` : outils propres au design (alignement, guides intelligents, redimensionnement magique, grilles, kit de marque, graphiques, tableaux).
- `ai/` : registre des fournisseurs et des modèles, client de la passerelle, jobs, coûts.
- `agent/` : contexte, outils, exécuteur, transactions, garde-fous, UI du Composer.
- `app/` : pages et composants Next.js (UI uniquement).
- `server/` : passerelle IA, coffre de clés, webhooks, proxy des banques d'images, catalogue de templates, base de données (modules `server-only`).

### 3.4 Format de document

- Document JSON **versionné** (`schemaVersion`) avec **migrations** automatiques et testées.
- Identifiants stables (UUID ou nanoid) pour chaque entité.
- **Temps en entiers** (microsecondes) : jamais de flottants pour les positions temporelles. Fréquence d'images rationnelle (ex. 30000/1001).
- **Unités spatiales** : pixels logiques pour l'écran ; pour l'impression, taille physique (mm/in) + DPI stockés dans la page.
- Séparation stricte entre le **document** (sérialisé), l'**état UI** (sélection, zoom, panneaux) et les **caches** (miniatures, proxys, transcriptions, index).

Exemple conceptuel :

```json
{
  "schemaVersion": 1,
  "document": { "id": "", "name": "", "kind": "design", "createdAt": "", "updatedAt": "", "brandKitId": null },
  "assets": [{ "id": "", "kind": "image", "name": "", "hash": "sha256:...", "width": 0, "height": 0, "license": { "source": "upload" }, "generation": null }],
  "pages": [{
    "id": "", "name": "Page 1", "width": 1080, "height": 1350, "unit": "px", "dpi": 72, "bleedMm": 0,
    "background": { "type": "color", "value": "#FFFFFF" }, "durationUs": null,
    "elementIds": [], "guides": []
  }],
  "sequences": [{ "id": "", "name": "Main", "width": 1080, "height": 1920, "fps": { "num": 30, "den": 1 }, "trackIds": [] }],
  "tracks": [],
  "clips": [],
  "elements": [{
    "id": "", "type": "text", "parentId": null,
    "transform": { "x": 0, "y": 0, "width": 0, "height": 0, "rotation": 0, "flipX": false, "flipY": false },
    "opacity": 1, "blendMode": "normal", "locked": false, "hidden": false,
    "constraints": { "horizontal": "left", "vertical": "top" },
    "style": {}, "effects": [], "animations": [], "keyframes": {}
  }],
  "captions": [],
  "markers": [],
  "agentSessions": []
}
```

(Exemple conceptuel : adapte les champs, garde les principes.)

### 3.5 Command Bus, historique et transactions

- Chaque commande : type, charge utile validée par Zod, `execute()`, `undo()`, `redo()`, origine (`user` | `agent` | `template` | `system`).
- **Coalescence** : un glisser, un redimensionnement ou un curseur continu produit une seule entrée d'historique.
- **Transactions** atomiques (tout ou rien), annulables en une fois.
- **Dry-run** sur une copie du document pour calculer un **diff** sans modifier le projet (mode Assist de l'agent).
- Historique illimité en session ; historique persistant de taille configurable.

### 3.6 Stockage local et protection du travail

- Fichiers importés copiés dans OPFS et hachés (SHA-256, par blocs, en worker). Option Chromium : référencer les très gros rushes via la File System Access API.
- **Médiathèque globale** : un média importé une fois est réutilisable dans tous les documents (déduplication par hachage), avec dossiers et recherche.
- `navigator.storage.persist()` + affichage de l'espace utilisé et disponible, alerte avant saturation.
- **Relinking** : un média absent n'empêche jamais l'ouverture ; les éléments concernés sont signalés et reliables.
- **Archive portable** : export et import d'un document (`.montaj` = document + médias, zip écrit en flux).
- Autosave après chaque modification (debounce), snapshots périodiques, snapshot automatique avant chaque transaction de l'agent.

### 3.7 Pipeline média

Import → analyse (format, codecs, dimensions, rotation EXIF, profil couleur, durée, fps, pistes) → copie OPFS + hachage → miniatures → formes d'onde (audio) → **proxys** (vidéo basse résolution, images réduites pour l'édition de très grandes photos) → cache. Tout en workers, avec progression, annulation, reprise. Format non pris en charge : message clair.

### 3.8 Rendu

- **Un seul compositeur** pour l'aperçu et tous les exports : ce que l'on voit est ce que l'on exporte.
- Aperçu : temps réel sur proxys ; export : déterministe, depuis les originaux, en worker, écriture **en flux** vers OPFS.
- Effets, filtres, transitions et animations = **modules déclaratifs** (shader ou fonction + schéma de paramètres : type, bornes, défaut, animable). Ce schéma génère automatiquement l'UI de l'inspecteur **et** les paramètres des outils de l'agent. Ajouter un module ne demande aucune modification de l'UI ni de l'agent.
- Toujours fermer les `VideoFrame` et libérer les `ImageBitmap` après usage. Caches LRU.

### 3.9 Contraintes navigateur

- En-têtes COOP/COEP sur les routes des éditeurs (préférer `credentialless` quand supporté) pour `SharedArrayBuffer`. Polices auto-hébergées ; vérifier que les médias distants (IA, banques d'images) restent chargeables.
- Détection des capacités au démarrage : WebCodecs, codecs réellement encodables (`VideoEncoder.isConfigSupported`, `AudioEncoder.isConfigSupported` — l'AAC n'est pas disponible partout), WebGPU, OPFS, SharedArrayBuffer. Les options d'export proposées en dépendent.
- Navigateurs cibles : Chrome et Edge récents en priorité ; Firefox et Safari récents avec dégradation propre. L'éditeur design doit fonctionner sur tous ces navigateurs, même quand l'export vidéo est limité. Navigateur incompatible : écran explicatif, jamais de page blanche.
- **Mode machine modeste** : proxys plus légers, aperçu simplifié, moins de miniatures.

---

## 4. ESPACE DE TRAVAIL ET INTERFACE

### 4.1 Accueil (tableau de bord)

- Bouton **Créer** avec formats prédéfinis classés par usage : réseaux sociaux (post Instagram carré et 4:5, story, Reel, TikTok, miniature YouTube, bannière YouTube, couverture Facebook, post LinkedIn, post X), vidéo (YouTube 16:9, Shorts, Reels, TikTok), impression (flyer A4/A5, affiche A3/A2, carte de visite, invitation, menu, certificat, étiquette), marque (logo, carte de visite, en-tête), bureau (présentation 16:9, document A4, CV, infographie), ainsi que **taille personnalisée** (px, mm, cm, in).
- Barre de recherche unique : documents, templates, médias.
- Documents récents, dossiers, favoris, corbeille (restauration pendant 30 jours).
- Accès : Médiathèque, Kit de marque, Templates, Paramètres, Fournisseurs IA, Utilisation IA.

### 4.2 Éditeurs

Principes communs : desktop professionnel, dark mode par défaut pour la vidéo et thème clair ou sombre au choix pour le design, palette sobre, **un seul accent principal**, excellente hiérarchie visuelle, identité originale.

- **Header** : logo, nom du document, statut de sauvegarde (`Enregistré` / `Enregistrement…` / `Hors ligne`), annuler, rétablir, format et redimensionnement, Présenter (design), Exporter / Télécharger, profil.
- **Barre latérale gauche** (panneaux selon l'éditeur) : Templates, Éléments, Texte, Médias, Photos (banques gratuites), Kit de marque, Audio, Sous-titres, Effets, Transitions, Filtres, IA.
- **Centre** : canevas de design (pages empilées ou vue grille) ou aperçu vidéo.
- **Bas** : timeline (vidéo) ; barre de pages avec vignettes, durée par page et zoom (design).
- **Droite** : Inspecteur contextuel, panneau Calques, ou Composer IA (onglets, panneau rétractable).
- **Barre d'outils contextuelle** au-dessus de l'élément sélectionné (police, taille, couleur, effets, position, transparence, verrouillage, etc.).

Autres exigences :

- **Résolutions** : minimum 1280×720, excellente expérience à partir de 1440p. Tablette : éditeur design complet adapté au tactile, éditeur vidéo simplifié. Téléphone : édition design simple (texte, photos, couleurs, export), projets, médias, exports ; timeline vidéo réduite aux ajustements simples.
- **États vides** guidés partout. Exemple : « Commence ta première création — Choisis un format ou dépose tes fichiers ici ». Composer vide : « Je peux créer ou modifier pour toi. Exemples : “Fais une affiche pour ma boutique de tissus”, “Transforme cette vidéo en Reel de 30 secondes”. »
- **Onboarding** : choisir un usage → créer un premier design depuis un template ou un premier montage → exporter. Présenter « Connecter une IA » sans l'imposer.
- **Accessibilité** : navigation clavier complète, focus visibles, contrastes AA, libellés ARIA, lecture d'écran des calques.

### 4.3 Raccourcis (liste consultable avec `?`)

| Action | Raccourci |
|---|---|
| Annuler / Rétablir | Ctrl/Cmd + Z / Ctrl/Cmd + Maj + Z |
| Copier / Coller / Dupliquer | Ctrl/Cmd + C / V / D |
| Coller le style | Ctrl/Cmd + Alt + V |
| Supprimer | Suppr |
| Enregistrer | Ctrl/Cmd + S |
| Grouper / Dégrouper | Ctrl/Cmd + G / Ctrl/Cmd + Maj + G |
| Premier plan / arrière-plan | Ctrl/Cmd + ] / [ |
| Déplacer de 1 px / 10 px | Flèches / Maj + flèches |
| Texte / Rectangle / Ligne | T / R / L |
| Zoom canevas | Ctrl/Cmd + + / − , Ctrl/Cmd + 0 ajuster |
| Lecture / pause (vidéo, pages animées) | Espace |
| Lecture arrière / pause / avant | J / K / L |
| Image précédente / suivante | ← / → (focus timeline) |
| Scinder / Supprimer avec comblement | S / Maj + Suppr |
| Zoom timeline | + / − (focus timeline) |
| Marqueur | M |
| Ouvrir le Composer | Ctrl/Cmd + K |

Les raccourcis dépendent du focus (canevas ou timeline) et ne se déclenchent jamais pendant la saisie de texte.

---

## 5. ÉDITEUR DE DESIGN ET D'IMAGES (classe Canva Premium)

### 5.1 Canevas et pages

- Documents multi-pages : ajouter, dupliquer, supprimer, réordonner, masquer, renommer ; vue défilement et vue grille.
- Taille par page possible ; unités px, mm, cm, in ; DPI ; **fond perdu** et **traits de coupe** pour l'impression ; marges de sécurité visibles.
- Zoom, défilement fluide, règles, grille, guides manuels, **guides intelligents** (alignement et espacement égal détectés automatiquement, affichage des distances), magnétisme activable.
- Fond de page : couleur, dégradé, image, vidéo.

### 5.2 Éléments

- Formes (rectangle arrondi, cercle, polygone, étoile, flèche, bulle), lignes et flèches avec extrémités, **outil plume / tracés vectoriels** simples, import SVG éditable (couleurs modifiables).
- **Cadres** (formes, lettres, cadres photo) : glisser une image ou une vidéo dans un cadre pour la masquer, repositionnement à l'intérieur.
- **Grilles** de mise en page (collages) avec espacement réglable.
- Icônes et illustrations : bibliothèque libre (Lucide, illustrations CC0) et bibliothèque maison ; stickers ; emojis.
- **Graphiques** : barres, colonnes, lignes, aires, secteurs, anneau, jauge, depuis un tableau éditable ou un collage de données CSV ; couleurs du kit de marque.
- **Tableaux** éditables (lignes, colonnes, fusion, styles).
- **QR codes** (URL, texte, Wi-Fi, vCard) avec couleurs et logo central.
- Éléments vidéo et audio sur les pages (designs animés, présentations).

### 5.3 Manipulation

S�lection simple, multiple et au lasso · poignées de transformation · rotation avec paliers · redimensionnement proportionnel · retournement · verrouillage · masquage · groupes imbriqués · **panneau Calques** (ordre, renommage, visibilité, verrou, glisser-déposer) · alignement et distribution · position et dimensions numériques · opacité · modes de fusion · **copier / coller le style** · liens (URL ou vers une autre page, conservés dans le PDF).

### 5.4 Texte et typographie

- Titres, sous-titres, corps ; **styles de texte** réutilisables.
- Police, taille, graisse, italique, soulignement, barré, majuscules, interligne, espacement des lettres, alignement, listes à puces et numérotées, colonnes, retrait automatique à la hauteur du bloc ou taille automatique pour remplir.
- **Effets de texte** : ombre, contour, relief, néon, éclat, fond arrondi, dégradé, texte rempli d'image, **texte courbé**, texte sur tracé.
- **Combinaisons de polices** proposées (titres + corps) ; import de polices (TTF, OTF, WOFF, WOFF2) dans le kit de marque.
- Google Fonts auto-hébergées et autres polices sous licence libre. Polices manquantes à l'ouverture : remplacement signalé, jamais silencieux.
- Correction orthographique du navigateur ; rechercher et remplacer dans tout le document.

### 5.5 Retouche photo

- Recadrage (libre, ratios, rotation fine, redressement), retournement.
- Réglages : luminosité, contraste, exposition, saturation, vibrance, température, teinte, hautes lumières, ombres, blancs, noirs, netteté, clarté, flou, vignette, grain.
- **Filtres** avec intensité ; presets enregistrables ; LUT `.cube`.
- **Suppression d'arrière-plan locale et gratuite** (modèle de segmentation dans le navigateur) avec pinceaux Restaurer / Effacer.
- Effets : ombre portée, contour autour du sujet détouré, duotone, flou d'arrière-plan (portrait), pixelisation, arrondi des coins, transparence en dégradé.
- Masques et formes de découpe.
- Retouche non destructive : l'original est conservé, la retouche est une pile de réglages réversible.

### 5.6 Couleurs

- Sélecteur (HEX, RGB, HSL), pipette, couleurs du document, **palettes extraites d'une photo**, palettes prêtes à l'emploi, dégradés linéaires et radiaux.
- **Remplacer une couleur partout** dans le document.
- Contrôle du contraste texte/fond (avertissement WCAG).

### 5.7 Kit de marque

Plusieurs kits par utilisateur : logos (variantes), palettes, polices (titre, sous-titre, corps), styles de texte, éléments graphiques, ton de la marque (texte libre utilisé par l'IA). Application en un clic d'un kit à un document (couleurs, polices, logo) ; l'agent et la génération IA respectent le kit sélectionné.

### 5.8 Templates

- Catalogue de templates par format et par usage, recherche, filtres (couleur, style, secteur).
- **Aucun faux template** : fournir un premier jeu réellement conçu et fonctionnel (au minimum 5 par grande catégorie : posts, stories, miniatures, flyers, cartes de visite, présentations, CV, vidéos courtes), puis un **outil de publication** permettant aux administrateurs d'en ajouter sans déploiement.
- Un template = un document avec éléments marqués comme **remplaçables** (texte, photo, logo, couleur) pour une personnalisation rapide et pour l'agent.
- L'utilisateur peut enregistrer ses propres templates.
- Assets des templates : originaux ou sous licence libre, avec la licence enregistrée.

### 5.9 Banques d'images gratuites

- Recherche intégrée de photos et vidéos libres de droits via les API gratuites de banques d'images (ex. Unsplash, Pexels, Pixabay), appelées via un proxy serveur qui porte la clé de la plateforme (ces API sont gratuites), avec cache et limites.
- Respect strict des conditions de chaque API : **attribution** affichée et conservée dans les métadonnées de l'asset, déclenchement du suivi de téléchargement quand il est exigé.
- Aucune image copiée depuis des sources non autorisées.

### 5.10 Redimensionnement magique

- Transformer un design en plusieurs formats (ex. post carré → story, miniature YouTube, flyer A5) en créant de nouveaux documents ou de nouvelles pages.
- Base déterministe : **contraintes** des éléments (ancrages gauche/droite/centre, haut/bas, mise à l'échelle), zones de sécurité, taille de texte minimale.
- Amélioration optionnelle par l'agent IA (réorganisation intelligente), avec aperçu avant validation.

### 5.11 Animations et designs animés

- Animations de page (entrée, sortie) et d'élément (apparition, glissement, zoom, rebond, fondu, machine à écrire pour le texte), durée et délai, keyframes.
- Durée par page ; une page animée s'exporte en MP4 ou GIF.
- **« Ouvrir dans l'éditeur vidéo »** : un design animé devient une séquence vidéo modifiable (même document).

### 5.12 Présentations

- Mode présentation plein écran, navigation clavier, transitions entre pages, notes du présentateur, minuteur, vue présentateur (deuxième fenêtre).
- Enregistrement de la présentation avec webcam et voix (devient une vidéo dans l'éditeur vidéo).

### 5.13 Import

Images : PNG, JPG, WebP, GIF, SVG, HEIC (si le navigateur le permet, sinon message clair). PDF : pages importées comme images, ou texte et vecteurs lorsque l'extraction est fiable (marqué « Expérimental » sinon). Polices : TTF, OTF, WOFF, WOFF2. Vidéo et audio : voir section 6.

### 5.14 Export design

- **PNG** (fond transparent possible), **JPG** (qualité réglable), **WebP**, **SVG** (vecteurs et texte préservés), **PDF standard** et **PDF impression** (vecteurs, texte sélectionnable, polices incorporées, fond perdu, traits de coupe, 300 DPI pour les images), **MP4** et **GIF** pour les designs animés.
- Choix des pages, taille (multiplicateur ou dimensions), compression, export de chaque page en fichier séparé (zip).
- CMYK : non géré en v1 ; l'indiquer honnêtement dans l'interface d'export impression (limitation documentée).
- Aucun watermark. Métadonnées d'attribution et, si le document contient des images générées, option « Marquer comme contenu généré par IA ».

---

## 6. ÉDITEUR VIDÉO (classe CapCut Pro)

### 6.1 Import

Vidéo : MP4, MOV, WebM (selon navigateur). Audio : MP3, WAV, AAC, M4A. Images : toutes celles de l'éditeur design. Sous-titres : SRT, VTT. Glisser-déposer, sélection multiple, dossiers. Enregistrement webcam, micro et écran dans l'application.

### 6.2 Timeline

Pistes vidéo, audio, texte et overlay multiples · glisser-déposer · magnétisme (clips, playhead, marqueurs) · playhead · zoom horizontal · sélection multiple et par zone · marqueurs · sélection de plage · édition avec comblement (ripple) · trim · split · déplacement · duplication · suppression · verrouiller / masquer / muet / solo · hauteur des pistes · formes d'onde · miniatures.

Fluidité : déplacer le playhead ne doit **jamais** rerendre tous les clips (abonnements ciblés, `requestAnimationFrame`, virtualisation). Pendant un glisser, état transitoire local ; une seule commande au relâchement.

### 6.3 Montage

Split, trim, crop, redimensionnement, rotation, position, opacité, miroir, retournement, duplication, lecture inversée, arrêt sur image, vitesse (0,1× à 100×), rampes de vitesse, volume, fondus, détacher l'audio, remplacer le média, grouper ou composer des clips, séquences imbriquées (si l'architecture le permet), image dans l'image, modes de fusion. Tous les éléments de design (texte, formes, graphiques, stickers, cadres) sont utilisables comme overlays.

### 6.4 Keyframes

Position, échelle, rotation, opacité, volume, crop, flou et toute propriété déclarée animable. Interpolations linéaire, ease-in, ease-out, ease-in-out ; architecture prête pour Bézier.

### 6.5 Sous-titres

- Génération **locale et gratuite** (Whisper via Transformers.js) avec horodatage **au mot** ; repli cloud BYOK.
- Import/export SRT et VTT, édition phrase par phrase, timecodes, recherche et remplacement, découpage et fusion.
- Styles : mot actif, karaoké, surlignage, encadré, mots rebondissants, cinématique, presets TikTok / Reels / Shorts ; zones de sécurité 9:16 ; polices et couleurs du kit de marque.
- Presets personnels.

### 6.6 Audio

Formes d'onde, trim, split, gain, fondus, muet, normalisation vers une cible de loudness configurable (défaut −14 LUFS), détacher l'audio, réduction de bruit (RNNoise), amélioration de la voix, détection et suppression des silences, détection du rythme, ducking automatique, vitesse, hauteur (si possible), égaliseur extensible. Bibliothèque de musiques et sons uniquement libres de droits (CC0 ou licence enregistrée).

### 6.7 Effets, couleur, masques, transitions

- Effets : flou, flou gaussien, netteté, glow, vignette, grain, bruit, tremblement, aberration chromatique, séparation RVB, pixelisation, fisheye, flou de mouvement (si possible) ; paramètres, intensité, durée, keyframes.
- Couleur : mêmes réglages que la retouche photo (section 5.5), LUT `.cube`, presets partagés entre design et vidéo.
- Chroma key : pipette, seuil, suppression du débordement, contour progressif. Masques : rectangle, cercle, linéaire, forme libre ; inversion, contour, keyframes. Suppression d'arrière-plan vidéo locale (segmentation) sans fond vert.
- Transitions : fondu enchaîné, fondu au noir, glissement, poussée, zoom, volet, flou, flash, rotation ; durée modifiable ; nouveaux modules ajoutables.

### 6.8 Formats et aperçu

- Ratios 16:9, 9:16, 1:1, 4:5, 4:3, 21:9, personnalisé ; presets TikTok, Reels, Feed, YouTube, Shorts, Facebook, X.
- Aperçu : lecture, pause, déplacement, image par image, plein écran, volume, vitesse, zones de sécurité, guides, magnétisme, zoom, manipulation directe avec les mêmes guides intelligents que le design.
- **« Capturer cette image »** : l'image courante devient un design (miniature YouTube, post).

### 6.9 Export vidéo

- Nom, résolution (720p, 1080p, puis 1440p ou 4K selon les capacités), FPS, format (MP4 H.264/AAC, WebM VP9/Opus, audio seul, image fixe, GIF court), qualité, débit, qualité audio.
- Seules les combinaisons réellement encodables sur la machine sont proposées.
- Progression réelle, temps estimé, annulation, export en arrière-plan sur une copie figée du document.
- Aucun watermark. Après export : aperçu, téléchargement, retour au projet. Option « Marquer comme contenu généré par IA ».

### 6.10 Versions

Historique des versions (commun aux deux éditeurs) : date, heure, origine (utilisateur, agent, autosave), aperçu, restauration.

---

## 7. IA : FOURNISSEURS, CLÉS ET MODÈLES

### 7.1 Fournisseurs

- **v1** : Anthropic, OpenAI, OpenRouter, fal.ai.
- **Prévus** (architecture prête) : ElevenLabs (requis en phase 9), Google Gemini, xAI, Replicate, Runway, Groq, Mistral, Stability AI.
- Chaque fournisseur est un **adaptateur** qui normalise : messages, **format des appels d'outils**, streaming, erreurs, usage (jetons, images, secondes).

### 7.2 Page « Paramètres &gt; Fournisseurs IA »

Pour chaque fournisseur : statut Connecté / Non connecté, champ de clé (après enregistrement, seuls les 4 derniers caractères sont affichés, ex. `sk-ant-••••••1a2b`), **Tester la connexion**, modèles disponibles, modèle par défaut, capacités, usage estimé, **Supprimer la clé**, option **« Utiliser pour cette session uniquement »**, liens vers la création de clé et la tarification officielles.

### 7.3 Coffre de clés (critique)

- **Chiffrement d'enveloppe** : chaque clé chiffrée en AES-256-GCM avec une clé de données unique, elle-même chiffrée par une clé maîtresse (`CREDENTIALS_MASTER_KEY`, variable serveur ou KMS). Stocker : texte chiffré, IV, tag, version de la clé maîtresse, 4 derniers caractères, empreinte.
- **Données associées (AAD)** = identifiant utilisateur + fournisseur + identifiant de l'enregistrement (aucune substitution possible entre comptes).
- **Rotation** de la clé maîtresse par script, sans interruption.
- Table **jamais lisible par le client** (aucune politique RLS de lecture pour les rôles client) ; accès uniquement via des fonctions serveur ; déchiffrement uniquement en mémoire au moment de l'appel.
- Jamais de clé en clair en base, dans les logs (rédaction automatique), dans les réponses API, dans le bundle, dans localStorage, dans les exports, dans les messages d'erreur. Suppression définitive.
- **Clé de session** : en mémoire côté client uniquement, transmise en HTTPS à chaque requête, utilisée par la passerelle sans stockage ni journalisation. Prévenir que le suivi d'un job long nécessite alors de garder l'onglet ouvert.
- Vérification automatisée en CI : aucun secret dans le bundle client ni dans les logs de test.

### 7.4 Passerelle IA (serveur)

- Routes authentifiées : chat en streaming, soumission de jobs, statut et annulation, test de connexion, webhooks. Sans état : aucune session d'agent conservée côté serveur.
- **Allowlist stricte des hôtes des fournisseurs** : aucune URL arbitraire appelée côté serveur (protection SSRF). Les endpoints personnalisés compatibles OpenAI éventuels ne sont appelés que depuis le navigateur.
- Limites de débit par utilisateur, taille maximale des requêtes, timeouts, reprises avec backoff sur 429/5xx.
- Erreurs normalisées et traduites : `INVALID_KEY`, `INSUFFICIENT_QUOTA`, `RATE_LIMITED`, `MODEL_UNAVAILABLE`, `CONTENT_REJECTED`, `PROVIDER_DOWN`, `TIMEOUT`.
- Pas de relais des gros fichiers quand c'est évitable : le client télécharge le résultat directement ; si CORS l'empêche, stockage temporaire à URL signée courte et suppression automatique. Même principe pour envoyer une image locale (référence, masque, dernière image d'un clip) au fournisseur : URL pré-signée du fournisseur si possible, sinon stockage temporaire signé et expirant.
- Hébergement compatible avec le streaming long (Edge/Workers ou serveur Node).

### 7.5 Registre des modèles

Catalogue central unique (`ai/catalog.ts`) ; aucun nom de modèle ailleurs dans le code.

```ts
type ModelCapability =
  | "chat" | "reasoning" | "vision" | "tools"
  | "image-generation" | "image-editing" | "image-inpainting" | "image-outpainting" | "image-upscale"
  | "text-to-video" | "image-to-video" | "reference-to-video"
  | "transcription" | "speech" | "voice-clone" | "lipsync"
  | "music" | "sfx" | "embeddings";

interface AIModel {
  id: string;                    // identifiant interne stable
  provider: string;              // "anthropic" | "openai" | "openrouter" | "fal" | ...
  providerModelId: string;       // identifiant exact chez le fournisseur
  displayName: string;
  capabilities: ModelCapability[];
  contextWindow?: number;
  maxOutputTokens?: number;
  paramsSchema?: unknown;        // tailles, qualités, durées, résolutions, ratios, audio...
  pricing?: {                    // null si inconnu : ne jamais inventer
    unit: "token" | "image" | "second" | "request";
    details: string;
    sourceUrl: string;
    verifiedAt: string;
  } | null;
  status: "available" | "unverified" | "unavailable";
}
```

- Le `paramsSchema` génère automatiquement les formulaires de génération : ajouter un modèle ne demande pas de code UI.
- **Découverte dynamique** quand le fournisseur expose une liste de modèles : vérifier la disponibilité réelle avec la clé de l'utilisateur.
- Les sélecteurs n'affichent que les modèles **utilisables avec les clés connectées**, filtrés par capacité (`tools` obligatoire pour les modes Assist et Agent).
- Avec une seule clé OpenRouter, proposer automatiquement les modèles équivalents disponibles sur OpenRouter.

### 7.6 Modèles par défaut (configurables, à vérifier à l'implémentation)

- **Agent** (Anthropic, par défaut) : `claude-sonnet-5` (principal), `claude-opus-5` (tâches complexes, en option), `claude-haiku-4-5-20251001` (sous-tâches légères : titres, textes courts, classement).
- **Image** (OpenAI) : `gpt-image-2` — génération, édition, retouche par zone.
- **Vidéo** (fal.ai) : Seedance 2.5 — `bytedance/seedance-2.5/text-to-video`, `bytedance/seedance-2.5/image-to-video`, `bytedance/seedance-2.5/reference-to-video` ; Seedance 2.0 (`bytedance/seedance-2.0/...`, variantes standard, fast, mini) pour les résolutions supérieures ou un coût réduit.
- **Upscale d'image et de vidéo** : modèles fal.ai sélectionnables dans le registre.
- **Transcription** : Whisper local par défaut (gratuit), repli cloud BYOK.
- **Détourage** : modèle local par défaut (gratuit), repli cloud BYOK pour les cas difficiles.
- Chaque identifiant est vérifié dans la documentation officielle ou via l'API de liste des modèles. Introuvable = `unavailable`, jamais remplacé en silence.

### 7.7 Optimisation des coûts pour l'utilisateur

Prompt caching (prompt système, définitions d'outils, résumé du document), contexte compact, sous-tâches confiées au modèle léger, résumé automatique des longues conversations, **gratuit et local d'abord** (détourage, transcription, recherche, silences, rythme) avec badge « Gratuit · local ».

### 7.8 Jobs IA

- Table `ai_jobs` ; états `queued`, `processing`, `completed`, `failed`, `cancelled`.
- Aucune requête HTTP bloquée pendant une génération longue : file du fournisseur, **webhooks** (signature vérifiée ou jeton secret par job), sinon polling.
- **Clé d'idempotence** par soumission : une reprise ne relance (et ne refacture) jamais la même génération.
- Reprise après rechargement, annulation quand l'API le permet, bouton Réessayer.
- Les URLs de résultats peuvent expirer : téléchargement et stockage local **dès la fin du job**.
- Import dans la médiathèque avec métadonnées (prompt, modèle, paramètres, coût estimé, date), ajout immédiat possible au design ou à la timeline.
- Statuts en temps réel (Supabase Realtime ou polling).

### 7.9 Coûts et budgets

- Avant toute génération payante : fournisseur, modèle, paramètres, coût estimé avec source et date de vérification, mention « Facturé directement sur ton compte &lt;fournisseur&gt; ».
- **Ne jamais inventer de prix.** Prix inconnu ou vérifié il y a plus de 30 jours : « Vérifier la tarification du fournisseur » avec lien, sans montant.
- Usage calculé depuis les données réelles renvoyées par le fournisseur.
- Page **Utilisation IA** : fournisseur, modèle, type, requêtes, usage, coût estimé, date, statut.
- **Budgets** par requête et par jour ; **politique d'approbation** des générations : toujours demander / approuver automatiquement sous un seuil / jamais en mode Agent.

---

## 8. FONCTIONS IA CRÉATIVES

Chaque fonction existe dans l'interface **et** comme outil de l'agent (mêmes fonctions internes).

### 8.1 Image

- **Générer une image** : prompt, images de référence, ratio, qualité, modèle, style, respect optionnel du kit de marque. Actions : Ajouter aux médias, Insérer dans le design, Ajouter à la timeline, Remplacer l'image sélectionnée, Variantes, Retoucher.
- **Retouche magique** : sélectionner une zone au pinceau et décrire la modification (ajouter, remplacer, modifier un objet).
- **Gomme magique** : effacer un objet ou une personne et reconstruire le fond.
- **Agrandissement magique** : étendre une image au-delà de ses bords (changement de format).
- **Suppression d'arrière-plan** : locale et gratuite par défaut.
- **Amélioration** : upscale, débruitage.
- **Texte → élément graphique** : icônes, illustrations, stickers à fond transparent, motifs, textures.
- **Maquettes (mockups)** : insérer un design dans une scène (écran, t-shirt, affiche murale) par génération guidée.

### 8.2 Design

- **Texte → design** : à partir d'une consigne (« flyer pour une promotion de rentrée, boutique de tissus, couleurs de ma marque »), l'agent crée un document complet : format, mise en page, titres, textes, images (banques gratuites, rushes de l'utilisateur ou génération payante après approbation), kit de marque. Plusieurs propositions possibles, toutes modifiables.
- **Personnaliser un template** : l'agent remplit les éléments remplaçables avec les informations de l'utilisateur.
- **Rédaction** : écrire, raccourcir, reformuler, traduire, changer le ton d'un texte sélectionné ; proposer des titres et accroches.
- **Redimensionnement magique assisté** (section 5.10).
- **Traduction d'un design** : tous les textes traduits avec ajustement automatique des tailles.
- **Harmonisation** : aligner, espacer, uniformiser les polices et couleurs d'un design désordonné.
- **Critique de design** : lisibilité, contraste, hiérarchie, alignements, avec corrections proposées en mode Assist.

### 8.3 Vidéo

- **Générer une vidéo** : texte → vidéo, image → vidéo, références → vidéo ; fournisseur, modèle, durée, résolution, ratio, audio, prompt ; statuts, annulation.
- **Prolonger un clip** : la dernière image sert d'image de départ.
- **Animer un design** : une page de design devient une image de départ pour image → vidéo.
- **Smart B-roll** : l'utilisateur sélectionne une phrase, un extrait de transcription ou une portion de vidéo ; l'agent analyse le contexte → cherche d'abord dans les rushes → sinon propose un prompt → génère image ou vidéo (après approbation) → place le résultat au-dessus du clip principal → adapte la durée → ajoute une transition si pertinent.
- **Auto Edit** (presets Podcast, Talking Head, YouTube, Shorts, Reels, TikTok, UGC Ad) : silences et longueurs supprimés, meilleurs passages choisis, réordonnés, recadrés, sous-titrés, zooms, B-roll, transitions, musique proposée, audio équilibré, intro/outro, export préparé ; liste des changements affichée.
- **Miniature automatique** : à partir de la vidéo, l'agent capture les meilleures images et compose des miniatures YouTube dans l'éditeur design.

### 8.4 Recherche intelligente (locale, gratuite)

Indexation en arrière-plan de la médiathèque : transcription + embeddings de texte + embeddings d'images (CLIP) sur des images échantillonnées, stockés en local. Recherche en langage naturel (« le passage où je parle du prix », « photo de la boutique avec la vitrine »). Utilisée par l'utilisateur, l'agent et le Script → Vidéo.

---

## 9. AGENT IA ET COMPOSER

### 9.1 Architecture

L'agent n'est pas un chatbot : c'est un planificateur qui agit via des outils typés. Le LLM ne modifie jamais directement un document ni la base de données.

- **Orchestration côté client** : les documents vivant dans le navigateur, la boucle de l'agent s'exécute côté client ; la passerelle serveur ne fait que relayer les appels au LLM (authentification, déchiffrement de la clé, streaming, limites, usage).
- Composants : **Agent Brain** (LLM + prompt système), **Document Context** (représentation compacte), **Tool Registry** (outils, schémas, permissions, classe de coût), **Executor** (validation puis exécution via le Command Bus), **Transaction Manager** (regroupement, dry-run, diff), **History Engine** (le même que pour l'humain), **Permission &amp; Budget Guard**, **Analysis Services** locaux (transcription, silences, scènes, rythme, visages/sujet, détourage, recherche sémantique), **Provider Adapter** (LLM) et **AI Media Adapter** (image, vidéo, voix).
- Provider-agnostic : Anthropic par défaut ; tout LLM compatible tool calling peut être choisi. Un modèle sans tool calling n'est proposé qu'en mode Ask. La vision est recommandée pour le design.

### 9.2 Composer (UI)

Panneau droit rétractable (Ctrl/Cmd+K), identique dans les deux éditeurs et disponible depuis l'accueil (création d'un nouveau document) :

```
┌───────────────────────────────┐
│ Assistant créatif             │
│                               │
│ Que veux-tu créer ou modifier?│
│ [ message…                 ]  │
│                               │
│ + Média   @ Élément   @ Page  │
│                               │
│ Modèle : Claude ▾             │
│ Mode : Assist ▾               │
│                  [ Envoyer ↑ ]│
└───────────────────────────────┘
```

- Mentions : `@document`, `@page`, `@element`, `@selection`, `@brand`, `@timeline`, `@track`, `@clip`, `@audio`, `@image`, `@subtitle`, `@marker`.
- Pièces jointes : images de référence, logos, documents texte, captures.
- Réponses en streaming ; chaque appel d'outil est visible comme une étape.
- Suggestions contextuelles selon l'éditeur ouvert (design : « Crée un post pour annoncer une promo », « Aligne et harmonise cette page », « Décline ce design en story et en miniature YouTube » ; vidéo : « Transforme cette vidéo en Reel de 30 secondes », « Supprime les silences », « Ajoute des sous-titres modernes », « Génère un B-roll d'une ville africaine moderne et place-le ici »).
- Jetons consommés et coût estimé par conversation ; historique sauvegardé avec le document.

### 9.3 Contexte envoyé au LLM

- Résumé **compact et textuel** du document (pas le JSON complet) : pages et éléments (alias courts `e12`, type, position, taille, texte, police, couleurs), séquences, pistes, clips (`c7`, positions en secondes), sélection, kit de marque actif.
- Détails obtenus **à la demande** via les outils de lecture.
- Jamais de fichier complet : métadonnées, extraits de transcription et, via un outil, rendus JPEG basse résolution d'une page ou d'images de la vidéo.
- Budget de jetons ; résumé automatique des longues conversations.

### 9.4 Outils de l'agent

Chaque outil : nom, description claire, schéma Zod converti en JSON Schema, permission requise, classe de coût (`free-local` | `paid`), résultat concis, erreurs explicites avec indication de correction. Les outils d'écriture sont des adaptateurs fins vers les commandes du moteur.

**Lecture et analyse (locales, gratuites)**
`get_document_overview`, `inspect_page`, `inspect_element`, `inspect_selection`, `inspect_timeline(range?)`, `inspect_clip`, `search_media`, `search_stock_media`, `get_brand_kit`, `list_templates`, `get_transcript(asset|range)`, `transcribe_media`, `detect_silences`, `detect_scenes`, `detect_beats`, `track_subject`, `render_page(page)` et `render_frames(times)` — rendus d'aperçu pour que l'agent **vérifie visuellement son travail**, `check_design` (contraste, débordements de texte, éléments hors page, zones de sécurité).

**Sous-tâches IA (payantes, modèle léger)**
`find_highlights`, `write_copy` (texte, titres, accroches, traduction).

**Document et pages**
`create_document(format)`, `add_page`, `duplicate_page`, `delete_page`, `reorder_pages`, `set_page(size, background, duration)`, `apply_template`, `fill_template`, `resize_document(formats[])`, `apply_brand_kit`.

**Éléments de design**
`add_element(type, props)`, `update_element`, `delete_element`, `group_elements`, `ungroup`, `set_layer_order`, `align_elements`, `distribute_elements`, `set_text`, `set_text_style`, `replace_image`, `place_in_frame`, `set_colors`, `replace_color_everywhere`, `add_chart(data)`, `add_table`, `add_qr_code`, `add_animation`.

**Retouche d'image**
`adjust_image`, `apply_filter`, `crop_image`, `remove_background` (local), `add_shadow`, `add_outline`.

**Timeline**
`add_media_to_timeline`, `move_clip`, `trim_clip`, `split_clip`, `delete_clip` (option comblement), `duplicate_clip`, `replace_media`, `change_speed`, `reverse_clip`, `freeze_frame`, `set_transform`, `add_keyframe`, `remove_keyframe`, `create_track`, `delete_track`, `set_track_state`, `set_canvas`, `reframe`, `add_marker`, `apply_effect`, `update_effect`, `remove_effect`, `add_transition`, `remove_transition`, `adjust_color`, `apply_lut`, `set_blend_mode`, `add_mask`, `chroma_key`, `generate_captions`, `edit_caption`, `style_captions`, `set_volume`, `fade_audio`, `normalize_audio`, `denoise_audio`, `duck_audio`, `detach_audio`, `remove_silences`, `add_music`, `sync_cuts_to_beats`.

**Passerelles entre éditeurs**
`page_to_video`, `frame_to_design`, `create_thumbnail_from_video`.

**Lot**
`apply_edits(operations[])` — plusieurs commandes en un seul appel (moins d'allers-retours, moins de jetons).

**Génération (payante)**
`generate_image`, `edit_image_region`, `erase_object`, `expand_image`, `upscale_image`, `generate_graphic`, `generate_video`, `create_broll`, `insert_broll`.

**Projet et interaction**
`create_snapshot`, `export_document(format, options)`, `ask_user` (question à options affichée dans le Composer en cas d'ambiguïté).

### 9.5 Permissions et modes

Permissions : `READ_DOCUMENT`, `WRITE_DOCUMENT`, `DELETE_CONTENT`, `GENERATE_MEDIA`, `EXPORT`.

| Mode | Comportement |
|---|---|
| **Ask** | Lecture seule : l'agent explique, critique et conseille, sans rien modifier. |
| **Assist** (défaut) | L'agent travaille sur une copie ; l'utilisateur voit le diff et choisit Appliquer / Refuser / Ajuster. |
| **Agent** | Modifications appliquées directement, sans confirmation pour chaque petite action. |

Dans tous les modes, `GENERATE_MEDIA` respecte la politique d'approbation et les budgets ; supprimer un média de la médiathèque ou une page entière demande toujours confirmation. Le mode actif est toujours clairement visible.

### 9.6 Transactions, diff et concurrence

- Chaque demande = **une transaction** (`AgentActionTransaction` regroupant toutes les actions) ; snapshot automatique avant.
- **Diff visuel** : en design, éléments ajoutés, supprimés ou modifiés surlignés sur le canevas et comparaison avant/après de la page ; en vidéo, clips signalés sur la timeline ; plus une liste textuelle des changements.
- **« Annuler les modifications de l'agent »** = un seul Ctrl+Z ; « Restaurer une version précédente » via l'historique.
- Pendant l'exécution en mode Agent, le document est en lecture seule avec une bannière « L'assistant modifie le document… » et un bouton **Stop** ; ensuite, l'utilisateur garde ou annule les actions déjà faites.
- En mode Assist, si le document a changé entre la proposition et l'application : recalcul ou avertissement.
- Les médias générés restent dans la médiathèque même si la transaction est annulée (ils ont été payés).
- Jamais de destruction silencieuse d'un document.

### 9.7 Plan et restitution

Pour les tâches complexes, plan compact mis à jour en temps réel :

```
Création demandée
✓ Analyse de la demande et du kit de marque
✓ Choix du format et de la mise en page
● Rédaction des textes
○ Sélection des images
○ Vérification visuelle
○ Déclinaisons (story, miniature)
```

À la fin : « Terminé — 23 modifications » avec **Tout annuler**, **Voir les changements**, **Continuer**.

### 9.8 Limites et garde-fous

- Nombre maximal d'étapes par demande (configurable, ex. 30), budget de jetons et de coût par demande, timeouts ; si un même outil échoue 3 fois, arrêt et explication.
- **Contenu non fiable** : transcriptions, noms de fichiers, textes des designs et templates, texte visible dans les images, documents importés = **données**, jamais des instructions. Délimités dans le contexte. Aucune génération payante ni suppression ne peut être déclenchée par leur contenu. Tests d'injection obligatoires.
- Refus de reproduire des logos, personnages ou œuvres protégés de tiers ; la génération d'images suit les politiques des fournisseurs, et les refus sont affichés clairement.

### 9.9 Prompt système de l'agent (à rédiger dans le code)

Rôle de directeur artistique, graphiste et monteur professionnel.

- Règles de design : hiérarchie visuelle claire, un seul point focal, grille et alignements, espaces blancs, 2 polices maximum, contraste lisible (WCAG), respect du kit de marque, zones de sécurité et fond perdu pour l'impression, texte jamais tronqué.
- Règles de montage : accroche dans les 2 à 3 premières secondes des formats courts, coupes aux limites de phrases (jamais au milieu d'un mot, grâce aux horodatages au mot), coupes sur le mouvement, rythme adapté au format, sous-titres dans les zones de sécurité, niveaux audio cohérents.
- Méthode : planifier avant d'agir, grouper avec `apply_edits`, vérifier avec `render_page` / `render_frames` et `check_design` après des changements importants, utiliser `ask_user` en cas d'ambiguïté, expliquer brièvement ses choix, privilégier les ressources gratuites (médias de l'utilisateur, banques d'images, IA locale) avant la génération payante, ne jamais générer de média payant hors politique d'approbation, répondre dans la langue de l'utilisateur.

### 9.10 Sélecteur de modèle

Dans le Composer, n'afficher que les modèles utilisables avec les clés connectées, filtrés par capacité via le registre (jamais de conditions codées en dur) ; lien « Gérer les fournisseurs ». Pour « Générer une image », uniquement les modèles image ; pour « Générer une vidéo », uniquement les modèles vidéo.

### 9.11 Scénarios de référence (doivent fonctionner de bout en bout)

**Scénario A — vidéo** : « Transforme cette vidéo de 8 minutes en TikTok de 45 secondes très dynamique. »
`get_document_overview` → `inspect_timeline` → `transcribe_media` → `find_highlights` → transaction → `apply_edits` (meilleurs passages) → `remove_silences` → `set_canvas` 9:16 → `reframe` → `generate_captions` + `style_captions` → zooms par keyframes → `normalize_audio` → B-roll si nécessaire (avec approbation) → `render_frames` → « Terminé — N modifications ».

**Scénario B — génération vidéo** : « À 00:12, ajoute un plan de 5 secondes montrant une ville africaine futuriste la nuit. »
Position comprise → clip environnant inspecté → prompt rédigé → coût estimé + approbation → `generate_video` → job suivi → import → insertion à 00:12 → durée ajustée à 5 s → transition si pertinent.

**Scénario C — design** : « Crée une affiche A3 pour la soirée de lancement de ma boutique, samedi 18 h, avec mon logo et mes couleurs, puis décline-la en post Instagram et en story. »
`get_brand_kit` → `create_document(A3, impression)` → mise en page → `write_copy` → images (médias de l'utilisateur ou banques gratuites ; génération seulement après approbation) → `apply_brand_kit` → `render_page` + `check_design` → corrections → `resize_document([post 4:5, story 9:16])` → vérification de chaque format → « Terminé ».

**Scénario D — passerelle** : « Fais-moi 3 miniatures YouTube pour cette vidéo. »
`detect_scenes` + `track_subject` → meilleures images → `frame_to_design` → `remove_background` → titres percutants (`write_copy`) → 3 variantes 1280×720 → `check_design` → propositions en mode Assist.

---

## 10. IA AVANCÉE (phase 9, après stabilisation du cœur)

Même architecture : registre, adaptateurs, jobs, coûts, outils de l'agent. Priorité aux options locales gratuites.

- **Voix off IA** : texte → voix phrase par phrase (un clip par phrase, régénérable) ; option locale (TTS léger dans le navigateur) + cloud (ElevenLabs, OpenAI) ; sous-titres alignés depuis le texte. **Clonage de voix** uniquement depuis un enregistrement de l'utilisateur, avec attestation obligatoire.
- **Vidéo longue → Shorts** en lot : 3 à 10 shorts (un document par short), export groupé.
- **Script → Vidéo** : script ou idée → storyboard éditable en cartes → source par scène (rushes, banques gratuites, image ou vidéo générée, design animé) → voix off, sous-titres, musique → assemblage. Coût total estimé par scène avant lancement, scènes basculables en mode gratuit.
- **Doublage et traduction** : transcription → traduction adaptée à la durée → voix IA → lip sync optionnel → sous-titres traduits.
- **Lip sync et avatars parlants** (fal.ai) : attestation de consentement obligatoire pour tout visage réel ; les CGU interdisent l'usage du visage ou de la voix d'autrui sans accord.
- **Musique et effets sonores IA** ajustés à la durée.
- **Retouche vidéo IA** : suppression d'objet, upscale, interpolation d'images.
- **Kit de marque automatique** : à partir d'un logo ou d'un site, proposer palette, polices et styles.
- **Moteur de pipelines** : étapes, dépendances, statuts, reprise, relance d'une seule étape, coût réel cumulé.
- Outils supplémentaires : `generate_voiceover`, `clone_voice`, `translate_and_dub`, `lipsync_clip`, `generate_talking_avatar`, `generate_music`, `generate_sfx`, `script_to_storyboard`, `storyboard_to_timeline`, `upscale_clip`, `remove_object`. L'agent ne peut **jamais** cocher lui-même une attestation de consentement.

---

## 11. COMPTES, SÉCURITÉ, DONNÉES ET CONFORMITÉ

- **Auth** : inscription, connexion, déconnexion, mot de passe oublié, vérification e-mail (activable), connexion Google optionnelle, paramètres du compte.
- **Suppression du compte** : clés, documents synchronisés, jobs, kits de marque, presets, templates personnels. **Export des données** personnelles.
- **Isolation** : RLS sur toutes les tables **et** vérifications d'autorisation côté serveur (une connexion Drizzle avec un rôle privilégié contourne le RLS). Tests automatisés : un utilisateur ne peut jamais lire ni modifier les données d'un autre.
- **Secrets** : modules serveur `server-only`, aucun secret dans une variable `NEXT_PUBLIC_*`, `.env.example` sans valeur réelle.
- **En-têtes** : CSP stricte, protection CSRF, HSTS, en-têtes de sécurité standards. Import SVG **assaini** (aucun script, aucune ressource externe).
- **Entrées** : validation Zod partout, limites de taille.
- **Minimisation** : le serveur conserve les métadonnées d'usage IA, pas le contenu des prompts ni des médias (sauf synchronisation choisie).
- **Licences** : chaque asset porte sa source et sa licence ; attributions des banques d'images conservées ; polices, icônes, sons et templates uniquement originaux ou sous licence compatible avec un usage commercial.
- **Pages légales** : CGU, politique de confidentialité, page « Comment fonctionnent tes clés API » (tes clés, tes coûts, ce que nous stockons et ne stockons pas), licences, procédure de signalement de contenu.

---

## 12. MODÈLE DE DONNÉES

**Serveur (Postgres)** : `profiles`, `folders`, `documents` (métadonnées, type, propriétaire, miniature, synchronisation activée, corbeille), `document_versions` (document compressé, origine, date), `brand_kits` (+ assets du kit), `templates` (catalogue public administré et templates personnels), `ai_provider_credentials` (champs chiffrés, 4 derniers caractères, statut, dernier test), `ai_requests` (fournisseur, modèle, type, usage, coût estimé, statut, durée, sans contenu), `ai_jobs`, `agent_sessions` (métadonnées et totaux ; messages stockés dans le document), `user_presets` (styles de texte, sous-titres, couleur, export), `stock_cache` (métadonnées et attributions), `entitlements` (futur).

**Local (IndexedDB + OPFS)** : documents, médiathèque, proxys, miniatures, formes d'onde, transcriptions, index de recherche, jobs d'export, sessions du Composer, polices importées.

**Entités du document** : Document, Page, Sequence, Track, Clip, Element (image, text, shape, path, group, frame, grid, chart, table, qrcode, video, audio), Asset, Effect, Filter, Transition, Animation, Keyframe, Caption, Marker, Guide, AgentSession, AgentMessage, AgentAction.

---

## 13. OBSERVABILITÉ ET RÉSILIENCE

- Traces : session d'agent, modèle, fournisseur, appels d'outils, durée, résultat, erreurs, jetons, générations, statuts, exports.
- Jamais dans les logs : clés, secrets, en-têtes d'authentification, médias privés, contenu des prompts par défaut.
- Une erreur IA ne casse jamais un éditeur. Génération échouée : document conservé, message clair, Réessayer. Fournisseur indisponible : édition manuelle intacte. Sans clé : « Connecte un fournisseur IA pour utiliser les fonctions IA », jamais une erreur technique.
- Rechargement brutal pendant un export ou une génération : aucun document corrompu, jobs repris.

---

## 14. PERFORMANCE

- Interactions à 60 fps dans les deux éditeurs.
- Design : document de 50 pages et page de 300 éléments sans saccade (rendu par tuiles ou mise en cache des éléments statiques, rendu uniquement des pages visibles) ; photos de 50 mégapixels éditables via proxys.
- Vidéo : aperçu fluide avec 3 pistes HD + texte + effets sur un ordinateur de milieu de gamme ; timeline de 200+ clips.
- Traitements lourds en workers avec objets transférables ; aucun pixel ni flux vidéo dans l'état React.
- Caches : miniatures, formes d'onde, images décodées (LRU), rendus de pages, transcriptions.
- Modèles d'IA locale et polices téléchargés **à la demande** (taille affichée, mise en cache, reprise) : important pour les connexions lentes ou limitées.
- Tests de performance dédiés ; profiler React ; élimination des rerenders inutiles.

---

## 15. QUALITÉ DU CODE ET TESTS

### 15.1 Qualité

TypeScript strict · modules courts · séparation UI / domaine / infrastructure · aucun composant monolithique · pas de `any` inutile · validation des entrées · gestion d'erreurs explicite · aucun secret en dur · migrations de base de données · `.env.example` · README complet · dépendances justifiées (pas de bibliothèque lourde inutile).

### 15.2 Tests

- **Unitaires** : commandes (invariants execute/undo/redo), calculs de temps et d'unités, mise en page du texte, contraintes et redimensionnement magique, migrations de format, registre et filtrage des modèles, estimation des coûts, coffre (chiffrement, déchiffrement, rotation), schémas des outils de l'agent, assainissement SVG.
- **Rendu** : tests de régression visuelle (rendus de référence) pour le texte, les effets, les exports PNG et PDF.
- **Intégration** : passerelle avec fournisseurs simulés (fixtures de contrat), cycle de vie des jobs (webhooks, idempotence, reprise), proxy des banques d'images, isolation multi-utilisateur.
- **E2E (Playwright)** avec **Google Chrome** (et non Chromium, qui n'embarque pas H.264/AAC) :
  - design : créer depuis un template → modifier textes, photo, couleurs → détourage local → ajouter une page → redimensionnement magique → export PNG et PDF → vérifier les fichiers ;
  - vidéo : importer → timeline → couper → déplacer → audio → texte → sous-titres → transitions → annuler/rétablir → recharger → exporter → vérifier durée et résolution ;
  - IA : connecter et tester une clé (fournisseur simulé) ; session d'agent avec LLM simulé → modifications vérifiées → « Tout annuler » ; test d'injection.
- Suite **manuelle** optionnelle avec de vraies clés, exclue de la CI.
- Médias de test générés par script : aucun média protégé dans le dépôt.

---

## 16. CRITÈRES D'ACCEPTATION GLOBAUX

Le produit n'est pas terminé parce qu'il ressemble à Canva ou à un éditeur vidéo. Il faut pouvoir réellement :

1. Créer un design et monter une vidéo en mode invité, sans compte ni clé IA.
2. Créer un compte.
3. Créer un design depuis un format ou un template.
4. Modifier textes, polices, couleurs, images, formes ; utiliser calques, alignements, guides intelligents.
5. Retoucher une photo et supprimer son arrière-plan localement.
6. Ajouter un graphique, un tableau et un QR code.
7. Créer et appliquer un kit de marque.
8. Faire un redimensionnement magique vers au moins deux formats.
9. Exporter en PNG transparent, JPG, SVG, PDF standard et PDF impression avec fond perdu.
10. Présenter un document en plein écran.
11. Importer une vidéo, la déposer sur la timeline, la lire, la couper, la déplacer.
12. Modifier l'audio, ajouter du texte, des sous-titres (génération locale), des transitions et des effets.
13. Transformer un design animé en vidéo et capturer une image de vidéo en design.
14. Annuler / rétablir partout.
15. Sauvegarder, rouvrir (y compris après rechargement brutal), retrouver un document dans un dossier.
16. Exporter une vidéo lisible, sans watermark.
17. Connecter une clé IA et la tester.
18. Générer une image, retoucher une zone, agrandir une image.
19. Générer une vidéo et l'ajouter à la timeline.
20. Demander à l'agent de créer un design complet (scénario C).
21. Demander à l'agent de monter une vidéo (scénario A).
22. Voir l'agent effectuer réellement ces modifications.
23. Annuler toutes les modifications de l'agent en une action.
24. Vérifier qu'aucune clé n'apparaît côté client, dans les logs ou dans le bundle.
25. Vérifier qu'un autre utilisateur ne peut accéder à aucune de ces données.

---

## 17. PLAN DE LIVRAISON

**Phase 0 — Audit et fondations**
Audit du dépôt, structure des modules, outillage (lint, format, typecheck, tests, CI), `docs/PROGRESS.md`, `docs/DECISIONS.md`, COOP/COEP, détection des capacités, i18n.
✔ Le projet compile, la CI est verte, l'architecture est documentée.

**Phase 1 — Moteur unifié**
Format de document + migrations, graphe de scène, Command Bus + historique + transactions + dry-run, compositeur partagé, moteur de texte, pipeline média, médiathèque globale, persistance locale, autosave, archive, relinking.
✔ Un test sans interface construit une page de design et une séquence vidéo uniquement par commandes ; rechargement = état identique ; 100 annulations/rétablissements cohérents ; le rendu d'une page et d'une image de séquence utilise le même compositeur.

**Phase 2 — Éditeur de design**
Accueil et formats, canevas multi-pages, éléments, calques, alignements, guides intelligents, texte et effets, retouche photo, détourage local, couleurs, kit de marque, templates initiaux et outil de publication, banques d'images gratuites, graphiques, tableaux, QR codes, redimensionnement magique déterministe, animations, présentations, exports PNG/JPG/WebP/SVG/PDF.
✔ Critères 1, 3 à 10 et 14 validés en E2E (sans compte).

**Phase 3 — Éditeur vidéo**
Timeline, inspecteur, texte, sous-titres (Whisper local), audio, effets, couleur, masques, chroma key, transitions, keyframes, formats, export vidéo, passerelles design ↔ vidéo.
✔ Critères 11 à 16 validés en E2E.

**Phase 4 — Comptes**
Auth, base de données, RLS, dossiers, corbeille, synchronisation des documents, versions, kits de marque et templates personnels côté serveur.
✔ Isolation multi-utilisateur testée ; document rouvert dans un autre navigateur (avec relinking).

**Phase 5 — BYOK**
Coffre de clés, passerelle, registre des modèles, adaptateurs, pages Fournisseurs IA et Utilisation IA.
✔ Connexion, test et suppression pour les 4 fournisseurs ; vérification automatisée qu'aucune clé ne fuit.

**Phase 6 — IA média**
Génération et retouche d'images (génération, retouche par zone, gomme, agrandissement, upscale), génération vidéo, jobs, webhooks, idempotence, coûts et budgets, import dans la médiathèque, le design et la timeline.
✔ Générations réelles avec de vraies clés (test manuel) ; job repris après rechargement ; annulation ; aucune double facturation lors d'une reprise.

**Phase 7 — Agent**
Contexte, outils design et vidéo, exécuteur, transactions et diff, Composer, modes, plan, recherche sémantique locale, texte → design, Smart B-roll, Auto Edit, miniatures automatiques.
✔ Scénarios A, B, C et D de bout en bout ; « Tout annuler » ; tests d'injection réussis.

**Phase 8 — Finition**
Performance, accessibilité, onboarding, raccourcis, responsive et tactile, PWA, enrichissement des templates, pages légales, finalisation de l'i18n.

**Phase 9 — IA avancée**
Section 10.

---

## 18. LIVRABLES FINAUX

À la fin (et mis à jour à chaque phase) :

- architecture finale et structure des dossiers ;
- schéma de base de données et migrations ;
- `.env.example` commenté ;
- liste des fournisseurs, des modèles configurables et de leurs capacités ;
- liste des outils de l'agent avec leurs permissions ;
- guides courts : ajouter un modèle, un fournisseur, un effet, une transition, une animation, un format, un template ; faire tourner la clé maîtresse ;
- commandes d'installation, de développement, de build et de test ;
- état de chaque fonctionnalité (Fonctionnel / Expérimental / Reporté) et limitations restantes.

Le résultat attendu est une **véritable suite créative professionnelle tout-en-un, gratuite, local-first, BYOK et agentique**, où design et vidéo partagent le même moteur, et où l'intelligence artificielle est intégrée directement à ce moteur plutôt qu'ajoutée comme un simple chatbot.
</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Design Components">
This project uses Design Components: every design is a single streaming `Name.dc.html` file. The full authoring spec is in your system prompt under "Writing code — Design Components" — follow it. Author and edit `.dc.html` content with the `dc_write`, `dc_html_str_replace`, `dc_js_str_replace`, and `dc_set_props` tools (not `write_file`; `str_replace_edit` works but won't stream); template edits stream into the live preview as you type.
</attached-skill>


<system-reminder>Auto-injected reminder (ignore if not relevant): do not recreate copyrighted or branded UI unless the user's email domain matches that company. Create original designs instead.</system-reminder>

## Assistant



## Assistant

_[tool: ask_user]_

J'attends tes réponses au formulaire : livrable, écrans prioritaires, système de design et contenu d'exemple. Pour info, ce que je peux produire ici, ce sont des maquettes et des prototypes. Je ne construis pas l'application complète décrite dans la spécification.

## User

Answered — deliverable: Prototype interactif cliquable des écrans clés; screens: Accueil / tableau de bord, Éditeur vidéo (timeline), Composer IA (modes Ask/Assist/Agent, plan, diff), Paramètres > Fournisseurs IA (BYOK), Export (design et vidéo), Kit de marque, Onboarding, Page U…; variations: Une seule direction; variation_axis: Interactions de l'agent (diff, plan); theme: Les deux; fidelity_content: Scénario YouTubeur (vidéo → TikTok + miniatures); language: FR avec bascule EN; agent_demo: Oui

## Assistant



## Assistant

_[tool: ask_user]_

Tu n'as pas choisi de système de design, donc il me reste quatre choix visuels à connaître : ambiance, couleur d'accent, typographie, tutoiement ou vouvoiement. Dès que tu réponds, je construis le prototype.

## User

Answered — vibe: Outil pro sobre et dense (type logiciel de montage); accent: #C6F432; tone: Tu

## Assistant

_[tool: dc_write]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Le prototype cliquable de Montaj Studio est dans `Montaj Studio.dc.html`. Une vérification automatique tourne encore en arrière-plan.

**Ce qui est cliquable**
- **Parcours de départ** : accueil guidé en 3 étapes, puis l'accueil, avec le menu « Créer » par format et un champ pour lancer l'assistant.
- **Éditeur vidéo** : aperçu, timeline à 5 pistes (on peut lire et déplacer la tête de lecture), inspecteur et fenêtre d'export (vidéo, image et PDF).
- **Assistant** :
  - Mode Ask : il conseille sans rien modifier.
  - Mode Assist : il travaille sur une copie. La timeline montre les changements en pointillés, avec Appliquer, Refuser ou Ajuster.
  - Mode Agent : il modifie directement, avec une bannière et un bouton Stop.
  - Il demande ton accord avant de générer un B-roll payant.
  - Tu peux tout annuler en une fois, puis rétablir.
- **Autres écrans** : kit de marque, fournisseurs IA (enregistrer, tester et supprimer une clé), utilisation IA (budgets et règle d'approbation).
- **Réglages** : thème clair ou sombre et bascule FR/EN depuis l'interface. Les réglages permettent aussi de choisir l'écran de départ et la vitesse de l'assistant.

**Limites**
- Quel que soit le texte envoyé, l'assistant déroule le même scénario (vidéo de 8 min → TikTok de 45 s).
- L'éditeur design n'est pas inclus : les formats et documents design affichent une notification.
- Les montants de l'écran Utilisation IA sont des exemples, pas des vrais tarifs.

**Suite possible** : l'éditeur design, et le scénario « 3 miniatures YouTube » qui ferait le lien entre vidéo et design.

## User

Found issues — fixing…

## Assistant

_[tool: update_todos]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai corrigé les trois problèmes de mise en page signalés, sans relancer la vérification automatique.

- **Texte coupé** : les libellés des boutons, pastilles et chips ne passent plus à la ligne.
- **Éditeur trop serré** : il garde une hauteur minimale de 680 px et la timeline se réduit si la place manque. L'aperçu et le Composer ne débordent plus dessus.
- **Fenêtre étroite** : la page défile maintenant quand l'écran est plus petit que l'éditeur, donc le Composer et le bouton Exporter restent accessibles.

Ton quota d'utilisation est presque atteint. Dis-moi si tu veux continuer, par exemple avec l'éditeur design.

## User

oui continu

## Assistant

_[tool: read_file]_

## User

continu tout

## Assistant

_[tool: update_todos]_

_[tool: run_script]_

Nothing was written (script aborted); rerun without the props edit and set props separately.

_[tool: grep]_

_[tool: dc_set_props]_

_[tool: run_script]_

_[tool: ready_for_verification]_

_[tool: update_todos]_

J'ai ajouté l'éditeur design au prototype. Je ne l'ai pas encore testé moi-même, et une vérification automatique tourne en arrière-plan.

Tu l'ouvres depuis l'accueil (le document « Miniatures — Test Pixel 11 », le menu Créer ou la suggestion « 3 miniatures »), ou avec l'option « Partir d'un template » à la fin de l'accueil guidé.

**Ce que tu peux faire dedans :**
- **Sur le canevas** : cliquer pour sélectionner, glisser pour déplacer. Une ligne rose apparaît et l'élément se cale quand il est centré. Les flèches, Suppr, ⌘D, ⌘Z et ⌘⇧Z fonctionnent.
- **Au-dessus de l'élément sélectionné** : une barre pour dupliquer, passer au premier plan ou à l'arrière-plan, verrouiller ou supprimer.
- **À gauche** :
  - ajouter du texte ;
  - ajouter des formes et un cadre photo ;
  - insérer des images tirées de la vidéo ;
  - appliquer une couleur ou le logo du kit de marque.
- **À droite** :
  - **Inspecteur** : position, taille, texte et couleur, avec une alerte si le contraste avec le fond est trop faible.
  - **Calques** : afficher, masquer ou verrouiller chaque élément.
- **En bas** : 3 miniatures de page à jour en direct, et un bouton « + Page ».
- **Présenter** passe en plein écran, avec les flèches pour naviguer et Échap pour quitter. **Exporter** ouvre la fenêtre d'export sur l'onglet Image et PDF.

**Limites :** on ne peut pas encore redimensionner un élément en le tirant à la souris, seulement via les champs de l'inspecteur. L'assistant n'est pas encore disponible dans l'éditeur design.

Ton quota d'utilisation est presque épuisé.

## User

L'assistant n'est pas encore disponible dans l'éditeur design ajoute le

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai ajouté l'assistant à l'éditeur design, dans un 3ᵉ onglet « Assistant » à droite (ou avec ⌘K). Je ne l'ai pas testé moi-même ; une vérification automatique tourne encore en arrière-plan.

- **Ask** : il donne un avis sur les miniatures sans rien toucher.
- **Assist** : il modifie une copie des 3 pages, en direct. Les éléments changés ont un contour pointillé et un badge « Aperçu » s'affiche. Tu choisis ensuite Appliquer ou Refuser.
- **Agent** : il applique directement. Pendant qu'il travaille, le canevas est bloqué, une bannière s'affiche avec un bouton Stop. À la fin, « Tout annuler » défait tout en un seul ⌘Z.

**Ce qu'il fait réellement sur le document** : il met les titres à la même taille, réécrit les titres des pages 2 et 3, et ajoute le logo sur ces deux pages. Il affiche aussi son plan avec les outils utilisés (gratuit/local ou Haiku payant).

Comme dans l'éditeur vidéo, il déroule toujours ce même scénario, quel que soit le texte envoyé.

## User

dis moi quels sont toutes les fonctionnalites premium de capcut et celui de canva premium tout

## Assistant

_[tool: web_search]_

_[tool: web_search]_

Aucune source ne donne une liste complète et fixe : les deux éditeurs changent souvent ce qui est inclus. Voici ce qu'on retrouve de façon constante en septembre 2026.

## CapCut Pro

**Prix et niveaux**
- L'offre Standard ajoute une bibliothèque plus large de ressources et d'outils de montage. L'offre Pro débloque la suite IA avancée, les médias premium et jusqu'à 1 To de stockage cloud. Aux États-Unis, Pro coûte 19,99 $ par mois ou 179,99 $ par an, mais les prix locaux et les quotas IA varient.

**Export et stockage**
- Export en 4K, toute la boîte à outils IA (suivi de caméra, isolation de la voix, sous-titres qui identifient qui parle, effets de voix IA) et au moins 100 Go de stockage cloud.
- Collaboration en équipe.

**Outils IA (selon la plateforme et le déploiement)**
- Suivi de caméra, recadrage automatique, suppression d'arrière-plan, isolation de la voix, sous-titres par intervenant, effets de voix, texte → vidéo, avatars et clonage de voix.
- Auto Cut (montage automatique) : disponible sur mobile et ordinateur, mais pas sur CapCut Web.

**Ressources premium**
- Effets premium, modèles de texte avancés et effets corporels.
- Templates, effets, transitions, styles de texte et médias premium.

**Licence**
- Licence commerciale complète : travail pour des clients, publicité, diffusion et projets rémunérés.
- Un autre guide apporte une nuance : payer ne donne pas le droit d'utiliser commercialement toutes les ressources.

**Crédits IA**
- Pro ne rend pas toutes les actions IA illimitées et ne garantit pas la 4K sur tous les appareils. Les générations consomment des crédits.

## Canva Pro

**Prix**
- Pro coûte 15 $ par utilisateur et par mois. Business coûte 20,83 $ par utilisateur et par mois.

**Fonctions de base**
- Suppression d'arrière-plan : en un clic, pour les photos produit, les portraits ou les PNG transparents.
- Bibliothèque : accès à toute la bibliothèque de photos, éléments, vidéos et audio, sans frais supplémentaires.
- Redimensionnement magique : redimensionner un design vers n'importe quel format en un clic.
- Kit de marque : importer ton logo, définir tes couleurs et polices, et les appliquer à n'importe quel design en un clic. L'offre gratuite n'a pas de gestion de marque.
- Animation : une façon simple d'animer tes designs.
- Planification : Canva Schedule publie sur Facebook, LinkedIn, Pinterest et Twitter.
- Export en PNG à fond transparent.
- Outils IA de Magic Studio (texte → image, Magic Design, etc.).

**Vidéo IA**
- La génération vidéo premium basée sur Sora, disponible à partir de Pro, n'est pas comprise dans l'abonnement. Elle est facturée à chaque génération.

**Nouveautés 2026**
- En avril 2026, Canva a lancé Canva AI 2.0 en préversion, avec des outils agentiques capables de planifier et de réaliser des tâches de design récurrentes en arrière-plan.
- Un mode hors ligne permet aussi de modifier certains designs sans connexion, puis de les synchroniser.

**Business en plus de Pro**
- 500 Go de stockage par utilisateur, 100 kits de marque, circuits d'approbation, statistiques sur les designs et outils d'administration d'équipe.

## Ce que ça change pour Montaj Studio

Ta spécification couvre déjà presque tout cela, gratuitement et avec tes propres clés API. Voici ce qui n'y est pas encore :

- Isolation de la voix
- Sous-titres par intervenant
- Suivi de caméra
- Avatars
- Planification de publications sur les réseaux sociaux
- Circuits d'approbation en équipe

Les prix et le contenu des offres varient selon le pays et le compte. La page d'abonnement officielle de chaque produit fait foi.

## User

<pasted_text name="Pasted text (122 lines)">
Oui. J’ai vérifié les offres actuelles. Petite précision : chez Canva, l’offre individuelle premium s’appelle **Canva Pro**. Canva propose aussi des offres supérieures comme Business/Enterprise, donc je ne vais pas mélanger leurs fonctions avec Pro. ([Canva][1])

## 1. CapCut Pro — fonctionnalités premium

CapCut Pro est surtout centré sur le **montage vidéo professionnel, les ressources premium, l’IA et le workflow multi-appareils**. La formule Pro améliorée pour les nouveaux abonnés annonce jusqu’à **1 To de stockage cloud et 1 200 crédits IA**, même si certaines anciennes pages d’aide mentionnent encore 100 Go : CapCut précise aussi que les avantages peuvent dépendre de la région, de la plateforme et du plan affiché sur le compte. ([CapCut][2])

| Domaine              | Fonctionnalités CapCut Pro                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Montage**          | Timeline multipiste, découpage, split, trim, vitesse, reverse, freeze frame, crop, rotation, transformations, keyframes et outils avancés disponibles dans l’éditeur |
| **Export premium**   | Export jusqu’en **4K / 60 fps** selon appareil/projet, export sans filigrane pour les fonctionnalités concernées ([CapCut][3])                                       |
| **Templates**        | Templates premium/exclusifs et modèles avancés                                                                                                                       |
| **Texte**            | Styles de texte premium, templates de titres/légendes, ressources typographiques marquées Pro                                                                        |
| **Transitions**      | Transitions premium et cinématiques                                                                                                                                  |
| **Effets vidéo**     | Effets premium, overlays et effets visuels avancés                                                                                                                   |
| **Body effects**     | Effets corporels et suivi visuel                                                                                                                                     |
| **Filtres**          | Filtres premium et nouveaux packs créatifs                                                                                                                           |
| **Auto Reframe**     | Recadrage automatique par IA selon le ratio, avec suivi du sujet ; fonction Pro sur les plateformes documentées ([CapCut][4])                                        |
| **Camera Tracking**  | Suivi automatique de caméra/sujet assisté par IA                                                                                                                     |
| **Auto Captions**    | Génération automatique de sous-titres, avec édition, re-segmentation et reconnaissance ([CapCut][5])                                                                 |
| **Avatars IA**       | Génération/utilisation d’avatars IA                                                                                                                                  |
| **Génération IA**    | Contenus générés par IA et outils génératifs selon crédits et disponibilité                                                                                          |
| **Text-to-video**    | Génération vidéo à partir d’un prompt sur les outils IA compatibles                                                                                                  |
| **Image-to-video**   | Animation d’images / génération de séquences depuis une image                                                                                                        |
| **IA vidéo**         | Génération de scènes, voix IA, arrière-plans et autres traitements IA selon l’outil et les crédits ([CapCut][6])                                                     |
| **Audio**            | Outils audio, réduction de bruit, ajustements de volume et traitements avancés ; certaines fonctions de base existent aussi dans Standard                            |
| **Assets premium**   | Vidéos, effets, templates, ressources créatives et contenus premium                                                                                                  |
| **Usage commercial** | Accès à des ressources explicitement prévues pour un usage commercial dans Pro ([CapCut][5])                                                                         |
| **Cloud**            | Stockage étendu ; jusqu’à **1 To** sur le Pro amélioré                                                                                                               |
| **Crédits IA**       | Jusqu’à **1 200 crédits IA** sur le nouveau Pro documenté                                                                                                            |
| **Multi-appareils**  | Travail sur **mobile + desktop + web**                                                                                                                               |
| **Synchronisation**  | Projets cloud accessibles entre appareils                                                                                                                            |
| **Collaboration**    | Templates d’équipe, bibliothèques de marque et fonctions de review                                                                                                   |
| **Brand assets**     | Bibliothèques d’éléments de marque pour workflow professionnel                                                                                                       |
| **Mises à jour**     | Nouvelles ressources, effets, filtres et outils premium ajoutés régulièrement                                                                                        |

Les éléments explicitement mis en avant aujourd’hui par CapCut comme avantages Pro sont notamment les **templates premium illimités, ressources commerciales, collaboration avancée, édition cross-platform, stockage cloud étendu et outils IA avancés comme camera tracking, sous-titres automatiques, avatars IA et génération IA**. ([CapCut][5])

---

# 2. Canva Pro — fonctionnalités premium

Canva Pro est beaucoup plus large : **design graphique + photo + vidéo + IA + marque + réseaux sociaux + documents + présentations + automatisation**. L’offre actuelle annonce **3,6 M+ de modèles**, **141 M+ de photos/vidéos/éléments/audio premium**, **5 Brand Kits**, **100 Go de stockage cloud** et environ **10× plus d’usage IA que Canva Free** pour les outils Premium/Ultra concernés. ([Canva][1])

| Domaine                       | Fonctionnalités Canva Pro                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Templates premium**         | Accès à environ **3,6 millions de modèles**, premium inclus                                                                         |
| **Bibliothèque premium**      | Environ **141 millions** de photos, vidéos, illustrations, graphiques, éléments et pistes audio                                     |
| **Dimensions personnalisées** | Création dans les dimensions souhaitées                                                                                             |
| **Redimensionnement magique** | Adapter automatiquement un design à Instagram, TikTok, YouTube, affiches, etc.                                                      |
| **Magic Switch**              | Transformer un design dans un autre format et réadapter son contenu                                                                 |
| **Traduction**                | Traduction automatique de designs dans de nombreuses langues                                                                        |
| **Création en masse**         | Génération/bulk design à partir de données                                                                                          |
| **Canva AI 2.0**              | Assistant conversationnel créatif intégré                                                                                           |
| **Magic Write**               | Génération, réécriture, résumé et expansion de texte                                                                                |
| **Magic Edit**                | Ajouter/remplacer/modifier une partie d’une image par prompt                                                                        |
| **Magic Eraser**              | Effacer automatiquement des objets                                                                                                  |
| **Magic Grab**                | Séparer un sujet/objet pour le repositionner ou le modifier                                                                         |
| **Grab Text**                 | Reconnaître et manipuler le texte intégré dans une image                                                                            |
| **Magic Expand**              | Étendre l’image au-delà de ses bordures                                                                                             |
| **Magic Morph**               | Transformer le style d’un texte ou d’une forme                                                                                      |
| **Magic Animate**             | Générer automatiquement des animations                                                                                              |
| **Magic Charts**              | Générer/adapter des graphiques intelligemment                                                                                       |
| **Magic Layers**              | Reconstituer des éléments en couches éditables avec l’IA                                                                            |
| **Image generation**          | Génération d’images avec Canva AI                                                                                                   |
| **Design generation**         | Génération complète d’un design avec l’IA                                                                                           |
| **Elements generation**       | Génération IA de formes, éléments 3D, charts, formulaires, etc.                                                                     |
| **Background Generator**      | Générer/remplacer un arrière-plan                                                                                                   |
| **Background Remover Photo**  | Suppression d’arrière-plan en un clic                                                                                               |
| **Background Remover Video**  | Suppression d’arrière-plan sur vidéo                                                                                                |
| **Image Upscaler**            | Amélioration de résolution                                                                                                          |
| **Retouche IA**               | Retouche et amélioration assistées par IA                                                                                           |
| **Canva Code**                | Création d’expériences interactives par prompt                                                                                      |
| **AI Voice**                  | Génération de voix IA                                                                                                               |
| **Music/SFX Generator**       | Génération de musique et effets sonores                                                                                             |
| **Form Generator**            | Création de formulaires par IA                                                                                                      |
| **Mockups**                   | Mise en situation de designs sur produits/appareils                                                                                 |
| **Photo animations**          | Animation de photos et éléments                                                                                                     |
| **Video animations**          | Animation et effets vidéo                                                                                                           |
| **Beat Sync**                 | Synchronisation **automatique** des clips au rythme de la musique                                                                   |
| **Highlights**                | Détection automatique des meilleurs moments d’une longue vidéo                                                                      |
| **Enhance Voice**             | Nettoyage/amélioration de la voix et réduction du bruit parasite                                                                    |
| **Vidéo premium**             | Templates et médias vidéo premium                                                                                                   |
| **Éditeur vidéo**             | Timeline, clips, transitions, texte, musique, animations, etc.                                                                      |
| **Exports transparents**      | PNG avec fond transparent                                                                                                           |
| **Brand Kit**                 | Logos, couleurs, polices, images, modèles et guidelines de marque                                                                   |
| **5 identités visuelles**     | Jusqu’à **5 Brand Kits** sur Pro actuel                                                                                             |
| **Brand Templates**           | Templates cohérents avec l’identité visuelle                                                                                        |
| **IA + marque**               | Canva AI peut utiliser Brand Kit pour générer du contenu cohérent avec la marque                                                    |
| **Components**                | Composants réutilisables se mettant à jour dans différents designs                                                                  |
| **Content Planner**           | Calendrier éditorial pour réseaux sociaux                                                                                           |
| **Publication programmée**    | Programmer directement Facebook, Instagram, X/Twitter, LinkedIn, etc.                                                               |
| **Analytics sociaux**         | Impressions, clics, likes et commentaires des contenus publiés via le planner                                                       |
| **Canva Offline**             | Travail hors connexion sur les fonctions prises en charge                                                                           |
| **Affinity**                  | Accès à Affinity avec fonctions IA incluses selon le plan                                                                           |
| **Stockage**                  | **100 Go cloud** actuellement pour Canva Pro                                                                                        |
| **Dossiers**                  | Dossiers illimités                                                                                                                  |
| **Liens personnalisés**       | Jusqu’à 5 liens courts personnalisés sur Pro actuel                                                                                 |
| **IA à plus haut quota**      | Environ **10×** le volume IA de Canva Free sur l’offre Pro actuelle                                                                 |
| **Premium AI**                | Magic Layers, Canva Code, génération de designs/images/éléments, musique/SFX, formulaires, etc. utilisent l’allocation IA           |
| **Outils IA standards**       | Certaines fonctions comme Magic Write/Translate peuvent être utilisées beaucoup plus largement sur les plans payants, sous fair use |

La liste IA actuelle de Canva comprend officiellement notamment **Magic Write, Magic Resize, Translate, Magic Animate, Magic Charts, Magic Edit, Magic Eraser, Magic Expand, Magic Grab, Magic Morph, Mockups, Background Remover photo/vidéo, Background Generator, AI Voice, Beat Sync, Highlights et Enhance Voice**. ([Canva][1])

## Différence fondamentale

**CapCut Pro** est beaucoup plus spécialisé :

**Vidéo → montage → IA vidéo → Shorts/Reels/TikTok → audio → sous-titres → effets.**

**Canva Pro** est une plateforme créative beaucoup plus large :

**Design → image → vidéo → documents → présentations → réseaux sociaux → branding → IA → génération de contenu.**

Pour un produit qui voudrait combiner les deux, le cœur le plus puissant serait donc : **éditeur vidéo CapCut + canvas/design Canva + Magic Studio/IA + Brand Kit + Content Planner + collaboration + stockage cloud**.

[1]: https://www.canva.com/pricing/?gclsrc=aw.ds&amp;utm_source=chatgpt.com "Canva Pricing: Compare Free, Pro, Business and Enterprise plans"
[2]: https://www.capcut.com/help/new-capcut-subscription-pricing?utm_source=chatgpt.com "What Is the Price of CapCut for New Subscribers"
[3]: https://www.capcut.com/help/why-prompted-to-purchase-capcut-pro?utm_source=chatgpt.com "Why Am I Prompted to Purchase CapCut Pro?"
[4]: https://www.capcut.com/help/why-do-i-have-to-pay-for-auto-reframe?utm_source=chatgpt.com "Why Do I Have to Pay Now for the Auto Reframe?"
[5]: https://www.capcut.com/help/capcut-standard-vs-pro?utm_source=chatgpt.com "What's the Difference Between CapCut Standard and CapCut Pro Subscription"
[6]: https://www.capcut.com/tools/ai-video?utm_source=chatgpt.com "CapCut AI Video: Professional Video Creation with ease"

</pasted_text>

## Assistant

Voici ce qui manque dans ta spécification Montaj Studio par rapport à cette liste. Je n'ai pas revérifié les chiffres de ton texte (3,6 M de modèles, 1 To, 1 200 crédits…).

**Déjà couvert par la spécification** : montage multipiste et images clés, export 4K, sous-titres automatiques, recadrage automatique, suivi du sujet, détourage photo et vidéo, gomme, agrandissement, retouche par zone, amélioration de résolution, génération d'images et de vidéos, voix IA, musique et bruitages, redimensionnement magique, traduction, rédaction, graphiques, mockups, kit de marque, synchronisation sur le rythme, meilleurs moments, amélioration de la voix, travail hors ligne, dossiers, templates.

**Absent de la spécification, à ajouter :**
1. **Création en masse** : générer N designs à partir d'un fichier CSV (un design par ligne).
2. **Séparation d'un sujet** : détacher un objet d'une photo pour le déplacer, et reconstruire le fond derrière.
3. **Texte dans une image** : reconnaître le texte d'une image (OCR) et le rendre modifiable.
4. **Calques automatiques** : découper une image plate en calques modifiables.
5. **Transformation de style** d'un texte ou d'une forme.
6. **Génération d'arrière-plan** derrière un sujet détouré.
7. **Composants réutilisables** : un élément modifié une fois se met à jour dans tous les designs.
8. **Calendrier éditorial, publication programmée et statistiques sociales.** Cela demande des connexions OAuth aux réseaux sociaux, donc un vrai backend.
9. **Liens de partage courts.**
10. **Pages interactives et formulaires** générés par l'IA.
11. **Isolation de la voix** et **sous-titres par intervenant.**
12. **Avatars IA** (déjà prévus en phase 9, à confirmer).
13. **Collaboration en équipe** : bibliothèques partagées, relecture et commentaires. La v1 l'exclut volontairement.

**Écarts de philosophie à garder :** dans Montaj Studio il n'y a ni crédits internes ni ressources verrouillées. Les quotas IA sont remplacés par tes propres clés API, et les grandes banques de médias par les banques gratuites.

Que veux-tu faire de cette liste ?
- **A.** Je l'ajoute à la spécification, avec les phases et les outils de l'agent correspondants.
- **B.** J'ajoute certains de ces écrans au prototype. Par exemple : création en masse, calendrier éditorial, séparation d'un sujet.
- **C.** Les deux.

## User

je veux tout ca

## Assistant

_[tool: write_file]_

_[tool: show_to_user]_

J'ai ajouté toutes ces fonctionnalités dans une annexe à ta spécification : `docs/SPEC-ADDENDUM-parite.md`, ouverte dans ton onglet. Chaque fonctionnalité a un nom original (aucun « Magic… »), et le document ne reprend pas les chiffres de ton texte (3,6 M de modèles, 1 To…), que je n'ai pas vérifiés.

- **A. Déjà couvert** : 30 fonctionnalités de ta liste étaient déjà dans la spécification. Je les rappelle avec leur section.
- **B. Nouveau** : 35 fonctionnalités, chacune avec son mode (local gratuit, avec tes clés API ou serveur), sa phase et son outil pour l'assistant.
  - **Design** : création en masse depuis un fichier CSV, extraction du sujet d'une photo, texte d'une image rendu modifiable, découpage en calques, composants réutilisables, formulaires, sites d'une page.
  - **Vidéo** : texte accroché au mouvement, effets de silhouette, isolation de la voix, sous-titres par intervenant, effets de voix.
  - **Réseaux sociaux** : calendrier, publication programmée via les API officielles uniquement, statistiques.
  - **Équipe** : espaces partagés, commentaires, co-édition, kits de marque partagés.
  - **Ressources** : bibliothèques libres et templates proposés par les utilisateurs.
- **C. Règles** : aucune limite artificielle, IA locale d'abord, consentement obligatoire pour les visages et les voix.
- **D. Nouvelle phase 10** : publication et travail en équipe.
- **E. 8 nouveaux critères d'acceptation**.

La collaboration en équipe était exclue de la v1 dans ta spécification d'origine. Cette annexe la lève pour la phase 10 : confirme que c'est bien ce que tu veux.

Je peux maintenant ajouter au prototype les écrans les plus parlants. Je propose : création en masse, calendrier de publication et extraction du sujet.

## User

vas y

## Assistant

_[tool: run_script]_

_[tool: dc_set_props]_

_[tool: ready_for_verification]_

J'ai ajouté les trois écrans au prototype, sans les tester moi-même ; une vérification automatique tourne encore en arrière-plan.

- **Création en masse** (menu de gauche) : tu colles un fichier CSV et tu choisis quelle colonne remplit Nom, Poste, Téléphone et E-mail. Les cartes de visite s'affichent en direct, et les lignes incomplètes sont signalées en orange. « Générer » crée les cartes, puis tu peux les exporter en zip.
- **Planning** (menu de gauche) : un calendrier de la semaine avec des publications publiées, programmées, en échec ou en brouillon.
  - Clique sur une publication pour voir son détail, ses statistiques, la publier, réessayer ou la déprogrammer.
  - Le « + » d'une journée ouvre le formulaire de programmation. Seuls les réseaux connectés sont sélectionnables.
  - Les comptes se connectent ou se déconnectent d'un clic en haut. L'échec Instagram se règle en connectant le compte puis en réessayant.
- **Extraire le sujet** (éditeur design) : sélectionne une photo, puis clique sur le bouton dans la barre au-dessus. Après la progression, la photo devient un fond comblé, avec un calque « Sujet » séparé par-dessus, déplaçable et annulable avec ⌘Z.

Dans le prototype, la publication et l'extraction sont simulées. Il n'y a ni vraie connexion aux réseaux ni vrai modèle de détourage.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai corrigé les deux problèmes signalés par la vérification. Une nouvelle vérification tourne en arrière-plan.

- **Planning** : chaque jour fait au moins 128 px de large et le calendrier défile horizontalement quand l'écran est étroit. Le panneau de détail passe sous le calendrier au lieu de l'écraser. Les heures et les noms de réseau ne débordent plus d'une colonne à l'autre.
- **Création en masse** : les listes déroulantes affichaient « aucune » alors que l'aperçu était rempli. Je les ai remplacées par des boutons qui montrent bien la colonne choisie pour chaque champ.
- **Même changement ailleurs** : le choix du jour dans le formulaire de programmation utilise aussi des boutons.
- **Écran étroit** : sur la page de création en masse, les données et la liaison des champs passent au-dessus de l'aperçu.

## User

que manque til

## Assistant

Voici ce qui manque encore dans le prototype par rapport à ta spécification et à l'annexe.

**Éditeur design**
- Redimensionner et faire pivoter à la souris (poignées), sélection multiple, grouper, aligner et distribuer
- Règles, grille et guides d'espacement (seul le centrage existe)
- Réglages du texte (police, interligne, effets, texte courbé)
- Retouche photo (réglages, filtres), détourage, recadrage
- Graphiques, tableaux, QR codes, cadres, outil plume
- Animations et durée par page
- Panneau Templates et banques de photos libres
- « Décliner » vers un autre format (redimensionnement magique)
- Contenu en double : 3 miniatures dans la bande du bas + 3 dans l'éditeur

**Éditeur vidéo**
- Glisser, rogner et couper les clips à la souris (seule la sélection marche)
- Images clés visibles sur la timeline
- Éditeur de sous-titres phrase par phrase
- Réglages des effets, transitions et couleur dans l'inspecteur
- Enregistrement webcam, micro et écran
- Passerelles design ↔ vidéo : « Capturer cette image », « Ouvrir dans l'éditeur vidéo »

**Assistant**
- Un seul scénario par éditeur, quel que soit le texte envoyé
- Pas encore de scénario B (plan généré à 00:12) ni D (3 miniatures depuis la vidéo)
- Pas de question posée par l'agent pour lever une ambiguïté (`ask_user`)
- Pas de diff avant/après page par page

**IA média (écrans dédiés)**
- Générer une image, retouche par zone, gomme, étendre, améliorer la résolution
- Générer une vidéo, avec la liste de ses tâches
- Voix off, doublage, musique
- Texte d'une image rendu modifiable, découpage en calques

**Comptes et données**
- Inscription et connexion (actuellement : mode invité seulement)
- Médiathèque globale, dossiers, favoris, corbeille
- Historique des versions et restauration
- Paramètres généraux, raccourcis (`?`), pages légales

**Annexe : fonctionnalités pas encore montrées**
- Composants liés, formulaires, pages interactives, sites
- Isolation de la voix, sous-titres par intervenant, texte accroché au mouvement, effets de silhouette
- Espaces d'équipe, commentaires, co-édition, liens de partage

**Adaptation**
- Tablette et téléphone

Les plus visibles à faire ensuite, à mon avis : les poignées de redimensionnement et l'alignement dans le design, puis les clips déplaçables dans la vidéo, puis un écran de génération d'image. Je commence par lesquels ?

## User

implemente tout

## Assistant

Je travaille par lots pour que chaque ajout fonctionne vraiment. Lot 1 : poignées, sélection multiple, alignement et styles de texte en design, clips déplaçables et rognables en vidéo, panneau IA image, capture d'image vers design.

_[tool: run_script]_

_[tool: ready_for_verification]_

Tout ne tient pas en une seule fois, donc je procède par lots. Le lot 1 est dans le prototype ; je ne l'ai pas testé moi-même et une vérification automatique tourne en arrière-plan.

**Éditeur design**
- **Poignées aux 4 coins** pour redimensionner. Maj garde les proportions, et le texte s'agrandit avec son cadre.
- **Sélection multiple** avec Maj+clic : on déplace, supprime ou décale aux flèches tous les éléments ensemble.
- **Alignement** sur la page (un élément) ou sur la sélection (plusieurs), plus répartition horizontale ou verticale à partir de 3 éléments.
- **Texte** : police (Geist, Serif, Mono), alignement, interligne, et effets ombre, contour ou fond.
- **Inspecteur** : ajout de la rotation et de l'opacité.
- **Onglet IA** :
  - Générer une image : description, format, qualité, 2 variantes à insérer. Il faut connecter OpenAI dans Fournisseurs IA, sinon l'onglet propose de le faire.
  - Suppression d'arrière-plan : gratuite et locale.
  - Outils payants sur l'image sélectionnée : gomme, étendre, améliorer ×2, retouche par zone.

**Éditeur vidéo**
- **Clips à la souris** : on les glisse, et on les rogne par les bords. Ils se collent à la tête de lecture et aux clips voisins.
- **Touches** : S scinde le clip sélectionné, Suppr le supprime et M ajoute un marqueur. ⌘Z et ⌘⇧Z annulent et rétablissent.
- **« Capturer en design »** : l'image affichée devient une nouvelle page de miniature dans l'éditeur design.

**Lots suivants prévus**
- **Lot 2** : grouper les éléments, graphiques, tableaux, QR codes, animations de page, « Décliner » vers un autre format.
- **Lot 3** : éditeur de sous-titres, réglages des effets et transitions, enregistrement webcam, micro et écran.
- **Lot 4** : scénarios B et D de l'assistant, questions de l'agent quand la demande est ambiguë.
- **Lot 5** : comptes, médiathèque, versions, corbeille, raccourcis `?`.
- **Lot 6** : écrans de l'annexe (équipe, composants, voix…), puis tablette et téléphone.

Je passe au lot 2 ?

## User

oui

## User

oui

## User

oui

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

Le lot 3 est dans l'éditeur vidéo. Je ne l'ai pas testé moi-même ; une vérification automatique tourne encore en arrière-plan.

**Sous-titres** (onglet de gauche)
- **Génération** : une barre de progression (modèle, puis transcription), puis 9 phrases horodatées apparaissent sur la piste et dans l'aperçu. La transcription est simulée : ces 9 phrases sont fixes et le modèle Whisper n'est pas vraiment chargé.
- **4 styles** : TikTok (le mot en cours s'allume), Karaoké, Encadré, Minimal.
- **Édition** : tu modifies chaque phrase dans la liste et un clic sur l'heure déplace la tête de lecture. Il y a aussi Rechercher / Remplacer avec le nombre de résultats.
- **Import SRT/VTT** : il fonctionne vraiment et lit le fichier choisi.
- **Export SRT/VTT** : il télécharge vraiment le fichier.

**Effets, filtres, transitions**
- Sélectionne un clip, puis clique sur un effet, un filtre ou une transition dans les onglets de gauche.
- L'inspecteur propose alors des curseurs : luminosité, contraste, saturation, température, intensité du filtre et de chaque effet, durée de la transition, et un bouton pour les retirer.
- **Rendu dans l'aperçu** : en direct pour le flou, le glow, la vignette, l'aberration chromatique, les filtres chaud, froid, mat, contraste et N&B, et les réglages de couleur. Aucun effet visible pour le grain, la pixelisation et le tremblement.
- Sur la timeline, les clips concernés sont marqués « ◧ » (transition) ou « · fx » (effet).

**Enregistrement** (onglet Médias)
- Les boutons Webcam, Écran et Micro utilisent vraiment le navigateur : autorisation, aperçu en direct, puis Démarrer / Arrêter et relecture.
- « Ajouter à la timeline » place l'enregistrement à la tête de lecture et l'ajoute à la médiathèque.
- Si l'accès est refusé ou indisponible, un message clair s'affiche. C'est possible dans l'aperçu intégré : ouvre le fichier dans un onglet pour tester.

Prochaine étape, le lot 4 : les scénarios B et D de l'assistant, et des questions de l'agent quand la demande est ambiguë. Je continue ?

## User

oui

## User

Check didn’t complete

## User

Check didn’t complete

## User

continu

## Assistant

_[tool: show_html]_

_[tool: ready_for_verification]_

Le lot 4 est fait : l'assistant ne déroule plus un seul scénario, il en choisit un selon ta demande, et pose une question quand elle est trop vague. La première vérification automatique a échoué à cause d'une erreur de limite de requêtes. Je l'ai relancée et elle tourne encore en arrière-plan.

**Éditeur vidéo (Composer)**
- **Scénario A**, par exemple « TikTok 45 s », « silences », « sous-titres » : le montage vertical de 45 s, comme avant.
- **Scénario B**, par exemple « … à 00:12 » ou « B-roll » :
  1. Il inspecte le passage et cherche d'abord dans tes rushes.
  2. Il rédige le prompt, puis te demande ton accord avec le coût à vérifier.
  3. Il lance la génération, insère le plan à 00:12 et ajoute un fondu enchaîné.
  4. Si tu refuses, il utilise un rush à la place.
- **Scénario D**, par exemple « 3 miniatures » : il crée 3 miniatures (image de la vidéo, sujet détouré, titre, logo). En mode Assist, tu les vois dans la proposition avant de les appliquer. Ensuite, « Ouvrir dans l'éditeur design » t'y emmène.
- **Question de l'agent** : si la demande est trop vague, par exemple « Améliore ma vidéo », il demande « Que veux-tu que je fasse ? » avec 3 choix.

Pour tous les scénarios, « Tout annuler », « Refuser » et « Rétablir » défont ou refont tout. Pour le scénario D, cela retire aussi les miniatures ajoutées au design.

**Éditeur design, scénario C**, par exemple « affiche » ou « lancement » :
1. Il lit le kit de marque et crée une affiche A3 (« SOIRÉE DE LANCEMENT, samedi 26 septembre · 18 h »), avec une photo libre de droits et le logo.
2. Il la décline en post 4:5 et en story 9:16. Les pages apparaissent au fur et à mesure.

Il reste le lot 5 (comptes, médiathèque, versions, corbeille, raccourcis `?`) et le lot 6 (écrans de l'annexe, tablette et téléphone). Je continue avec le lot 5 ?

## User

oui

## Assistant

_[tool: run_script]_

_[tool: dc_set_props]_

_[tool: snip]_

_[tool: ready_for_verification]_

Le lot 5 est dans le prototype ; je ne l'ai pas testé moi-même et une vérification automatique tourne en arrière-plan.

- **Compte**, via « Créer un compte » dans la barre latérale :
  - Connexion ou inscription, avec vérification de l'e-mail et d'un mot de passe de 8 caractères minimum.
  - Boutons « Continuer avec Google », « Mot de passe oublié » et « Continuer sans compte ».
  - Une fois connecté, ton profil remplace l'encart du mode invité, avec la synchronisation activée et un bouton de déconnexion.
- **Médiathèque** (nouveau menu) :
  - Recherche, filtres (vidéos, images, audio, générés IA, enregistrements) et dossiers.
  - Fiche de chaque média : taille, source, licence et attribution, empreinte, documents qui l'utilisent. Pour les médias générés par IA, s'y ajoutent le prompt et le modèle.
  - Un média introuvable s'affiche avec un bouton « Relier le fichier… ».
  - Actions : ajouter à la timeline ou insérer dans le design.
- **Corbeille** : le × sur un document de l'accueil l'envoie à la corbeille. Chaque document y affiche les jours restants, avec Restaurer ou Supprimer définitivement.
- **Versions**, via le bouton dans les en-têtes vidéo et design :
  - Historique avec l'origine de chaque version (utilisateur, assistant, autosave).
  - Une version est créée automatiquement après chaque action de l'assistant.
  - Chaque restauration garde d'abord l'état « Avant restauration ».
- **Raccourcis** : la touche `?` ou le bouton « ? » ouvre la liste des raccourcis actifs.

Les données de la médiathèque (tailles, licences, empreintes) et la connexion sont simulées.

Il reste le lot 6 : les écrans de l'annexe (espaces d'équipe, commentaires, composants liés, isolation de la voix, sous-titres par intervenant…) et l'adaptation tablette et téléphone. Je continue ?

## User

oui

## Assistant

_[tool: run_script]_

_[tool: dc_set_props]_

_[tool: ready_for_verification]_

Le lot 6 est ajouté au prototype. Je ne l'ai pas encore testé moi-même : une vérification automatique tourne en arrière-plan et me signalera les problèmes éventuels.

- **Équipe** (nouveau menu) :
  - Membres : invitation par e-mail, rôles (Éditeur, Commentateur, Lecteur), retrait d'un membre.
  - Kit de marque verrouillable, templates et dossiers partagés.
  - Validations : Approuver ou Demander des modifications.
  - La co-édition en temps réel est affichée comme « Bientôt ».
- **Commentaires** (éditeur design) :
  - Active « Commenter », puis clique sur la page pour poser une épingle.
  - Onglet Commentaires : fils de discussion, réponses, Résoudre ou Rouvrir, bouton « Demander une validation ».
- **Partager** (éditeur design) :
  - Type d'accès, expiration, lien personnalisé, mot de passe.
  - Le lien est vraiment copié dans le presse-papiers, et il est révocable.
- **Composants liés** : « Créer un composant » dans la barre de l'élément sélectionné. Il apparaît dans l'onglet Éléments, et quand tu modifies son texte ou sa couleur, toutes ses copies suivent, sur toutes les pages.
- **Vidéo, audio et suivi** (inspecteur du clip sélectionné) :
  - « Isoler la voix » crée 2 pistes, voix et fond.
  - « Qui parle » attribue les sous-titres à 2 intervenants.
  - « Accrocher au mouvement » ajoute la marque ⌖ au clip.
  - Effets de voix : Robot, Radio, Grave, Aigu.
  - Deux effets de silhouette : contour lumineux et flou d'arrière-plan.
- **Tablette et téléphone** :
  - Sur écran étroit, la barre latérale devient une barre de navigation horizontale.
  - Design sur téléphone : canevas plein écran, gros boutons (+ Texte, + Photo, Fond, Pages), modification du texte et des couleurs, suppression, export.
  - Design sur tablette : panneaux plus étroits.
  - Vidéo sur petit écran : la timeline complète demande 1 180 px, donc la page défile et un bandeau explique la limite. Il n'y a pas encore de timeline simplifiée pour téléphone.

Ces 6 lots couvrent ta liste. Tout reste simulé : aucun vrai compte, aucun appel aux fournisseurs d'IA, aucune publication réelle. Le prototype sert à valider les parcours et l'interface avant de construire l'application.

## User

Found issues — fixing…

## User

Found issues — fixing…

## User

Found issues — fixing…

## Assistant

_[tool: grep]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai corrigé trois des quatre problèmes signalés ; une nouvelle vérification tourne en arrière-plan.

- **En-tête du design sur tablette** : sous 1 180 px, Versions, Commenter, Partager, Décliner, Présenter, la langue et le thème passent dans un menu « ⋯ ». Le bouton Exporter reste visible sans avoir à faire défiler l'en-tête.
- **Barre latérale** : la dernière rangée de boutons passe à la ligne, donc plus de barre de défilement horizontale.
- **Petite hauteur d'écran** : la hauteur minimale de 640 px du design est levée sur tablette, et la bande de pages en bas n'est plus coupée.

L'erreur vide dans la console est toujours là et je n'en ai pas trouvé l'origine. Elle ne bloque pas l'affichage.

## User

ameliore le design systeme car mon saas a lair dune maquette au lieu dune vraie app web

## Assistant

_[tool: run_script]_

_[tool: snip]_

_[tool: ready_for_verification]_

J'ai retravaillé le rendu pour que le prototype ressemble à une vraie application web ; une vérification automatique tourne en arrière-plan.

- **Icônes** : icônes Lucide sur tout le menu latéral, les onglets de gauche des deux éditeurs (icône au-dessus du libellé), les boutons d'en-tête, la lecture/pause, les outils de la timeline et le bouton d'envoi du Composer.
- **Vraies images à la place des zones hachurées** :
  - vignettes des documents récents, de la médiathèque et des cartes d'accueil guidé ;
  - médias et effets dans le panneau de l'éditeur vidéo ;
  - aperçu vidéo, qui change selon le clip et le B-roll ;
  - bandes d'images sur les clips de la timeline ;
  - photos dans le canevas design.
  Ce sont des photos libres aléatoires (Picsum) qui servent de remplaçantes : elles ne correspondent pas à ton contenu.
- **Logos** : le logo TechLab est désormais une vraie tuile « TL » sur fond vert, dans le design comme dans le kit de marque.
- **Finition visuelle** :
  - palette un peu plus profonde, cartes avec ombres et coins plus arrondis ;
  - réaction des boutons au survol et au clic, contour visible au focus clavier ;
  - barres de défilement fines et couleur de sélection du texte.

Pour aller plus loin : envoie-moi tes vraies images (captures du rush, photos produit, logo) et je remplace les photos d'exemple.

## User

ameliore la surface aussi pour ne plus etre une maquette inspire toi des meilleurs

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai retravaillé l'interface dans l'esprit des meilleurs outils créatifs actuels, sans copier aucun produit ; une vérification automatique tourne en arrière-plan.

**Barre latérale**
- En haut, un sélecteur d'espace (logo « M » en relief, « Espace TechLab »), puis une recherche avec l'indication ⌘K.
- Un clic sur le sélecteur d'espace ouvre l'écran Équipe ; la recherche ouvre la Médiathèque, sans taper de requête.
- Le menu garde les icônes et devient plus aéré.

**Accueil**
- **En-tête** : la date du jour, un grand titre d'accueil (« Bonjour, TechLab — on crée quoi aujourd'hui ? »), puis la recherche et le bouton Créer.
- **Champ de demande pour l'assistant** : un grand encadré à bordure lumineuse, avec les boutons « Joindre », le modèle, le mode Assist et un bouton d'envoi rond. Les suggestions en dessous ont maintenant des icônes. « Joindre » est un bouton factice : il affiche seulement le message « non inclus dans ce prototype ».
- **« Commencer un format »** : 6 tuiles (TikTok, YouTube, Miniature, Post 4:5, Story, Affiche A3), chacune avec la forme de son format.
- **Documents récents** : cartes plus arrondies, badge et bouton corbeille semi-transparents.

**Éditeurs**
- Le canevas design et l'aperçu vidéo ont un fond à points discrets.
- Chaque piste de la timeline a son icône, et « Enregistré » est accompagné d'une icône de nuage.

**Partout**
- Les 33 boutons principaux ont un léger relief.
- Les notifications ont un fond flou et une icône de confirmation.

Je peux continuer avec le même traitement sur les écrans secondaires (Planning, Fournisseurs IA, Utilisation IA, Équipe) : en-têtes de page cohérents, icônes et états vides illustrés.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai harmonisé l'interface et ajouté des transitions douces partout ; une vérification automatique tourne en arrière-plan.

**Fluidité**
- Chaque écran et chaque fenêtre (export, versions, partage, raccourcis, enregistrement…) apparaît avec un léger fondu et glissement.
- Les boutons et les champs changent d'état en douceur au survol, au clic et au focus.
- Le fond derrière les fenêtres est flouté.
- Les animations se coupent si ton système demande de réduire les mouvements.

**Cohérence**
- Tous les petits contrôles ont les mêmes coins arrondis (8 px), et toutes les cartes les leurs (12 px).
- Les petits boutons ont une hauteur minimale unique (28 px), au lieu d'un mélange de 26 et 28 px.
- Les titres de page ont une taille unique (26 px, espacement resserré), en accord avec l'accueil.
- Les petits intitulés de section ont le même style partout.

**Corrections de la vérification précédente**
- **Onglets de droite du design** :
  - chaque onglet a son icône, avec une pastille jaune qui compte les commentaires ;
  - sur tablette, seules les icônes restent (le nom complet s'affiche au survol) ;
  - plus de barre de défilement.
- **Autres** : les puces du champ de demande de l'accueil et la ligne d'aide du canevas ne passent plus à la ligne.

L'erreur vide dans la console est toujours là et je n'en ai pas trouvé l'origine. Elle ne bloque pas l'affichage.

## User

Found issues — fixing…

## Assistant

_[tool: run_script]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: dc_js_str_replace]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: dc_html_str_replace]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Found it: `componentDidUpdate` reads `ps.run` when prevState is undefined.

_[tool: grep]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: ready_for_verification]_

J'ai corrigé les deux défauts signalés par la vérification, ainsi que l'erreur de console qui persistait depuis plusieurs tours. La console est maintenant vide au chargement ; je n'ai pas relancé la vérification complète.

- **Fournisseurs IA** : les puces de modèles et de capacités ne passent plus à la ligne.
- **Erreur de console** : elle venait d'une lecture faite avant le premier rendu, au moment où l'état précédent n'existait pas encore. C'est corrigé.
- **Planning** : « Nouvelle publication » utilise la même icône « + » que le bouton Créer.

Il reste une limite connue : sous 1 180 px de large, l'éditeur vidéo défile horizontalement, car la timeline complète a besoin de cette largeur.

## User

le style design  nest pas bon

## User

le style design  nest pas bon

## Assistant

_[tool: ask_user]_

« Pas bon » peut vouloir dire beaucoup de choses. Pour ne pas refaire tout le style au hasard, je t'ai ouvert un court formulaire :

- ce qui te gêne ;
- la direction que tu veux ;
- la couleur d'accent ;
- des apps dont tu aimes le style, ou une capture ;
- par quoi commencer.

J'attends tes réponses pour m'y mettre.

## User

https://shotbase.com/ voici le style que je veux

## User

https://shotbase.com/ voici le style que je veux

## User

https://shotbase.com/ voici le style que je veux je crois que ce type de la marque APPLE

## Assistant

_[tool: grep]_

_[tool: grep]_

_[tool: run_script]_

_[tool: ready_for_verification]_

Font replacement ran before; the quick-tile markup now has the new font string. Retrying with a regex.

_[tool: run_script]_

_[tool: ready_for_verification]_

_[tool: grep]_

Ce signalement porte sur un premier essai qui avait échoué ; le second a bien été enregistré.

_[tool: ready_for_verification]_

L'app a maintenant un style inspiré de Shotbase et d'Apple, sans rien copier ; une nouvelle vérification automatique tourne en arrière-plan. Elle confirmera que le bleu, les pastilles colorées du menu et les cartes teintées s'affichent bien : l'alerte précédente portait sur un premier essai qui avait échoué, et le second est bien enregistré.

- **Couleurs** : gris neutres façon Apple en thème sombre et clair, et accent bleu à la place du vert citron. Les couleurs de marque TechLab à l'intérieur des designs ne changent pas.
- **Police** : la police système d'Apple (SF Pro) sur Mac. Sur Windows, c'est encore Geist qui s'affiche.
- **Menu latéral** : chaque entrée a son icône blanche dans une pastille de couleur arrondie, comme dans les réglages d'Apple.
- **Accueil** :
  - les tuiles de formats deviennent des cartes teintées, avec une icône dans un cercle de couleur, dans l'esprit du menu de Shotbase ;
  - le champ de demande a une bordure dégradée bleue et violette.
- **Formes** : cartes plus arrondies (16 à 18 px) avec des ombres plus douces, contrôles à 10 px, titres plus gras et plus serrés.
- **Détails** : le focus, la sélection de texte et les champs actifs passent au bleu ; l'icône des notifications passe au vert.

Tu avais aussi choisi l'écran de connexion comme écran de départ dans les réglages ; ce choix ne vaut que pour ton affichage.

## User

Applique dans le saas complet

## Assistant

_[tool: grep]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai appliqué le nouveau style à tout le SaaS ; une vérification automatique tourne en arrière-plan.

- **Écrans secondaires** : Équipe, Médiathèque, Corbeille, Création en masse, Planning, Kit de marque, Fournisseurs IA et Utilisation IA commencent par un grand rond coloré avec son icône, dans la même couleur que dans le menu, suivi d'un titre plus grand.
- **Boutons** : les 35 boutons principaux sont bleus et arrondis en pilule. Les 76 boutons secondaires ont un fond gris doux sans contour marqué.
- **En-têtes des deux éditeurs** : fond translucide flouté, et logo « M » en carré bleu arrondi.
- **Onglets de gauche des éditeurs** : chaque outil a sa couleur, en fond teinté léger par défaut et en pastille pleine quand l'onglet est actif.
- **Timeline** : les clips vidéo, audio, texte, B-roll et musique reprennent la palette bleu, vert, ambre, violet et turquoise.

## User

maintenant je veux aussi une fonctionnalite unique et complet de chatbot comme supercomputer de higgfields cest a dire avec discussion en plein ecran ou lutilisateur peut demander de generer nimporte quoi image ou video , UGC etc... tout juste en discutant et lagent genere dans le flux de discusion  bien sur tout peut etre editer dans les editeurs , dis moi si tu comprends et ameliore mon idee

## Assistant

Oui, je comprends : un écran de discussion en plein écran, séparé des éditeurs, où tu demandes ce que tu veux (image, vidéo, pub UGC, affiche, voix off…). L'agent génère le résultat directement dans le fil de la conversation, et chaque résultat s'ouvre dans l'éditeur design ou vidéo pour être retouché. Je l'appellerais **Studio Chat** (nom provisoire), pour ne rien reprendre à Higgsfield.

**Ce que j'ajouterais à ton idée**

1. **Résultats interactifs dans le fil** : chaque génération apparaît comme une carte avec ses actions : Variantes, Retoucher une zone, Agrandir, Animer (image → vidéo), Prolonger, Ouvrir dans l'éditeur, Ajouter à la médiathèque. Tu peux répondre à une carte précise, par exemple « la 2e, mais de nuit ».
2. **Recettes prêtes à l'emploi** : Pub UGC, Photo produit, Miniature YouTube, Affiche, Reel 30 s, Avatar qui parle, Clip musical. Une recette pose 2 ou 3 questions (produit, ton, format), puis enchaîne toutes les étapes seule.
3. **Pub UGC complète en une demande**, par exemple « pub TikTok pour ma crème, ton naturel » :
   - script avec accroche ;
   - 3 plans générés ;
   - voix off et sous-titres ;
   - musique ;
   - montage 9:16 prêt dans l'éditeur vidéo.
4. **Tableau des plans (storyboard)** pour les vidéos : avant de lancer la génération payante, l'agent montre les scènes en cartes modifiables, avec le coût estimé par scène et la possibilité de passer une scène en ressource gratuite (tes rushes ou une photo libre).
5. **Références glissées dans le chat** : ton logo, une photo produit ou un visage (avec accord obligatoire). L'agent les garde comme « éléments » réutilisables pour garder un résultat cohérent d'une génération à l'autre, par exemple le même personnage ou le même produit.
6. **Kit de marque automatique** : couleurs, polices et ton appliqués à tout ce qui est généré.
7. **Suivi des générations et du coût** :
   - une barre latérale liste les générations en cours, prêtes ou échouées ;
   - le coût estimé est affiché avant chaque lancement, et tu approuves d'un clic ;
   - tout reste facturé sur tes propres clés API.
8. **Galerie de la conversation** : un onglet regroupe tous les résultats d'un chat en grille, pour tout exporter ou tout envoyer dans un projet d'un coup.
9. **Mode brouillon gratuit** : des aperçus rapides en basse qualité avant la version finale, pour limiter les coûts.

**Ce que je construirais dans le prototype**

- **Nouvel écran « Studio Chat »** dans le menu latéral, en plein écran : historique des conversations à gauche, fil au centre, et un volet repliable à droite (générations en cours, éléments de référence, coût).
- **Deux scénarios complets qui fonctionnent** :
  - des images produit, avec variantes puis ouverture dans l'éditeur design ;
  - une pub UGC : tableau des plans, puis approbation, puis génération, puis envoi dans l'éditeur vidéo.
- **Même style Apple** que le reste de l'app.

Je lance la construction ? Si tu veux, dis-moi aussi quelles recettes mettre en premier.

## User

louverture dans editeur est facultatif

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: run_script]_

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: ready_for_verification]_

J'ai ajouté **Studio Chat**, accessible depuis le menu, en deuxième position ; une vérification automatique tourne en arrière-plan. Tout se crée et se retouche dans la discussion ; l'éditeur ne sert que si tu veux aller plus loin.

**L'écran**
- **À gauche** : les discussions, un bouton « Nouvelle discussion » et un rappel « Tes clés, tes coûts ». Deux discussions d'exemple sont déjà remplies : des photos produit et une pub UGC.
- **Au centre** : quand la discussion est vide, un accueil propose 6 recettes (Pub UGC, Photo produit, Miniature YouTube, Affiche, Plan vidéo, Avatar qui parle). Une vue Galerie regroupe tous les résultats.
- **Zone de saisie** : type (Auto, Image, Vidéo, Pub UGC), format (1:1, 4:5, 9:16, 16:9), mode Brouillon, ajout de référence, envoi avec Entrée.
- **À droite** : l'onglet Générations montre ce qui est en cours, terminé, annulé ou en attente d'accord. L'onglet Éléments garde tes références (logo, produit, personne avec accord) pour les mentionner avec @.

**Ce que l'agent génère dans le fil**
- **Images** : 4 propositions, avec sur chacune Variantes, Agrandir en 16:9, Animer, Enregistrer, Répondre et Ouvrir dans l'éditeur (facultatif). Un clic sur une image l'ouvre en plein écran.
- **Répondre à une image** : tu cliques sur « Répondre », tu écris par exemple « de nuit », et l'agent en fait 2 variantes.
- **Vidéo** : une carte d'accord (prompt modifiable, durée 5, 8 ou 10 s, modèle, coût à vérifier), puis la génération avec une barre de progression. La vidéo se lit dans le fil, avec Prolonger et Autre variante.
- **Pub UGC** :
  1. un plan d'étapes, puis un storyboard de 4 plans modifiables, chacun réglable en généré (payant) ou gratuit (tes médias) ;
  2. après ton accord : génération, voix off, sous-titres, musique et montage ;
  3. la pub se lit dans le fil avec les sous-titres, et propose Exporter MP4, Autre accroche et Changer la voix.
- **Avatar qui parle** : il faut cocher toi-même une attestation de consentement ; l'agent ne peut pas le faire à ta place.
- **Demande trop vague** : l'agent propose les recettes.

Comme dans le reste du prototype, les générations sont simulées : les images viennent de photos libres aléatoires (Picsum) et les boutons Exporter et Enregistrer affichent seulement une confirmation. Aucun prix n'est inventé : le coût renvoie à la tarification officielle des fournisseurs.

## User

il faut une bonne navigation entre les pages du saas

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai ajouté une navigation complète entre toutes les pages du SaaS ; une vérification automatique tourne en arrière-plan (l'aperçu a mis plus de 10 secondes à charger, elle le confirmera).

- **Palette de navigation (⌘K / Ctrl+K)** : elle s'ouvre avec une recherche en haut et trois groupes :
  - « Aller à » : les 12 pages, y compris les éditeurs et Studio Chat, avec un badge « Ici » sur la page où tu es ;
  - « Documents récents » ;
  - « Actions » : nouvelle discussion, nouveau design, nouvelle vidéo, thème, langue, raccourcis.

  Le filtre ignore les accents ; on navigue avec ↑ ↓, Entrée ouvre, Échap ferme. La recherche du menu latéral ouvre aussi cette palette.
- **Bouton ⌘K à côté du logo « M »** dans les deux éditeurs et dans Studio Chat : on peut changer de page depuis n'importe où, pas seulement revenir à l'accueil.
- **Section « Récents »** dans le menu latéral : le rush vidéo, les miniatures et la dernière discussion Studio Chat, en un clic.
- **Adresse de page** : chaque page a la sienne (`#/chat`, `#/editor`…). Les boutons Précédent et Suivant du navigateur fonctionnent, et un rechargement garde la page courante.

Dans les éditeurs, ⌘K ouvre toujours l'assistant, comme prévu dans ta spécification. La palette s'y ouvre avec ⌘⇧K ou avec le bouton ⌘K à côté du logo.

## User

bon je veux que mette une facturation par credit pour les utilisateurs qui vont utiliser mes propre cle api integrer et un petit abonnement mensuel sil veulent ajouter leur propre cle api IA , et dans le saas on doit pouvoir ajouter tout les api meme higgfields api , et je veux une page marketing inspire de https://shotbase.com/

## User

bon je veux que mette une facturation par credit pour les utilisateurs qui vont utiliser mes propre cle api integrer et un petit abonnement mensuel sil veulent ajouter leur propre cle api IA , et dans le saas on doit pouvoir ajouter tout les api meme higgfields api , et je veux une page marketing inspire de https://shotbase.com/

## Assistant

_[tool: run_script]_

_[tool: update_todos]_

## User

continu

## Assistant

_[tool: snip]_

_[tool: run_script]_

_[tool: dc_write]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

J'ai ajouté la facturation par crédits, l'abonnement pour tes propres clés, le catalogue de fournisseurs et une page marketing inspirée de Shotbase. Une vérification automatique tourne sur la page marketing ; l'app elle-même n'a pas été rouverte ni vérifiée après ces changements.

**Facturation, écran « Crédits » dans le menu**
- **Solde** : ton solde de crédits, ta formule actuelle et le choix de la source de génération (crédits Montaj ou tes propres clés).
- **3 formules** :
  - Gratuit : les éditeurs, l'IA locale et 50 crédits offerts.
  - Crédits : payés à l'usage, à partir de 5 €.
  - Pro Clés : 4,99 € par mois pour brancher tes propres clés.
- **Packs** : 500 crédits pour 5 €, 1 200 pour 10 €, 3 000 pour 22 €, 8 000 pour 50 €. Paiement par Wave, Orange Money, carte ou PayPal.
- **Grille de coûts** : image 2 à 4 crédits, vidéo Seedance 10 crédits par seconde, plan UGC 50 crédits, Higgsfield 12 crédits par seconde, IA locale gratuite. Un historique liste chaque dépense et recharge.
- **Studio Chat** débite réellement le solde à chaque génération, et le coût en crédits s'affiche avant de lancer. Une puce dans la zone de saisie indique la source utilisée. Si le solde est insuffisant, l'app t'envoie vers l'écran Crédits.

Tous ces prix et barèmes sont des propositions de ma part, à remplacer par les tiens.

**Fournisseurs IA**
- Tant que Pro Clés n'est pas actif, une bannière invite à le prendre, et l'ajout de clés reste bloqué.
- Le catalogue compte 13 fournisseurs en plus des 4 déjà présents : Higgsfield, ElevenLabs, Runway, Luma, Kling, Google Gemini, xAI, Replicate, Black Forest Labs, Stability, HeyGen, Mistral, Groq.
- Une option « API personnalisée » accepte n'importe quelle API compatible OpenAI ou REST, avec son nom, son URL et ses capacités.
- La fenêtre d'ajout vérifie la clé, puis affiche le fournisseur comme « Connecté ».

**Page marketing, `Montaj Site.dc.html`**
- **Menu du haut** : une barre sombre arrondie qui reste visible au défilement. Le bouton « Fonctionnalités » ouvre 6 cartes teintées.
- **Haut de page** : un grand titre, puis un aperçu de Studio Chat.
- **Sections** :
  - une bande « Pensé pour » (créateurs, commerçants, agences…) à la place de logos de marques ;
  - une bande sombre avec 5 icônes ;
  - 4 sections de fonctionnalités avec pastille colorée, liste à puces et maquette ;
  - les tarifs, une FAQ dépliable et un appel final.
- Tous les boutons mènent vers l'app, et l'app renvoie au site depuis la palette ⌘K.

Dans ce prototype, l'achat de crédits et l'activation de Pro Clés sont simulés : aucun vrai paiement n'est branché. Brancher Stripe et les paiements Mobile Money reste à faire côté serveur.

## User

il faut animer la page marketing elle doit etre vivante , et je veux un logo icone memorable

## Assistant

_[tool: snip]_

_[tool: run_script]_

_[tool: ready_for_verification]_

La page marketing est maintenant animée et Montaj a un nouveau logo, appliqué au site et à l'app. Une vérification automatique tourne sur le site ; l'app n'a pas été rouverte après le changement de logo.

**Le logo**
- Un carré arrondi en dégradé bleu, indigo et violet, avec trois barres blanches (haute, basse, haute) qui dessinent un « M ».
- Les barres rappellent à la fois une timeline et une onde sonore. Un point jaune lumineux au-dessus de la barre du milieu représente l'étincelle de l'IA et la tête de lecture.
- Il remplace le « M » partout : barre de menu du site, haut de page, appel final et pied de page ; dans l'app, menu latéral, éditeurs et Studio Chat.
- Sur la page marketing, les barres respirent comme un égaliseur et l'étincelle pulse.

**Les animations de la page**
- **Haut de page** :
  - les mots du titre apparaissent un par un avec un léger flou, et « publie-le. » est en dégradé ;
  - trois halos colorés dérivent en arrière-plan et le grand logo flotte.
- **Aperçu de l'app** :
  - il est incliné en 3D et se redresse quand on fait défiler la page ;
  - le champ de saisie tape des demandes en boucle ;
  - les 4 plans UGC apparaissent l'un après l'autre et la génération en cours progresse.
- **Défilement** : chaque section, carte, puce, formule de prix et question de la FAQ apparaît en fondu vers le haut, en décalé.
- **Maquettes des fonctionnalités** :
  - les images de Studio Chat apparaissent tour à tour ;
  - la tête de lecture parcourt la timeline pendant que le sous-titre change ;
  - le cadre de sélection du design pulse et les calques s'allument chacun leur tour ;
  - les tuiles de fournisseurs se soulèvent l'une après l'autre.
- **Autres** :
  - la bande « Pensé pour » défile en continu ;
  - les icônes de la bande sombre et les cartes de prix se soulèvent au survol ;
  - la barre de menu se resserre quand on fait défiler.

Toutes les animations se coupent si ton système demande de réduire les mouvements.

## User

que  manque til au saas

## Assistant

Le prototype montre maintenant tout le parcours. Voici ce qui manque encore, du plus important au moins important.

**1. Ce qui est simulé et doit devenir réel (le gros du travail)**
- **Backend** : comptes, base de données, synchronisation des projets. Aujourd'hui, rien n'est sauvegardé si on recharge la page.
- **Vraies générations IA** : appels à OpenAI, fal.ai, Higgsfield, etc., suivi des tâches longues, et récupération des résultats au lieu des photos d'exemple.
- **Paiements** : Stripe pour les cartes, un prestataire Mobile Money (par exemple CinetPay ou PayDunya pour Wave et Orange Money), des factures, et la gestion de l'abonnement Pro Clés.
- **Coffre de clés** : chiffrement réel côté serveur et test réel des clés.
- **Moteur des éditeurs** : lecture vidéo réelle, rendu, export MP4/PNG/PDF, détourage et sous-titres locaux réels.

**2. Écrans ou parcours absents du prototype**
- Paramètres du compte : profil, mot de passe, suppression du compte, export des données.
- Page Templates dédiée (catalogue, filtres, aperçu).
- Notifications : génération terminée, crédits bas, paiement échoué.
- Mot de passe oublié et vérification de l'e-mail.
- Tableau d'administration : utilisateurs, crédits, remboursements, publication des templates, modération.
- Pages légales : CGU, confidentialité, « tes clés API », remboursements.
- Parrainage ou crédits offerts, si tu veux accélérer l'acquisition.

**3. Studio Chat**
- Voix off, musique et doublage générés directement dans le fil ; les pubs UGC en intègrent déjà, mais pas en création seule.
- Choix du modèle par génération (Seedance, Higgsfield, Kling…) avec comparaison du prix en crédits.
- Partage d'une discussion ou d'un résultat par lien.
- Suggestions de relance après chaque résultat, par exemple « En faire 3 formats ».

**4. Business**
- Définir les vrais prix et les marges : le coût d'un crédit doit couvrir le prix du fournisseur, plus ta marge et les frais de paiement.
- Offre équipe ou agence : plusieurs sièges et crédits partagés.
- Analytics : conversion du gratuit vers le payant, consommation par fonctionnalité.

**5. Finition**
- Onboarding qui mène directement à une première génération.
- Mobile : Studio Chat et la page marketing sur téléphone.
- Le site marketing n'existe qu'en français.
- Vraies images produit et vraies vidéos de démonstration sur le site.

Je peux ajouter dans le prototype les écrans manquants de la partie 2 (Paramètres, Templates, Notifications, Admin, pages légales). La partie 1, elle, se fait dans le vrai code. Je commence par quoi ?

## User

met en place ce que tu peux faire ici

## Assistant

_[tool: run_script]_

_[tool: grep]_

_[tool: read_file]_

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai ajouté dans l'app les écrans et fonctions qui manquaient au prototype ; une vérification automatique tourne en arrière-plan. Tout est accessible depuis le menu et la palette ⌘K.

- **Templates** : 21 modèles en 5 catégories (réseaux sociaux, vidéo, miniatures, impression, présentations), avec recherche. « Utiliser » ouvre le bon éditeur ; l'icône ✦ ouvre Studio Chat avec une demande prête pour le personnaliser avec l'IA.
- **Paramètres** :
  - Profil : nom, e-mail vérifié, langue et thème.
  - Sécurité : changement de mot de passe avec règles, double authentification, appareils connectés que l'on peut déconnecter.
  - Notifications : 5 réglages activables.
  - Parrainage : lien à copier, 100 crédits offerts.
  - Données : export des données, suppression du compte à confirmer en tapant SUPPRIMER.
- **Notifications** : une cloche avec compteur dans le menu latéral. Une notification arrive quand une génération se termine alors que tu as quitté Studio Chat, ou quand ton solde passe sous 100 crédits. Un clic mène à la bonne page.
- **Admin** :
  - Indicateurs : utilisateurs, revenu Pro Clés, crédits en circulation, signalements.
  - Utilisateurs : recherche, +100 crédits, suspendre ou réactiver.
  - Marges : tu saisis le coût réel de chaque fournisseur et la marge se calcule par modèle. Aucun coût n'est rempli à l'avance.
  - Validation des templates proposés, et modération des signalements.
- **Documents légaux** : CGU, confidentialité, « tes clés API », remboursements. Ce sont des résumés à faire valider par un juriste.
- **Studio Chat** :
  - choix du modèle par génération, avec le tarif en crédits : gpt-image-2, FLUX 1.1 Pro ou Imagen 4 pour les images ; Seedance 2.5, Higgsfield, Kling 2.1 ou Runway Gen-4 pour la vidéo ;
  - le coût déduit suit le modèle choisi ;
  - suggestions de relance sous le dernier résultat (« Décliner en story », « Version 15 s »…) ;
  - un bouton Partager copie le lien de la discussion.

Les tarifs en crédits de FLUX, Imagen, Kling et Runway sont des propositions, comme ceux de l'écran Crédits. Les identifiants exacts de ces modèles chez chaque fournisseur restent à vérifier.

Il reste le vrai code : backend, paiements Stripe et Mobile Money, vrais appels IA et moteur d'export. Le site marketing est aussi encore uniquement en français.

## User

je veux une page de suggestions  tout les utilisateurs connecte donc cela doit etre legerement etre mise en avant peuvent laisser des suggestions de fonctionnalites ou bug que tout le monde peut voir et voter ou repondre et les suggestions les plus votes ou commente etc... et cela va permettra a admin dameliorer , dis moi si tu comprends ce que je veux et ce que tu propose

## Assistant

_[tool: snip]_

Oui, je comprends : un espace public de retours, que je propose d'appeler **« Idées & bugs »**. Tout utilisateur connecté peut y poster une suggestion ou signaler un bug, et tout le monde peut les voir, voter et répondre. Les plus demandées remontent, et l'admin s'en sert pour prioriser.

**Ce que je propose**

1. **Mise en avant (légère)**
   - Une entrée « Idées & bugs » dans le menu, avec une pastille « Nouveau » quand il y a du neuf depuis ta dernière visite.
   - Un petit bouton « Suggérer » en bas du menu latéral, et un lien dans la palette ⌘K.

2. **Le tableau**
   - Des onglets : Tout, Idées, Bugs, Planifié, En cours, Livré.
   - Un tri : Les plus votées, Tendance (votes récents), Les plus commentées, Récentes.
   - Une recherche. Pendant que tu écris un nouveau titre, les suggestions proches s'affichent, pour voter au lieu de créer un doublon.
   - Chaque carte montre les votes (▲ cliquable, un vote par personne), le titre, le type (idée ou bug), la catégorie (Studio Chat, éditeur vidéo, design, crédits…), le statut coloré, le nombre de commentaires et l'auteur.

3. **Page d'une suggestion**
   - La description et, pour un bug, les étapes et le navigateur.
   - Un fil de réponses, où l'on peut aussi voter pour les réponses.
   - Les réponses officielles de l'équipe sont mises en évidence avec un badge « Équipe Montaj ».
   - Un bouton « Suivre » pour être notifié des changements de statut (branché sur la cloche existante).

4. **Côté admin** (dans la page elle-même quand tu es admin, et dans un onglet Admin)
   - Changer le statut : À l'étude, Planifié, En cours, Livré, Refusé.
   - Fusionner les doublons : les votes s'additionnent.
   - Épingler une annonce, masquer un contenu abusif.
   - Un classement des priorités qui combine votes, commentaires et récence, pour voir d'un coup d'œil quoi faire ensuite.

5. **Récompense** : quand une suggestion passe à « Livré », son auteur et ceux qui ont voté reçoivent une notification, et l'auteur gagne 50 crédits. Ça encourage à participer.

Je le construis comme ça ? Dis-moi si tu veux retirer la récompense en crédits ou changer le nom de la page.

## User

oui construis

## Assistant

_[tool: run_script]_

_[tool: ready_for_verification]_

J'ai ajouté la page **Idées & bugs** ; une vérification automatique tourne en arrière-plan.

- **Mise en avant** :
  - une entrée dans le menu avec une pastille « Nouveau », qui disparaît dès la première visite ;
  - une carte jaune « Suggérer une idée » dans le menu latéral, qui ouvre directement le formulaire ;
  - la page est aussi dans la palette ⌘K.
- **Tableau** :
  - onglets Tout, Idées, Bugs, Planifié, En cours, Livré, avec leur nombre de suggestions ;
  - tri par votes, tendance, nombre de commentaires ou date, et une recherche ;
  - une annonce de l'équipe reste épinglée en haut, et 8 suggestions d'exemple montrent les différents statuts.
- **Nouvelle suggestion** :
  - choix entre Idée et Bug, titre, description (avec des indications adaptées pour un bug) et catégorie ;
  - pendant que tu écris le titre, les suggestions proches s'affichent, avec un bouton pour voter à la place.
- **Votes et réponses** :
  - un vote par personne, qu'on peut retirer ;
  - fil de réponses, avec un 👍 sur chaque réponse ;
  - les réponses officielles portent le badge « Équipe Montaj » ;
  - un bouton pour suivre une suggestion et un autre pour copier son lien.
- **Vue admin** (interrupteur en haut de la page) :
  - un panneau Priorités calcule un score : votes + 3 × réponses + un bonus de récence ;
  - sur chaque suggestion : changer le statut, épingler, masquer, fusionner avec une autre (les votes et réponses s'additionnent), répondre en tant qu'équipe.
- **Notifications et récompense** : ceux qui suivent une suggestion sont notifiés quand son statut change. Quand une suggestion passe à « Livré », l'app envoie la notification et l'auteur reçoit 50 crédits dans son historique.

Ce que je t'avais proposé et qui n'est pas encore fait :

- la notification « Livré » n'arrive que dans ta propre cloche, pas chez chaque votant ;
- la page ne sait pas si l'utilisateur est vraiment admin : l'interrupteur « Vue admin » est ouvert à tout le monde ;
- la pastille « Nouveau » s'éteint dès la première visite, au lieu de revenir à chaque nouveau contenu.

Il faudra aussi du vrai backend pour que les votes et réponses soient partagés entre tous les utilisateurs.

