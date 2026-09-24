# Décisions

- **Vite + React + TypeScript, une seule page.** La cible de mise en ligne est un Artifact claude.ai, qui ne sert
  qu'un fichier HTML avec scripts intégrés. Next.js (prévu par la spec) viendra avec le backend.
- **IA via le compte Claude de la personne (`sample`).** Pas de passerelle serveur ni de clé à stocker pour
  l'instant ; la personne paie son propre usage, conforme à l'esprit BYOK. Les autres fournisseurs attendent la passerelle.
- **Un moteur de commandes par éditeur.** L'interface, les raccourcis et les outils de l'agent passent par
  `apply` (une étape d'annulation) ; les gestes continus (glisser, redimensionner) sont groupés en une seule étape.
- **Rendu double pour le design.** DOM (unités de conteneur) pour l'édition, canvas 2D pour l'export ; mêmes règles de mise en page.
- **Vidéo en temps réel avec MediaRecorder.** Pas de WebCodecs/FFmpeg pour la v1 : plus simple et disponible
  partout ; l'export dure autant que la vidéo.
- **IndexedDB avec repli mémoire.** Si le stockage est bloqué, l'app fonctionne pour la session et le signale.
