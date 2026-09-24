# Addendum SPEC — Parité fonctionnelle complète (vidéo + design)

Objectif : couvrir l'intégralité des capacités des suites premium du marché, **gratuitement**, en local d'abord, et en BYOK pour l'IA externe. Tous les noms ci-dessous sont **originaux** (aucun nom de fonctionnalité d'un produit tiers dans le code ou l'UI).

Légende : **L** = local et gratuit · **B** = BYOK (clé de l'utilisateur) · **S** = serveur requis · Phase = section 17 de la SPEC.

---

## A. Déjà couvert par la SPEC (rappel, à conserver)

| Capacité | Nom Montaj | Mode | Phase | Section |
|---|---|---|---|---|
| Timeline multipiste, split, trim, vitesse, reverse, freeze, crop, keyframes | Timeline | L | 3 | 6.2–6.4 |
| Export 4K / 60 fps, sans watermark | Export vidéo | L | 3 | 6.9 |
| Transitions, effets, filtres, LUT | Modules de rendu | L | 3 | 6.7 |
| Recadrage automatique sur le sujet | Recadrage intelligent (`reframe`) | L | 3/7 | 6.8, 9.4 |
| Suivi de sujet | `track_subject` | L | 7 | 9.4 |
| Sous-titres automatiques au mot | Sous-titres locaux (Whisper) | L / B | 3 | 6.5 |
| Texte → vidéo, image → vidéo, références → vidéo | Générer une vidéo | B | 6 | 8.3 |
| Voix IA, clonage, lip sync, avatars parlants | Voix off, Doublage, Avatars | L / B | 9 | 10 |
| Musique et effets sonores IA | Générer musique / SFX | B | 9 | 10 |
| Réduction de bruit, amélioration de la voix | RNNoise, Améliorer la voix | L | 3 | 6.6 |
| Synchronisation des coupes sur le rythme | `sync_cuts_to_beats` | L | 3/7 | 6.6, 9.4 |
| Meilleurs moments d'une vidéo longue | `find_highlights`, Auto Edit | L / B | 7 | 8.3 |
| Redimensionnement magique (déterministe + IA) | Décliner | L / B | 2/7 | 5.10 |
| Traduction d'un design | Traduire le design | B | 7 | 8.2 |
| Rédaction (écrire, réécrire, résumer, allonger) | `write_copy` | B | 7 | 8.2 |
| Retouche par zone sur prompt | Retouche par zone | B | 6 | 8.1 |
| Gomme d'objet | Gomme intelligente | B (L prévu) | 6 | 8.1 |
| Agrandissement hors cadre | Étendre l'image | B | 6 | 8.1 |
| Détourage photo et vidéo | Détourage local | L | 2/3 | 5.5, 6.7 |
| Upscale image / vidéo | Améliorer la résolution | B | 6 | 8.1 |
| Génération d'images, d'éléments, de stickers | Générer image / graphique | B | 6 | 8.1 |
| Génération d'un design complet | Texte → design | B | 7 | 8.2 |
| Graphiques intelligents | `add_chart` + suggestion IA | L / B | 2/7 | 5.2 |
| Animations automatiques | Animations + « Animer la page » | L | 2 | 5.11 |
| Mockups | Mise en situation | B | 6 | 8.1 |
| Kit de marque (plusieurs, sans limite), IA respectant le kit | Kit de marque | L / S | 2/4 | 5.7 |
| Templates de marque, templates personnels | Templates | L / S | 2 | 5.8 |
| Assistant conversationnel agentique | Composer | B | 7 | 9 |
| Hors ligne | PWA | L | 8 | 2 |
| Dossiers illimités, synchronisation multi-appareils | Dossiers, Sync | S | 4 | 4.1, 11 |
| Export PNG transparent, SVG, PDF impression | Export design | L | 2 | 5.14 |
| Banques de médias libres | Photos libres (proxy) | S | 2 | 5.9 |

---

## B. Nouvelles capacités à ajouter

### B1. Design et image

| # | Capacité | Nom Montaj | Mode | Phase | Détail | Outil agent |
|---|---|---|---|---|---|---|
| 1 | Génération en masse depuis des données | **Publipostage visuel** | L | 2 | Import CSV/XLSX, liaison colonnes → éléments remplaçables (texte, image par URL/média, couleur), aperçu ligne par ligne, génération de N pages ou N documents, export zip. | `bulk_generate(template, rows, mapping)` |
| 2 | Changement de format avec adaptation du contenu | **Convertir en…** | B | 7 | Design → autre type (post → document, présentation → article, affiche → e-mail) : restructure et réécrit le contenu, pas seulement la taille. | `convert_document(kind)` |
| 3 | Séparer un sujet de sa photo | **Extraire le sujet** | L (+B fond) | 6 | Segmentation locale → sujet devient un calque déplaçable ; trou comblé par inpainting (BYOK, ou flou/étirement local gratuit). | `extract_subject(element)` |
| 4 | Texte d'une image rendu modifiable | **Texte éditable depuis l'image** | L | 6 | OCR local (Tesseract/Transformers.js), estimation police/taille/couleur, effacement du texte d'origine, création d'éléments texte. | `extract_text(element)` |
| 5 | Image plate → calques éditables | **Décomposer en calques** | L + B | 9 | Segmentation multi-objets + OCR + inpainting du fond → groupe de calques. Marqué Expérimental. | `decompose_image(element)` |
| 6 | Transformer le style d'un texte ou d'une forme | **Styliser par description** | B | 6 | « texte en chrome », « forme en bois » : génération d'un remplissage/texture appliqué au texte (reste éditable) ou à la forme. | `stylize_element(element, prompt)` |
| 7 | Générer / remplacer l'arrière-plan | **Nouveau décor** | B | 6 | Après détourage : génération d'un fond cohérent (éclairage, ombre portée ajoutée localement). | `generate_background(element, prompt)` |
| 8 | Éléments générés : formes, 3D, icônes | **Générer un élément** | B | 6 | Étend `generate_graphic` : sortie SVG vectorisée quand possible (vectorisation locale), PNG transparent sinon. | `generate_graphic` (étendu) |
| 9 | Retouche portrait | **Retouche du visage** | L | 6 | Lissage de peau, blanchiment des dents, yeux, via MediaPipe Face Mesh + masques ; intensité réglable, non destructif. | `retouch_face(element, params)` |
| 10 | Animer une photo | **Photo animée** | L / B | 6 | Local : parallaxe 2.5D (carte de profondeur locale), zoom Ken Burns. BYOK : image → vidéo. | `animate_photo(element, mode)` |
| 11 | Composants réutilisables | **Composants liés** | L / S | 4 | Un élément/groupe publié comme composant ; ses instances dans tous les documents se mettent à jour ; surcharges locales (texte, image). | `create_component`, `insert_component` |
| 12 | Pages interactives générées | **Page interactive** | B | 9 | Génère une mini-page HTML autonome (quiz, calculateur, carte) rendue dans un iframe sandbox, exportable. Aucun script dans le document principal. | `generate_interactive(prompt)` |
| 13 | Formulaires | **Formulaire** | L / S | 8 | Élément formulaire (champs, validation) ; réponses stockées côté serveur du compte, export CSV ; génération par IA. | `add_form`, `generate_form(prompt)` |
| 14 | Documents longs | **Document** | L | 2 | Pages A4 à flux de texte continu (titres, listes, tableaux, sommaire), export PDF/DOCX. | `add_page(kind:"doc")` |
| 15 | Sites d'une page | **Site** | L / S | 8 | Design → page web responsive publiée sur un sous-domaine gratuit ou exportée en HTML. | `publish_site` |

### B2. Vidéo et audio

| # | Capacité | Nom Montaj | Mode | Phase | Détail | Outil agent |
|---|---|---|---|---|---|---|
| 16 | Suivi de caméra / d'objet pour accrocher un élément | **Accrocher au mouvement** | L | 3 | Tracking de points (optical flow en WebGPU/worker) → keyframes de position/échelle/rotation appliquées à un texte, sticker ou flou. | `attach_to_motion(element, clip, region)` |
| 17 | Effets corporels | **Effets de silhouette** | L | 3 | Segmentation de personne + pose (MediaPipe) : contour lumineux, clones, traînée, flou d'arrière-plan, ombre. Modules déclaratifs. | `apply_effect(type:"body.*")` |
| 18 | Isolation de la voix | **Isoler la voix** | L / B | 3 | Séparation voix / musique / bruit (modèle local léger, repli BYOK). Deux pistes en sortie. | `isolate_voice(clip)` |
| 19 | Sous-titres par intervenant | **Qui parle** | L | 3 | Diarisation locale (embeddings de voix) → couleur/position de sous-titre par personne, renommage des intervenants. | `diarize(clip)` |
| 20 | Changeur de voix | **Effets de voix** | L | 3 | Hauteur, formants, robot, écho, radio, via AudioWorklet ; presets. | `apply_voice_effect(clip, preset)` |
| 21 | Suppression d'arrière-plan vidéo | (déjà 6.7) | L | 3 | — | `remove_background(clip)` |
| 22 | Génération de scènes | **Scène générée** | B | 6 | Idem 8.3, plus fonds animés en boucle pour overlay. | `generate_video` |
| 23 | Templates vidéo remplaçables | **Modèles vidéo** | L | 3 | Séquences avec zones remplaçables (clip, texte, musique) et durée adaptative. | `fill_template` |

### B3. Publication et réseaux sociaux

| # | Capacité | Nom Montaj | Mode | Phase | Détail | Outil agent |
|---|---|---|---|---|---|---|
| 24 | Calendrier éditorial | **Planning** | S | 10 | Vue calendrier (jour/semaine/mois) des contenus prévus, glisser-déposer, statuts brouillon / prévu / publié / échec. | `schedule_post` |
| 25 | Publication programmée | **Publier** | S | 10 | Connexions OAuth officielles (Instagram, Facebook, TikTok, YouTube, LinkedIn, X, Pinterest), jetons chiffrés comme les clés IA (7.3), file de publication avec reprises. Uniquement via API officielles. | `publish_now`, `schedule_post` |
| 26 | Statistiques | **Résultats** | S | 10 | Impressions, clics, likes, commentaires récupérés via les API officielles, par contenu et par réseau. | `get_post_stats` |
| 27 | Liens de partage courts | **Liens** | S | 4 | Liens de lecture seule / modèle à copier, expiration, mot de passe, slug personnalisé, sans limite de nombre. | `create_share_link` |

### B4. Collaboration (lève la restriction v1)

| # | Capacité | Nom Montaj | Mode | Phase | Détail |
|---|---|---|---|---|---|
| 28 | Espaces d'équipe | **Espaces** | S | 10 | Membres, rôles (propriétaire, éditeur, commentateur, lecteur), dossiers partagés, kits de marque et templates partagés. |
| 29 | Relecture | **Relecture** | S | 10 | Commentaires ancrés sur un élément ou un timecode, mentions, résolution, demande d'approbation. |
| 30 | Édition simultanée | **Co-édition** | S | 10 | CRDT (Yjs) sur le document ; le Command Bus reste la seule voie d'écriture ; présence et curseurs. |
| 31 | Bibliothèques de marque d'équipe | **Marque partagée** | S | 10 | Kits verrouillables (couleurs/polices imposées), vérification de conformité par `check_design`. |

### B5. Ressources

| # | Capacité | Nom Montaj | Mode | Phase | Détail |
|---|---|---|---|---|---|
| 32 | Grande bibliothèque d'éléments | **Bibliothèque ouverte** | S | 8 | Agrégation de sources libres (CC0 / licences commerciales compatibles) : icônes, illustrations, formes, textures, sons, musiques ; licence stockée par asset. Contribution communautaire modérée. |
| 33 | Grande bibliothèque de templates | **Templates communauté** | S | 8 | Publication de templates par les utilisateurs (licence choisie), modération, notation, recherche. |
| 34 | Polices premium | **Polices libres** | L | 2 | Catalogue complet des polices sous OFL + import personnel. |
| 35 | Mises à jour de contenu régulières | **Packs saisonniers** | S | 8 | Packs d'effets, transitions, templates publiés sans déploiement (catalogue serveur). |

---

## C. Règles spécifiques à ces ajouts

- **Aucune limite artificielle** : pas de quota de kits de marque, de liens, de dossiers, de stockage local, de générations (seul le budget BYOK de l'utilisateur s'applique).
- **Réseaux sociaux** : API officielles uniquement ; jamais de scraping ni d'automatisation d'interface. Jetons OAuth chiffrés (même coffre que 7.3), révocables. Si une API refuse la publication automatique d'un format, proposer « Préparer et ouvrir l'application ».
- **Collaboration** : le document reste local-first ; la co-édition synchronise les commandes, pas des captures d'état. Les médias partagés sont téléversés uniquement quand l'utilisateur partage.
- **Outils locaux d'abord** : OCR, segmentation, diarisation, isolation de voix, tracking, retouche visage, parallaxe tournent dans le navigateur, avec badge « Gratuit · local ». Modèles téléchargés à la demande.
- **Consentement** : retouche du visage, avatars et clonage de voix suivent les règles de 10 (attestation, jamais cochée par l'agent).
- **Toute nouvelle capacité** = commande du Command Bus + outil agent + module déclaratif si c'est un effet (3.8).

## D. Nouvelle phase

**Phase 10 — Publication et équipes** : Planning, Publier, Résultats, Espaces, Relecture, Co-édition, Marque partagée.
✔ Un post est programmé puis publié via une API officielle sur un compte de test ; deux utilisateurs éditent le même document sans conflit ; un commentaire ancré est résolu ; isolation des espaces testée.

## E. Critères d'acceptation ajoutés (suite de la section 16)

26. Générer 20 cartes de visite depuis un CSV.
27. Extraire le sujet d'une photo et le déplacer, fond comblé.
28. Rendre modifiable le texte d'une image.
29. Accrocher un texte au mouvement d'un objet dans une vidéo.
30. Isoler la voix d'un clip et afficher des sous-titres par intervenant.
31. Mettre à jour un composant lié et le voir changer dans deux documents.
32. Programmer une publication et consulter ses statistiques.
33. Commenter un élément, puis faire approuver un design par un autre membre.
