# Changelog

## v1.0.0 — 2026-09-24

Première version suivie de ce fork self-hosted d'Excalidraw, regroupant
tous les changements apportés jusqu'ici par rapport à l'upstream
[excalidraw/excalidraw](https://github.com/excalidraw/excalidraw).

- Portage en self-hosting sur GitHub Pages (`base` path, déploiement
  automatisé via `.github/workflows/deploy-pages.yml`)
- Collaboration temps réel pointée vers notre propre instance
  [`excalidraw-room`](https://github.com/willoudev/excalidraw-room)
  hébergée sur Render, plutôt que le serveur officiel d'Excalidraw
- Fallback de sauvegarde manuelle quand l'API File System Access est
  bloquée au runtime (ex. politique d'entreprise) malgré sa détection
- Retrait de la promotion Excalidraw+, du bouton d'aide flottant, de
  l'icône de chiffrement de bout en bout, et des entrées Excalidraw+ /
  GitHub / Suivez-nous / Discord / Sign up du menu et de l'écran d'accueil
- Rebranding : titre de page, wordmark de l'écran d'accueil et URL passés
  de "Excalidraw" à "Whiteboard" (repo renommé `willoudev/whiteboard`)
- Ajout d'un écran de code d'accès avant le chargement du whiteboard
  (même mécanisme que [`macroplanning`](https://github.com/willoudev/macroplanning) :
  hash PBKDF2-SHA256 côté client, session chiffrée AES-GCM)
- Suivi de version : ce changelog, plus le numéro de version affiché sur
  l'écran de code d'accès et en bas du menu hamburger

Site en ligne : https://willoudev.github.io/whiteboard/
