import { describe, expect, it } from 'vitest';
import { SwipeNavState, DEFAULT_SWIPE_NAV_OPTIONS } from './swipeNav.ts';

/** Simule une rafale trackpad: une liste de {dx, dy, t} appliques dans l'ordre. */
function run(state: SwipeNavState, events: Array<{ dx: number; dy: number; t: number }>) {
  return events.map((e) => state.handleScroll(e.dx, e.dy, e.t));
}

describe('SwipeNavState', () => {
  it('ignore un petit mouvement horizontal isole (sous le seuil)', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: -5, dy: 0, t: 0 },
      { dx: -3, dy: 0, t: 10 },
      { dx: -2, dy: 0, t: 20 }
    ]);
    expect(results).toEqual([null, null, null]);
  });

  it('declenche next() une fois le seuil cumule franchi vers la gauche', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: -20, dy: 0, t: 0 },
      { dx: -20, dy: 0, t: 10 },
      { dx: -25, dy: 0, t: 20 } // cumul -65, franchit -60
    ]);
    expect(results).toEqual([null, null, 'next']);
  });

  it('declenche prev() une fois le seuil cumule franchi vers la droite', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: 30, dy: 0, t: 0 },
      { dx: 40, dy: 0, t: 10 } // cumul 70, franchit 60
    ]);
    expect(results).toEqual([null, 'prev']);
  });

  it('un seul geste continu ne declenche next() qu une fois (cooldown)', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: -70, dy: 0, t: 0 }, // franchit direct -> next
      { dx: -70, dy: 0, t: 10 }, // dans le cooldown -> ignore
      { dx: -70, dy: 0, t: 50 }, // toujours dans le cooldown -> ignore
      { dx: -70, dy: 0, t: 299 } // encore dans le cooldown (300ms) -> ignore
    ]);
    expect(results).toEqual(['next', null, null, null]);
  });

  it('le cooldown expire laisse repartir un nouveau geste', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const first = state.handleScroll(-70, 0, 0);
    expect(first).toBe('next');
    // Toujours en cooldown a 299ms.
    expect(state.handleScroll(-70, 0, 200)).toBeNull();
    // Cooldown termine (>= 300ms apres le declenchement a t=0): un nouveau swipe marche.
    expect(state.handleScroll(-70, 0, 350)).toBe('next');
  });

  it('un scroll vertical dominant ne declenche jamais rien, meme avec du deltaX', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: -80, dy: 120, t: 0 }, // deltaY domine: ignore
      { dx: -80, dy: -200, t: 10 },
      { dx: 0, dy: 50, t: 20 }
    ]);
    expect(results).toEqual([null, null, null]);
  });

  it('un scroll purement vertical (deltaX=0) ne declenche rien', () => {
    const state = new SwipeNavState();
    expect(state.handleScroll(0, 100, 0)).toBeNull();
    expect(state.handleScroll(0, -100, 10)).toBeNull();
  });

  it('alterner gauche/droite sans franchir le seuil ne declenche rien (annulation)', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    const results = run(state, [
      { dx: -40, dy: 0, t: 0 },
      { dx: 35, dy: 0, t: 10 } // cumul -5, largement sous le seuil dans les deux sens
    ]);
    expect(results).toEqual([null, null]);
  });

  it('reset() vide l accumulateur sans affecter le cooldown', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300 });
    expect(state.handleScroll(-50, 0, 0)).toBeNull();
    state.reset();
    // Le petit mouvement precedent est efface, il faut de nouveau tout le seuil.
    expect(state.handleScroll(-50, 0, 10)).toBeNull();
    expect(state.handleScroll(-20, 0, 20)).toBe('next');
  });

  it('utilise les options par defaut quand aucune n est fournie', () => {
    const state = new SwipeNavState();
    expect(state.handleScroll(-DEFAULT_SWIPE_NAV_OPTIONS.threshold, 0, 0)).toBe('next');
  });

  it('un swipe tres rapide et prolonge (inertie) ne declenche jamais plus d une note, meme bien au-dela du cooldown', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 300, gestureGapMs: 120 });
    // 40 evenements de deltaX -50 toutes les 16ms (~624ms de geste continu), sans
    // jamais de vraie pause (>= gestureGapMs) entre deux evenements: un cooldown
    // purement temporel de 300ms aurait laisse ce geste re-declencher plusieurs fois.
    const events = Array.from({ length: 40 }, (_, i) => ({ dx: -50, dy: 0, t: i * 16 }));
    const results = run(state, events);
    expect(results.filter((r) => r !== null)).toEqual(['next']);
  });

  it('le verrou se leve seulement apres une vraie pause (gestureGapMs), pas juste apres cooldownMs', () => {
    const state = new SwipeNavState({ threshold: 60, cooldownMs: 100, gestureGapMs: 200 });
    expect(state.handleScroll(-70, 0, 0)).toBe('next');
    // 150ms plus tard: cooldownMs (100) est ecoule mais gestureGapMs (200) ne
    // l'est pas -> le geste est considere continu, toujours verrouille.
    expect(state.handleScroll(-70, 0, 150)).toBeNull();
    // 250ms apres le dernier evenement (>= gestureGapMs): vraie pause, verrou leve.
    expect(state.handleScroll(-70, 0, 400)).toBe('next');
  });

  it('deux gestes nets et rapproches (~150-200ms d ecart, valeurs par defaut) declenchent chacun un changement, sans attente supplementaire due au cooldown', () => {
    // Options par defaut: threshold 60, cooldownMs 100 (court, absorbe juste le bruit
    // immediat), gestureGapMs 120 (le vrai mecanisme de distinction de geste). Deux
    // swipes nets separes d'une vraie pause de ~150-200ms ne doivent PAS s'additionner
    // en attente: des que la pause (>= gestureGapMs) est passee, le second declenche
    // aussitot, sans devoir en plus attendre un cooldownMs deja largement ecoule.
    const state = new SwipeNavState();
    // Premier geste net: un seul evenement qui franchit directement le seuil.
    expect(state.handleScroll(-70, 0, 0)).toBe('next');
    // Deuxieme geste, volontaire, demarre 180ms plus tard (> gestureGapMs 120,
    // largement > cooldownMs 100): doit declencher IMMEDIATEMENT, des le premier delta.
    expect(state.handleScroll(-70, 0, 180)).toBe('next');
    // Un troisieme geste separe de seulement 150ms de l'evenement precedent doit
    // egalement passer (150 >= gestureGapMs 120, meme si tres proche de cooldownMs).
    expect(state.handleScroll(70, 0, 330)).toBe('prev');
  });
});
