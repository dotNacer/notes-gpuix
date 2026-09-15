/**
 * Calcul pur (aucune dependance GPUI/Svelte) des valeurs `motion` pour l'effet
 * "page qui tourne" au changement de note.
 *
 * `vendor/gpuix-svelte` n'a pas de moteur CSS: `motion={{ initial, animate,
 * transition }}` est la seule facon d'animer, et les proprietes animables sont
 * limitees a `left`, `top`, `width`, `height`, `opacity`, `borderRadius`.
 *
 * IMPORTANT: contrairement a `width`/`height`, `left` est lu cote GPUI comme un
 * `f64` brut (voir vendor/gpuix-svelte/src/style.ts, `NUMBER_ONLY`) -- une chaine
 * `"100%"` y est rejetee. Le deplacement doit donc etre exprime en PIXELS, a
 * partir de la largeur reelle du conteneur (fenetre), pas en pourcentage.
 *
 * Deux calques pendant la transition:
 * - "outgoing": instantane en lecture seule de l'ancienne note, qui glisse hors
 *   ecran et disparait (fade). Purement visuel, jamais la source de verite.
 * - "incoming": le vrai <textarea> (toujours lie a state.draft), qui rejoue une
 *   entree depuis le cote oppose. Il reste editable immediatement: l'animation
 *   ne bloque jamais la frappe, elle est purement cosmetique en arriere-plan.
 *
 * Sens (coherence spatiale avec la navigation): avant (next) = la sortante part
 * vers la GAUCHE, l'entrante arrive de la DROITE. Arriere (prev) = l'inverse.
 */

export type PageTurnDirection = 'next' | 'prev';

export interface PageTurnMotionValues {
  left: number;
  opacity: number;
}

export interface PageTurnMotion {
  initial: PageTurnMotionValues | false;
  animate: PageTurnMotionValues;
  transition: { duration: number; ease: 'easeOut' };
}

/** Duree en SECONDES (l'API `motion` de gpuix-svelte attend des secondes, pas des ms). */
export const PAGE_TURN_DURATION_S = 0.22;

/** `easeOut`: demarre vite, se pose en douceur -- jamais `easeIn` sur une animation UI declenchee par l'utilisateur. */
export const PAGE_TURN_EASE = 'easeOut' as const;

/** Marge (ms) ajoutee a la duree de transition avant de demonter le calque sortant. */
export const PAGE_TURN_CLEANUP_BUFFER_MS = 40;

function transition() {
  return { duration: PAGE_TURN_DURATION_S, ease: PAGE_TURN_EASE };
}

/**
 * Calque de la note SORTANTE: part de sa position normale (left: 0, opacity: 1)
 * et glisse hors ecran (gauche si on avance, droite si on recule) en s'estompant.
 */
export function outgoingMotion(direction: PageTurnDirection, containerWidth: number): PageTurnMotion {
  const exitLeft = direction === 'next' ? -containerWidth : containerWidth;
  return {
    initial: { left: 0, opacity: 1 },
    animate: { left: exitLeft, opacity: 0 },
    transition: transition()
  };
}

/**
 * Calque de la note ENTRANTE (le vrai textarea): demarre hors ecran du cote
 * oppose a la sortie (droite si on avance, gauche si on recule) et glisse
 * jusqu'a sa position normale en apparaissant.
 */
export function incomingMotion(direction: PageTurnDirection, containerWidth: number): PageTurnMotion {
  const enterLeft = direction === 'next' ? containerWidth : -containerWidth;
  return {
    initial: { left: enterLeft, opacity: 0 },
    animate: { left: 0, opacity: 1 },
    transition: transition()
  };
}
