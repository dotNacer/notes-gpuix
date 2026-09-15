/**
 * Collage en texte brut : le textarea natif GPUI n'a de toute facon pas de
 * formatage riche (pas de bold/italic) donc rien a stripper de ce cote la; ce
 * qui survit d'un copier-coller depuis un autre editeur, c'est la mise en
 * forme "texte" -- puces, numerotation, indentation -- que la source a
 * serialisee en plein texte. `stripPastedText` la neutralise, sauf en mode
 * `code` ou le texte est garde tel quel (pas de formatage riche a stripper de
 * toute facon, et on veut preserver l'indentation du code).
 *
 * NOTE (voir README "Limites connues") : gpuix-svelte n'expose aucun evenement
 * `paste` (voir vendor/gpuix-svelte/src/events.ts) et Cmd+V, comme Cmd+Fleche,
 * est tres probablement intercepte par NSTextView avant d'atteindre
 * `on_window_key` -- non verifiable sans environnement macOS. Cette fonction
 * est prete a etre branchee des qu'un hook de paste (ou une lecture manuelle
 * du presse-papier avant insertion) sera disponible cote renderer.
 */

const BULLET_LINE_RE = /^[-*+•◦▪]\s+/;
const ORDERED_LINE_RE = /^\d+[.)]\s+/;

/** Strip les puces/numerotation et l'indentation en tete de ligne, garde le texte. */
export function stripPastedText(text: string, mode: string | null = null): string {
  if (mode === 'code') return text;

  return text
    .split('\n')
    .map((line) => {
      const trimmedStart = line.replace(/^[\t ]+/, '');
      return trimmedStart.replace(BULLET_LINE_RE, '').replace(ORDERED_LINE_RE, '');
    })
    .join('\n');
}
