/**
 * Checklists automatiques : une ligne qui commence par `- `, `* `, `+ ` ou un
 * marqueur ordonne (`1.`, `2.`, ...) est traitee comme un item de liste, avec
 * ou sans case `[ ]`/`[x]` deja presente. Le fichier disque reste du Markdown
 * standard : on ne fait que lire/ecrire `- [ ] texte` / `- [x] texte`.
 */

export type ChecklistKind = 'bullet' | 'ordered';

export interface ChecklistLine {
  kind: ChecklistKind;
  /** Le marqueur d'origine tel quel (`-`, `*`, `+`, ou `3.`). */
  marker: string;
  /** true/false si une case `[ ]`/`[x]` est presente, undefined sinon (pas encore une checkbox). */
  checked: boolean | undefined;
  /** Le texte de l'item, sans marqueur ni case a cocher. */
  text: string;
  /** Indentation (espaces) avant le marqueur, preservee pour les sous-listes. */
  indent: string;
}

const BULLET_RE = /^(\s*)([-*+])\s+(?:\[( |x|X)\]\s+)?(.*)$/;
const ORDERED_RE = /^(\s*)(\d+[.)])\s+(?:\[( |x|X)\]\s+)?(.*)$/;

/** Parse une ligne en item de checklist, ou null si ce n'est pas une ligne de liste. */
export function parseChecklistLine(line: string): ChecklistLine | null {
  const bulletMatch = BULLET_RE.exec(line);
  if (bulletMatch) {
    const [, indent, marker, box, text] = bulletMatch;
    return { kind: 'bullet', marker, indent, checked: box === undefined ? undefined : box.toLowerCase() === 'x', text };
  }
  const orderedMatch = ORDERED_RE.exec(line);
  if (orderedMatch) {
    const [, indent, marker, box, text] = orderedMatch;
    return { kind: 'ordered', marker, indent, checked: box === undefined ? undefined : box.toLowerCase() === 'x', text };
  }
  return null;
}

export function isChecklistLine(line: string): boolean {
  return parseChecklistLine(line) !== null;
}

/**
 * Comme `parseChecklistLine`, mais pour le mode `list` explicite : une ligne
 * de corps sans marqueur ("milk") est traitee comme un item de checklist
 * implicite (marqueur `-` synthetique), pas seulement les lignes deja
 * marquees `-`/`*`/`1.`. Une ligne vide/blanche reste ignoree (pas un item).
 */
export function parseChecklistLineOrPlain(line: string): ChecklistLine | null {
  const parsed = parseChecklistLine(line);
  if (parsed) return parsed;
  if (line.trim().length === 0) return null;
  return { kind: 'bullet', marker: '-', indent: '', checked: undefined, text: line };
}

/** Reconstruit la ligne Markdown a partir d'un ChecklistLine. */
export function formatChecklistLine(item: ChecklistLine): string {
  const box = item.checked === undefined ? '' : `[${item.checked ? 'x' : ' '}] `;
  return `${item.indent}${item.marker} ${box}${item.text}`;
}

/**
 * Bascule l'etat coche/non-coche d'une ligne. Si la ligne n'avait pas encore
 * de case (simple `- texte`), en ajoute une decochee puis la coche.
 */
export function toggleChecklistLine(line: string): string {
  const item = parseChecklistLine(line);
  if (!item) return line;
  const nextChecked = item.checked === undefined ? true : !item.checked;
  return formatChecklistLine({ ...item, checked: nextChecked });
}

/** Bascule la ligne d'index `lineIndex` dans un contenu multi-lignes. */
export function toggleChecklistLineAt(content: string, lineIndex: number): string {
  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  lines[lineIndex] = toggleChecklistLine(lines[lineIndex]!);
  return lines.join('\n');
}

/**
 * Comme `toggleChecklistLineAt`, mais pour le mode `list` explicite : bascule
 * aussi une ligne de corps sans marqueur ("milk" -> "- [x] milk"), en plus des
 * lignes deja marquees.
 */
export function toggleChecklistLineAtOrPlain(content: string, lineIndex: number): string {
  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  const item = parseChecklistLineOrPlain(lines[lineIndex]!);
  if (!item) return content;
  const nextChecked = item.checked === undefined ? true : !item.checked;
  lines[lineIndex] = formatChecklistLine({ ...item, checked: nextChecked });
  return lines.join('\n');
}
