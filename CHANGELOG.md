# Changelog

Convention de version : `Excalidraw-<version upstream>+Custom-<version fork>`
— la partie `Excalidraw-X.Y.Z` suit la version d'[excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
sur laquelle ce fork est basé (`packages/excalidraw/package.json`), et
`Custom-X.Y.Z` suit nos propres changements par-dessus. `Custom` repart à
`1.0.0` à chaque fois que la base Excalidraw est resynchronisée.

## Excalidraw-0.18.0+Custom-1.4.0 — 2026-09-24

- Dans "Collaboration en direct", remplacement du bouton unique
  "Arrêter la session" par deux actions distinctes :
  - **Sortir** : quitte la session localement, la room reste active
    pour les autres participants (et on peut la rejoindre plus tard
    via le même lien)
  - **Fermer pour tout le monde** : met fin à la session pour tous
    les participants connectés, via un nouvel événement
    `close-room`/`room-closed` sur `excalidraw-room` (broadcast à
    tous les sockets de la room, y compris l'émetteur, pour une
    déconnexion uniforme)

## Excalidraw-0.18.0+Custom-1.3.1 — 2026-09-24

- Correction : "Arrêter la session" (collaboration) ramenait à
  `willoudev.github.io` (racine) au lieu de
  `willoudev.github.io/whiteboard/`, car le code d'origine réécrivait
  l'URL avec `window.location.origin` seul, sans le `base` path du
  site. Utilise maintenant `import.meta.env.BASE_URL`
  (`excalidraw-app/collab/Collab.tsx`).

## Excalidraw-0.18.0+Custom-1.3.0 — 2026-09-24

- Ajout d'une section "Toutes les sessions enregistrées (Firestore)"
  dans le popup Partager, listant tous les rooms ayant des données
  persistées (ID + version de scène uniquement — le contenu reste
  chiffré et illisible sans la clé, absente de Firestore). Si les
  règles de sécurité Firestore bloquent le listing de la collection
  (get par ID connu autorisé, mais pas list), un message explicite
  s'affiche plutôt que de planter (`excalidraw-app/data/firebase.ts`,
  `listStoredRooms`).

## Excalidraw-0.18.0+Custom-1.2.0 — 2026-09-24

- Retrait du "Lien partageable" (export readonly vers le backend
  officiel d'Excalidraw) dans la boîte de dialogue de collaboration ;
  remplacé par une liste des sessions actives :
  - "Mes sessions actives" : sessions démarrées/rejointes depuis ce
    navigateur (historique local) et encore actives, cliquables pour
    les rejoindre directement
  - "Toutes les sessions actives sur le serveur" : IDs de room +
    nombre de participants, informatif (aucune clé de chiffrement
    n'est jamais exposée par le serveur)
  - Nouvel endpoint `GET /rooms` sur `excalidraw-room` listant les
    rooms Socket.IO actives

## Excalidraw-0.18.0+Custom-1.1.1 — 2026-09-24

- Correction : "Ouvrir un fichier" (`fileOpen`) échouait sur certains
  navigateurs (ex. Edge sur macOS) avec `Failed to execute
  'showOpenFilePicker' ... not allowed by the user agent or the
  platform`, quand l'API File System Access est détectée comme
  supportée mais bloquée au runtime. Même correctif que pour la
  sauvegarde : bascule automatique vers un `<input type="file">`
  classique dans ce cas (`packages/excalidraw/data/filesystem.ts`).

## Excalidraw-0.18.0+Custom-1.1.0 — 2026-09-24

- Retrait des balises Open Graph / Twitter Card / meta description
  (`excalidraw-app/index.html`) : les liens partagés n'affichent plus
  de prévisualisation enrichie "Excalidraw — Collaborative
  whiteboarding made easy" pointant vers excalidraw.com

## Excalidraw-0.18.0+Custom-1.0.0 — 2026-09-24

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
