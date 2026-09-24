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
| Général | Français / anglais, thème auto / sombre / clair, raccourcis (`?`), palette de recherche (⌘K), vue téléphone pour le design |

## Bientôt (nécessite un serveur ou un modèle local non embarqué)

| Fonctionnalité | Ce qui manque |
|---|---|
| Comptes, synchronisation, équipes, commentaires partagés, liens de partage | Backend (Supabase prévu) |
| Clés BYOK (OpenAI, fal.ai, ElevenLabs…) : génération d'images, de vidéos, de voix | Passerelle serveur avec coffre de clés chiffré |
| Publication automatique et statistiques sociales | OAuth et API officielles des réseaux, côté serveur |
| Transcription automatique (Whisper local), détourage local, isolation de voix | Modèles Transformers.js / MediaPipe à charger ; la page claude.ai bloque les téléchargements de modèles |
| Enregistrement webcam / écran / micro | Fonctionne hors de claude.ai ; bloqué dans claude.ai par la politique du cadre |
| Export CMJN, GIF, import PDF | Non implémentés |
