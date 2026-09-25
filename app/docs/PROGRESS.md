# État d'avancement

Légende : **Fonctionnel** · **Bientôt** (visible et marqué comme tel dans l'interface, ou absent).

## Fonctionnel

| Domaine | Détail |
|---|---|
| Accueil | Formats (réseaux, vidéo, impression, bureau), recherche, récents avec vignettes, corbeille, prompt qui crée le document au bon format et lance l'assistant |
| Parcours guidé | 3 étapes, préférences mémorisées |
| Éditeur design | Pages multiples, texte (10 polices OFL), formes, cadres photo, graphiques, tableaux, QR codes réels ; sélection multiple, lasso, déplacement avec magnétisme (centre, bords), poignées de redimensionnement, rotation, édition du texte en place, alignement, répartition, groupes, verrouillage, calques, composants liés, copier/coller, glisser-déposer et collage d'images, annuler/rétablir |
| Design — sortie | Export PNG (fond transparent), JPG, PDF multipage, zip, vidéo animée (animations d'entrée) ; Décliner vers d'autres formats ; mode Présentation plein écran ; aperçu des animations |
| Éditeur vidéo | Import MP4/MOV/WebM/images/audio, 5 pistes, déplacement entre pistes, rognage, scinder, marqueurs, magnétisme, zoom ; lecture synchronisée ; titres animés ; couleur, filtres, flou, glow, vignette, transitions d'entrée/sortie ; vitesse, volume, fondus audio ; formats 16:9, 9:16, 1:1, 4:5 |
| Sous-titres | Import SRT/VTT, création depuis un script, édition, rechercher/remplacer, 4 styles, position, export SRT/VTT |
| Vidéo — sortie | Export MP4 ou WebM (selon le navigateur) avec l'audio, 3 qualités ; capture d'une image vers un nouveau design |
| Assistant (Composer) | Claude via le compte claude.ai de la personne ; 13 outils design, 14 outils vidéo ; modes Ask / Assist / Agent ; plan exécuté affiché ; Appliquer / Refuser ; Stop ; Tout annuler / Rétablir ; version automatique après chaque action |
| IA design | Rédaction de texte au ton de la marque, traduction d'une page en 7 langues |
| Médiathèque | Stockage local IndexedDB, déduplication SHA-256, métadonnées réelles, aperçu, « utilisé dans », suppression |
| Modèles | 7 modèles originaux, adaptation par l'assistant |
| Création en masse | CSV → cartes de visite, liaison des colonnes, valeurs manquantes signalées, document généré, zip PNG 300 dpi |
| Planning | Semaine navigable, publications (brouillon / prévu / publié), légende, lien vers le contenu |
| Kit de marque | Nom, logo, palette, polices, ton ; utilisé par les éditeurs et l'assistant |
| Versions | Manuelles, autosave toutes les 5 min, après l'assistant, restauration avec sauvegarde de l'état courant |
| Données | Sauvegarde complète en zip et restauration, stockage persistant, effacement |
| Barre latérale | Toutes les entrées du prototype : Notifications, Accueil, Studio Chat, Éditeur vidéo, Éditeur design (ouvre le dernier document ou en crée un), Crédits, Templates, Idées & bugs, Médiathèque, Planning, Création en masse, Équipe, Kit de marque, Fournisseurs IA, Utilisation IA, Corbeille, Paramètres, Admin ; récents, « Suggérer une idée », stockage, compte |
| Studio Chat | Conversation plein écran avec Claude, fils enregistrés, recettes, galerie, tâches, éléments à mentionner ; Claude crée de vrais designs (formats, modèles, éléments) et projets vidéo (titres, sous-titres) qui s'ouvrent dans les éditeurs |
| Notifications | Exports, assistant, Studio Chat, corbeille (suppression à venir / effectuée), versions, suggestions suivies ; préférences par type |
| Utilisation IA | Journal de chaque requête Claude (source, modèle, outils, durée, statut), 7 derniers jours, limite quotidienne appliquée, règle d'approbation |
| Idées & bugs | Idées et bugs, votes, tris, onglets, recherche, suggestions similaires, réponses, suivi, vue admin (statut, épingler, masquer, fusionner, priorités) ; « Envoyer à l'équipe » ouvre le vrai commentaire claude.ai sur la page |
| Compte | Identité du compte claude.ai (nom, avatar) ; mode local hors de claude.ai |
| Admin | Indicateurs, contenu, stockage, modération, modèles (visible pour le propriétaire) |
| Documents légaux | Conditions, confidentialité, IA et données, licences |
| Templates | 22 modèles dont 4 vidéo (Reel produit, tuto, intro YouTube, extrait de podcast) |
| Général | Français / anglais, thème auto / sombre / clair, raccourcis (`?`), palette de recherche (⌘K), vue téléphone pour le design |
| Éditeur design (pro) | Zoom (⌘+/⌘−/⌘0, Ctrl+molette), magnétisme sur les autres éléments, clic droit, 8 formes vectorielles, dégradés (formes et fond de page), ombre portée, cadres photo en forme (cercle, cœur, étoile…), recadrage zoom/position, réglages d'image et préréglages, texte néon, espacement des lettres, italique, retourner, copier/coller le style (⌘⌥C/⌘⌥V), pipette |
| Éditeur vidéo (pro) | Images clés (position, échelle, rotation, opacité), incrustation fond vert, masques, modes de fusion, arrière-plan flou, image figée, formes d'onde, vignettes sur les clips, clic droit, supprimer et refermer, dupliquer, combler les vides, magnétisme activable, lecture en boucle, image PNG, J/K/L |
| IA et agents | L'assistant voit la page ou l'image vidéo (image jointe à chaque demande, activable), photos jointes (importées dans la médiathèque et utilisables), vérification visuelle après modification, 3 suggestions de suite après chaque réponse ; critique du design notée avec correction en un clic, 3 variantes de texte, palette depuis une photo, légende réseaux avec hashtags, kit de publication vidéo (titre, description, hashtags, chapitres → marqueurs) ; Studio Chat : photos jointes et « Vérifier le rendu » |
| Studio Chat : pièces jointes | 📎, glisser-déposer, coller une image ; 10 fichiers par message ; images (PNG, JPG, WEBP, GIF, SVG), vidéos (MP4, MOV, WEBM, 100 Mo), PDF, Word, Excel, CSV, texte, Markdown, JSON, code, ZIP (20 Mo) ; aperçu, taille, progression, ✕ ; erreurs explicites. Sur le serveur Cloudflare : envoi dans R2, extraction côté serveur, PDF lus nativement par Claude (scans compris), transcription Whisper. Dans claude.ai : extraction dans le navigateur, PDF scannés lus en image. Vidéos : images clés toutes les 2 s (12 maximum) et transcription quand le serveur est là. Les pièces jointes restent disponibles pendant la conversation (#numéro, onglet Fichiers) |
| Studio Chat : liens | URL détectées dans le message, carte d'aperçu (titre, favicon, image), « Analyse du lien… » ; sur le serveur : rendu headless, capture, textes, structure, couleurs, polices, images, jusqu'à 5 pages internes sur demande ; protections SSRF, robots.txt, délais et tailles maximum ; en cas d'échec, l'IA le dit et propose de coller le texte ou d'envoyer une capture |

## Bientôt (nécessite un serveur ou un modèle local non embarqué)

| Fonctionnalité | Ce qui manque |
|---|---|
| Comptes Montaj, synchronisation, espaces d'équipe partagés, tableau d'idées commun à tous les utilisateurs, liens de partage | Backend (Supabase prévu) et hébergement hors claude.ai (la base partagée claude.ai empêcherait le partage public) |
| Crédits payants et formule Pro Clés | Prestataire de paiement et passerelle serveur ; les formules sont affichées comme « Bientôt », aucun paiement simulé |
| Clés BYOK (OpenAI, fal.ai, ElevenLabs…) : génération d'images, de vidéos, de voix | Passerelle serveur avec coffre de clés chiffré |
| Publication automatique et statistiques sociales | OAuth et API officielles des réseaux, côté serveur |
| Transcription automatique dans claude.ai (elle fonctionne sur le serveur Cloudflare), détourage local, isolation de voix | Modèles Transformers.js / MediaPipe à charger ; la page claude.ai bloque les téléchargements de modèles |
| Enregistrement webcam / écran / micro | Fonctionne hors de claude.ai ; bloqué dans claude.ai par la politique du cadre |
| Export CMJN, GIF, import PDF | Non implémentés |
