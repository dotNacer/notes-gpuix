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
 */

export interface SwipeNavOptions {
  /** deltaX cumule minimum (en pixels) avant de declencher un changement de note. */
  threshold: number;
  /** Duree (ms) pendant laquelle les deltas suivants sont ignores apres un changement de note. */
  cooldownMs: number;
}

export const DEFAULT_SWIPE_NAV_OPTIONS: SwipeNavOptions = {
  threshold: 60,
  cooldownMs: 300
};

export type SwipeAction = 'next' | 'prev' | null;

export class SwipeNavState {
  private accumulatedX = 0;
  private cooldownUntil = 0;
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

    // Cooldown apres un changement de note: on ignore le reste du geste continu,
    // mais on ne remet pas l'accumulateur a zero avant la fin du cooldown pour
    // eviter qu'un petit reste de geste ne re-declenche immediatement au reveil.
    if (nowMs < this.cooldownUntil) return null;

    this.accumulatedX += deltaX;

    if (this.accumulatedX <= -this.options.threshold) {
      this.accumulatedX = 0;
      this.cooldownUntil = nowMs + this.options.cooldownMs;
      return 'next';
    }
    if (this.accumulatedX >= this.options.threshold) {
      this.accumulatedX = 0;
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
