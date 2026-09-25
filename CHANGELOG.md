# Changelog

Convention de version : `Excalidraw-<version upstream>+Custom-<version fork>`
— la partie `Excalidraw-X.Y.Z` suit la version d'[excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
sur laquelle ce fork est basé (`packages/excalidraw/package.json`), et
`Custom-X.Y.Z` suit nos propres changements par-dessus. `Custom` repart à
`1.0.0` à chaque fois que la base Excalidraw est resynchronisée.

## Excalidraw-0.18.0+Custom-1.7.0 — 2026-09-25

- Refonte de la collaboration en direct :
  - Le bouton "Partage" s'appelle désormais "Collaboration".
  - Le popup "Collaboration en direct" propose deux actions claires :
    **Démarrer une session** (avec un nom de session + votre nom) et
    **Se connecter à une session en cours** (en collant le lien reçu).
  - Les rooms doivent maintenant être explicitement créées côté serveur
    (`excalidraw-room`, événement `create-room` avec nom + créateur,
    stocké en mémoire uniquement — jamais la clé de chiffrement E2E).
    Si quelqu'un ouvre un lien vers une room qui n'a jamais été créée ou
    qui a été fermée (via "Fermer pour tout le monde"), il voit
    désormais un popup **"Session partagée fermée"** au lieu d'entrer
    dans une room vide (`excalidraw-room/src/index.ts`,
    `excalidraw-app/collab/{Portal,Collab}.tsx`,
    `excalidraw-app/collab/RoomClosedDialog.tsx`).
    ⚠️ Effet de bord accepté : si le serveur `excalidraw-room` redémarre
    (ex. mise en veille du plan gratuit Render), ce registre en mémoire
    est perdu et les liens de sessions ouvertes avant le redémarrage
    affichent ce popup même si personne ne les a explicitement fermées
    — il suffit de démarrer une nouvelle session et repartager le lien.
  - Le nom de la session et son créateur sont affichés en haut du popup
    une fois la session active.
  - La liste "sessions actives" (mes sessions / toutes les sessions du
    serveur / sessions enregistrées Firestore) — qui expose les rooms
    d'éventuels autres utilisateurs — est désormais masquée par défaut
    et ne s'affiche qu'en appuyant sur **MAJ+9** trois fois de suite
    pendant que le popup est ouvert ; elle se remasque à chaque
    fermeture/réouverture du popup (`excalidraw-app/share/ShareDialog.tsx`).

## Excalidraw-0.18.0+Custom-1.6.0 — 2026-09-25

- Après avoir dessiné un rectangle, losange ou ellipse, le focus
  passe automatiquement en mode édition de texte à l'intérieur de la
  forme (centré horizontalement et verticalement) — même mécanisme
  que les stickynotes, désormais étendu aux formes génériques.
  Auparavant, taper au clavier juste après avoir créé une forme
  déclenchait les raccourcis clavier des menus au lieu d'écrire du
  texte. Ignoré si l'outil est verrouillé (dessin en rafale) — même
  garde-fou que pour les stickynotes
  (`packages/excalidraw/components/App.tsx`).
  ⚠️ Changement de comportement volontaire par rapport à l'upstream :
  fait échouer ~41 tests de la suite historique d'Excalidraw qui
  supposaient qu'une forme reste "juste sélectionnée" après création.
  Ces tests ne font pas partie du pipeline de déploiement et n'ont
  pas été mis à jour un par un (ils testent l'ancien comportement,
  intentionnellement remplacé).

## Excalidraw-0.18.0+Custom-1.5.0 — 2026-09-24

- "Ouvrir un fichier" (`Ctrl/Cmd+O` et menu) importe désormais le
  contenu du fichier dans la scène partagée au lieu de la remplacer,
  lorsqu'une session de collaboration est active — sinon ça écrasait
  le dessin de tous les participants. Comportement inchangé hors
  collaboration. La confirmation "ceci va écraser votre dessin" ne
  s'affiche plus dans ce cas puisqu'elle ne s'applique plus
  (`packages/excalidraw/actions/actionExport.tsx`,
  `packages/excalidraw/components/main-menu/DefaultItems.tsx`).

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
