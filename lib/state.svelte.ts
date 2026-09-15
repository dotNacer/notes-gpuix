/**
 * State qui survit au hot-reload (voir gpuix-svelte: render_hot remonte le
 * composant a chaque save, un module .svelte.ts n'est charge qu'une fois par
 * process). C'est ici que vit "quelle note est affichee" et son contenu en
 * cours d'edition, pour ne pas perdre la position en editant App.svelte.
 */

import { listNotes, readNote, writeNote, createNote, deleteNote, type NoteMeta } from './notes.ts';

interface NotesState {
  notes: NoteMeta[];
  index: number;
  draft: string;
}

const persisted: NotesState = ((globalThis as Record<symbol, NotesState | undefined>)[Symbol.for('notes.app.state')] ??= {
  notes: [],
  index: 0,
  draft: ''
});

export const state = $state(persisted);

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function currentId(): string | undefined {
  return state.notes[state.index]?.id;
}

/** Charge la liste depuis le disque. A appeler au demarrage et apres creation/suppression. */
export function refresh(): void {
  const notes = listNotes();
  state.notes = notes;
  if (state.index >= notes.length) state.index = Math.max(0, notes.length - 1);
  loadDraft();
}

function loadDraft(): void {
  const id = currentId();
  state.draft = id ? readNote(id) : '';
}

/** Debounce l'ecriture disque: pas un fsync a chaque frappe. */
export function edit(content: string): void {
  state.draft = content;
  const id = currentId();
  if (!id) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeNote(id, content), 300);
}

/** Ecrit immediatement (avant de changer de note ou de fermer), sans attendre le debounce. */
export function flush(): void {
  clearTimeout(saveTimer);
  const id = currentId();
  if (id) writeNote(id, state.draft);
}

export function goTo(index: number): void {
  if (index < 0 || index >= state.notes.length) return;
  flush();
  state.index = index;
  loadDraft();
}

export function next(): void {
  goTo(state.index + 1);
}

export function prev(): void {
  goTo(state.index - 1);
}

export function addNote(): void {
  flush();
  createNote('');
  refresh();
  state.index = state.notes.length - 1;
  loadDraft();
}

export function removeCurrent(): void {
  const id = currentId();
  if (!id) return;
  deleteNote(id);
  refresh();
}
