/**
 * Etat pur (aucune dependance GPUI/Svelte) pour transformer un flux d'evenements
 * de scroll trackpad en changements de note discrets ("next"/"prev").
 *
 * Un swipe a deux doigts sur trackpad envoie une RAFALE de petits deltaX, pas un
 * seul evenement. On cumule les deltaX jusqu'a un seuil, on declenche next()/prev()
 * une fois ce seuil franchi, puis on ignore tout nouveau delta pendant un cooldown
 * pour ne pas defiler plusieurs notes sur un seul geste continu. Le scroll vertical
 * (deltaY dominant) est ignore completement: c'est du scroll normal dans le textarea.
 *
 * Sens choisi (identique a Antinote / au trackpad "scroll naturel" macOS): un swipe
 * vers la GAUCHE (deltaX negatif, le contenu suit les doigts vers la gauche comme si
 * on tirait la note suivante depuis la droite) va a la note SUIVANTE; vers la DROITE
 * (deltaX positif) revient a la note PRECEDENTE.
 *
 * Un simple cooldown temporel ne suffit pas: un swipe tres energique/inertiel peut
 * continuer d'envoyer des deltaX significatifs bien au-dela de cooldownMs, sans
 * jamais laisser passer de vraie pause entre deux evenements. Pour garantir qu'un
 * seul changement de note est declenche par geste physique continu, on ajoute un
 * verrou (`locked`) qui n'est leve QUE quand un vrai silence (>= gestureGapMs) entre
 * deux evenements horizontaux est observe -- signe que les doigts ont ete leves /
 * l'inertie s'est arretee. Le cooldown temporel reste une securite supplementaire
 * (utile si gestureGapMs est mal calibre) mais n'est plus la seule protection.
 */

export interface SwipeNavOptions {
  /** deltaX cumule minimum (en pixels) avant de declencher un changement de note. */
  threshold: number;
  /** Duree (ms) pendant laquelle les deltas suivants sont ignores apres un changement de note. */
  cooldownMs: number;
  /**
   * Ecart (ms) sans evenement horizontal significatif signifiant la fin du geste
   * physique. En dessous, deux evenements sont consideres comme faisant partie du
   * meme geste continu -- le verrou anti-multi-skip reste actif meme au-dela de
   * cooldownMs tant qu'aucune vraie pause n'a ete observee.
   */
  gestureGapMs: number;
}

export const DEFAULT_SWIPE_NAV_OPTIONS: SwipeNavOptions = {
  threshold: 60,
  cooldownMs: 300,
  gestureGapMs: 120
};

export type SwipeAction = 'next' | 'prev' | null;

export class SwipeNavState {
  private accumulatedX = 0;
  private cooldownUntil = 0;
  private locked = false;
  private lastHorizontalEventMs: number | null = null;
  private readonly options: SwipeNavOptions;

  constructor(options: Partial<SwipeNavOptions> = {}) {
    this.options = { ...DEFAULT_SWIPE_NAV_OPTIONS, ...options };
  }

  /**
   * Traite un evenement de scroll (deltaX, deltaY, horodatage en ms). Retourne
   * 'next' / 'prev' si ce delta declenche un changement de note, sinon null.
   */
  handleScroll(deltaX: number, deltaY: number, nowMs: number): SwipeAction {
    // Scroll vertical dominant (ou nul dans les deux axes): pas de notre ressort,
    // on laisse le textarea gerer et on ne pollue pas l'accumulation horizontale.
    if (Math.abs(deltaY) >= Math.abs(deltaX)) return null;

    // Une vraie pause entre deux deltaX horizontaux signale la fin du geste
    // physique: on leve le verrou et on repart d'un accumulateur propre, meme si
    // le cooldown temporel n'est pas encore ecoule.
    if (
      this.lastHorizontalEventMs !== null &&
      nowMs - this.lastHorizontalEventMs >= this.options.gestureGapMs
    ) {
      this.locked = false;
      this.accumulatedX = 0;
    }
    this.lastHorizontalEventMs = nowMs;

    // Verrou du geste en cours (deja declenche, pas de vraie pause depuis) OU
    // cooldown temporel: dans les deux cas, on ignore ce delta.
    if (this.locked || nowMs < this.cooldownUntil) return null;

    this.accumulatedX += deltaX;

    if (this.accumulatedX <= -this.options.threshold) {
      this.accumulatedX = 0;
      this.locked = true;
      this.cooldownUntil = nowMs + this.options.cooldownMs;
      return 'next';
    }
    if (this.accumulatedX >= this.options.threshold) {
      this.accumulatedX = 0;
      this.locked = true;
      this.cooldownUntil = nowMs + this.options.cooldownMs;
      return 'prev';
    }
    return null;
  }

  /** Remet l'accumulateur a zero (ex: le geste s'est arrete, touchPhase 'ended'). */
  reset(): void {
    this.accumulatedX = 0;
  }
}
