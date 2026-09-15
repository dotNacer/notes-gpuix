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
});
