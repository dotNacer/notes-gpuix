# notes-gpuix

App de prise de notes façon Antinote : une page blanche, une note par écran, on navigue à
la souris ou au clavier. Fenêtre native macOS via [gpuix-svelte](https://github.com/khromov/gpuix-svelte)
(rendu GPUI, pas de webview/Electron). Les notes sont de simples fichiers markdown sur
disque, lisibles par un serveur MCP fourni à côté — n'importe quelle IA compatible MCP
peut lire/écrire tes notes.

> **Statut : expérimental.** `gpuix-svelte` repose sur l'API de custom renderer de Svelte,
> pas encore publiée officiellement (voir `vendor/gpuix-svelte/README.md`).

## Pourquoi c'est vendoré

`gpuix-svelte` n'a pas de release npm stable (`gpuix-svelte@0.0.1` sur le registre n'est
qu'une réservation de nom). Le package.json amont a `"files": ["src", "bin"]`, donc un
`npm install github:khromov/gpuix-svelte` **exclut** `vendor/svelte-*.tgz` (le build Svelte
avec l'API de renderer custom, indispensable) même si ce fichier est bien tracké dans leur
git. D'où `vendor/gpuix-svelte/` ici : un clone complet, committé, référencé en
`file:vendor/gpuix-svelte` dans `package.json`. Reproductible, pas de dépendance à un accès
réseau GitHub à chaque install.

Pour mettre à jour vers une version plus récente du renderer :
```bash
rm -rf vendor/gpuix-svelte
git clone --depth 1 https://github.com/khromov/gpuix-svelte vendor/gpuix-svelte
rm -rf vendor/gpuix-svelte/.git
npm install
```

## Installer (sur macOS)

Besoin de **Node >= 24** (le renderer custom de Svelte l'exige).

```bash
npm install
npm start              # ouvre la fenêtre — édite src/App.svelte et sauvegarde pour hot-reload
npm run typecheck       # tsc --noEmit
npm test                # tests headless — macOS/Windows uniquement, pas Linux
```

## Utiliser l'app

- **Écrire** : la fenêtre s'ouvre sur une page blanche, tape directement.
- **Nouvelle note** : `Cmd+N`.
- **Note suivante / précédente** : `Cmd+Flèche droite` / `Cmd+Flèche gauche`. (Les flèches
  seules déplacent le curseur dans le texte — normal, on édite une zone de texte.)
- **Supprimer la note courante** : `Cmd+Retour arrière` (désactivé s'il ne reste qu'une note).
- Chaque note est sauvegardée automatiquement 300ms après la dernière frappe (debounce), et
  immédiatement en changeant de note.
- Les petits points en bas indiquent la position dans la liste des notes.

## Où sont mes notes

`~/Notes/*.md` par défaut (un fichier par note, nommé par horodatage de création pour
garder l'ordre). Change l'emplacement avec la variable d'env `NOTES_DIR` :

```bash
NOTES_DIR=~/Documents/MesNotes npm start
```

Le titre affiché nulle part dans l'app pour l'instant vient de la première ligne du
fichier markdown (utile pour le serveur MCP et si tu ouvres un fichier dans un éditeur).

## Serveur MCP (accès IA)

`mcp/server.ts` expose 6 tools sur les **mêmes fichiers** que l'app (`lib/notes.ts` est la
couche partagée — le disque est la seule source de vérité, pas de sync à gérer) :

| Tool | Fait |
| --- | --- |
| `list_notes` | Liste id / titre / date de modif de toutes les notes |
| `read_note` | Contenu complet d'une note par id |
| `create_note` | Crée une note avec un contenu initial |
| `update_note` | Remplace le contenu d'une note existante |
| `delete_note` | Supprime une note |
| `search_notes` | Recherche une sous-chaîne dans titre/contenu |

Lancer le serveur :
```bash
npm run mcp
```

Le brancher dans un client MCP (ex. config Claude Desktop / Hermes), en JSON typique :
```json
{
  "mcpServers": {
    "notes-gpuix": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/chemin/absolu/vers/notes-gpuix",
      "env": { "NOTES_DIR": "/Users/toi/Notes" }
    }
  }
}
```

`NOTES_DIR` doit pointer vers le **même dossier** que celui utilisé par `npm start`, sinon
l'IA et l'app liront des notes différentes.

## Structure

```
app.ts              entrée: ouvre la fenêtre, hot-reload sur save
src/App.svelte       le composant unique: textarea plein écran + indicateur de position
lib/notes.ts          lecture/écriture des fichiers markdown (utilisé par l'app ET le MCP)
lib/state.svelte.ts   état runes qui survit au hot-reload: note courante, brouillon, debounce
mcp/server.ts         serveur MCP (stdio) exposant les 6 tools ci-dessus
test.ts               test headless (mount_headless, presse cmd-n / cmd-flèches, vérifie le texte)
vendor/gpuix-svelte/   clone vendoré du renderer (voir ci-dessus)
```

## Limites connues

- Pas de scrollbar native dans GPUI — pas un souci ici (une note = un écran), mais si le
  texte dépasse la hauteur de fenêtre, il n'y a pas encore de `Scroller` branché.
- La recherche MCP (`search_notes`) est une sous-chaîne naïve, pas une recherche sémantique.
- Un seul niveau de dossier (`NOTES_DIR/*.md`), pas de sous-dossiers/tags pour l'instant.
