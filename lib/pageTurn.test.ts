import { describe, expect, it } from 'vitest';
import {
  outgoingMotion,
  incomingMotion,
  PAGE_TURN_DURATION_S,
  PAGE_TURN_EASE
} from './pageTurn.ts';

describe('outgoingMotion', () => {
  it('next: glisse vers la gauche (left negatif) et fade vers 0', () => {
    const m = outgoingMotion('next', 1000);
    expect(m.initial).toEqual({ left: 0, opacity: 1 });
    expect(m.animate).toEqual({ left: -1000, opacity: 0 });
  });

  it('prev: glisse vers la droite (left positif) et fade vers 0', () => {
    const m = outgoingMotion('prev', 1000);
    expect(m.initial).toEqual({ left: 0, opacity: 1 });
    expect(m.animate).toEqual({ left: 1000, opacity: 0 });
  });

  it('utilise easeOut et une duree en secondes sous 300ms', () => {
    const m = outgoingMotion('next', 800);
    expect(m.transition.ease).toBe('easeOut');
    expect(m.transition.ease).toBe(PAGE_TURN_EASE);
    expect(m.transition.duration).toBe(PAGE_TURN_DURATION_S);
    expect(m.transition.duration).toBeLessThan(0.3);
  });
});

describe('incomingMotion', () => {
  it('next: demarre depuis la droite (left positif) et fade in', () => {
    const m = incomingMotion('next', 1000);
    expect(m.initial).toEqual({ left: 1000, opacity: 0 });
    expect(m.animate).toEqual({ left: 0, opacity: 1 });
  });

  it('prev: demarre depuis la gauche (left negatif) et fade in', () => {
    const m = incomingMotion('prev', 1000);
    expect(m.initial).toEqual({ left: -1000, opacity: 0 });
    expect(m.animate).toEqual({ left: 0, opacity: 1 });
  });

  it('le sens entrant est toujours oppose au sens sortant (coherence spatiale)', () => {
    for (const direction of ['next', 'prev'] as const) {
      for (const width of [400, 900, 1440]) {
        const out = outgoingMotion(direction, width);
        const inn = incomingMotion(direction, width);
        // La sortante part dans un sens, l'entrante arrive de l'autre: signes opposes.
        expect(inn.initial).not.toBe(false);
        if (inn.initial !== false) expect(Math.sign(out.animate.left)).toBe(-Math.sign(inn.initial.left));
        expect(inn.animate.left).toBe(0);
        expect(out.initial).not.toBe(false);
        if (out.initial !== false) expect(out.initial.left).toBe(0);
      }
    }
  });

  it('utilise easeOut et la meme duree que la sortante', () => {
    const m = incomingMotion('prev', 800);
    expect(m.transition.ease).toBe('easeOut');
    expect(m.transition.duration).toBe(PAGE_TURN_DURATION_S);
  });
});
