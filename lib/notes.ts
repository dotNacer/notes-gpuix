/**
 * Une note = un fichier markdown plat sous NOTES_DIR (defaut: ~/Notes).
 * Le nom de fichier encode l'ordre de navigation (prefixe d'horodatage) pour
 * que l'app et le serveur MCP voient toujours le meme ordre sans base a part.
 * Cette couche est partagee par l'app (render) et le serveur MCP: le disque
 * est la seule source de verite, pas de sync a maintenir entre les deux.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

export const NOTES_DIR = process.env.NOTES_DIR || join(homedir(), 'Notes');

export interface NoteMeta {
  id: string;
  path: string;
  title: string;
  updatedAt: number;
}

function ensureDir(): void {
  if (!existsSync(NOTES_DIR)) mkdirSync(NOTES_DIR, { recursive: true });
}

function titleFromContent(content: string): string {
  const firstLine = content.split('\n', 1)[0]?.trim() ?? '';
  return firstLine.replace(/^#+\s*/, '') || 'Sans titre';
}

function idFromFilename(filename: string): string {
  return basename(filename, '.md');
}

/** Toutes les notes, triees par nom de fichier (donc par horodatage de creation). */
export function listNotes(): NoteMeta[] {
  ensureDir();
  const files = readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md'));
  files.sort();
  return files.map((f) => {
    const path = join(NOTES_DIR, f);
    const content = readFileSync(path, 'utf8');
    const stat = statSync(path);
    return {
      id: idFromFilename(f),
      path,
      title: titleFromContent(content),
      updatedAt: stat.mtimeMs
    };
  });
}

export function readNote(id: string): string {
  const path = join(NOTES_DIR, `${id}.md`);
  if (!existsSync(path)) throw new Error(`Note introuvable: ${id}`);
  return readFileSync(path, 'utf8');
}

export function writeNote(id: string, content: string): void {
  ensureDir();
  writeFileSync(join(NOTES_DIR, `${id}.md`), content, 'utf8');
}

/** Nouvel id: horodatage triable lexicographiquement, unique a la milliseconde pres. */
export function newNoteId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function createNote(initialContent = ''): NoteMeta {
  ensureDir();
  const id = newNoteId();
  writeNote(id, initialContent);
  return { id, path: join(NOTES_DIR, `${id}.md`), title: titleFromContent(initialContent), updatedAt: Date.now() };
}

export function deleteNote(id: string): void {
  const path = join(NOTES_DIR, `${id}.md`);
  if (existsSync(path)) unlinkSync(path);
}

/** Recherche plein-texte naive: sous-chaine insensible a la casse dans le contenu ou le titre. */
export function searchNotes(query: string): NoteMeta[] {
  const q = query.toLowerCase();
  return listNotes().filter((n) => {
    const content = readFileSync(n.path, 'utf8').toLowerCase();
    return n.title.toLowerCase().includes(q) || content.includes(q);
  });
}
