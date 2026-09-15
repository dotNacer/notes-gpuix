/**
 * Mots-cles de mode : si la toute premiere ligne d'une note est exactement un
 * des mots-cles (`list`, `math`, `sum`, `avg`, `count`, `code`), ou `list:
 * Titre`, la note bascule dans un mode dedie. Le mot-cle (1ere ligne) ne doit
 * jamais etre copie/duplique dans le rendu du contenu.
 * Voir antinote.io/user-manual/keywords.
 */

export type NoteKeyword = 'list' | 'math' | 'sum' | 'avg' | 'count' | 'code';

const KEYWORDS: readonly NoteKeyword[] = ['list', 'math', 'sum', 'avg', 'count', 'code'];

export interface KeywordMode {
  keyword: NoteKeyword;
  /** Titre optionnel pour `list: Titre`. Absent sinon. */
  title: string | undefined;
}

/** Detecte le mode de la note d'apres sa 1ere ligne, ou null si aucun mot-cle ne matche. */
export function detectKeyword(content: string): KeywordMode | null {
  const firstLine = content.split('\n', 1)[0]?.trim() ?? '';
  if (!firstLine) return null;

  const exact = firstLine.toLowerCase();
  if ((KEYWORDS as readonly string[]).includes(exact)) {
    return { keyword: exact as NoteKeyword, title: undefined };
  }

  // "list: Titre" (seul le mot-cle "list" prend un titre).
  const withTitle = /^list:\s*(.*)$/i.exec(firstLine);
  if (withTitle) {
    const title = withTitle[1]?.trim();
    return { keyword: 'list', title: title || undefined };
  }

  return null;
}

/** Le contenu de la note sans sa 1ere ligne mot-cle (pour l'affichage/la copie). */
export function stripKeywordLine(content: string): string {
  if (!detectKeyword(content)) return content;
  const idx = content.indexOf('\n');
  return idx === -1 ? '' : content.slice(idx + 1);
}

/** Les lignes de corps de la note (sans le mot-cle s'il y en a un). */
export function bodyLines(content: string): string[] {
  const body = stripKeywordLine(content);
  return body.length === 0 ? [] : body.split('\n');
}
