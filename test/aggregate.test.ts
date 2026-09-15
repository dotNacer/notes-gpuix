import { describe, expect, it } from 'vitest';
import { computeAvg, computeCount, computeSum, extractNumbers } from '../lib/aggregate.ts';

describe('extractNumbers', () => {
  it('extrait un nombre par ligne', () => {
    expect(extractNumbers(['10', '20', '30'])).toEqual([10, 20, 30]);
  });

  it('extrait le nombre au milieu de texte', () => {
    expect(extractNumbers(['loyer: 850', 'courses 42.5€'])).toEqual([850, 42.5]);
  });

  it('ignore les lignes sans nombre et les lignes // ', () => {
    expect(extractNumbers(['pas de nombre ici', '// 100', '5'])).toEqual([5]);
  });

  it('gere les negatifs', () => {
    expect(extractNumbers(['-15', '10'])).toEqual([-15, 10]);
  });
});

describe('computeSum', () => {
  it('additionne toutes les valeurs', () => {
    expect(computeSum(['10', '20', '30'])).toBe(60);
  });

  it('retourne 0 sur une liste vide de nombres', () => {
    expect(computeSum(['rien ici'])).toBe(0);
  });
});

describe('computeAvg', () => {
  it('calcule la moyenne', () => {
    expect(computeAvg(['10', '20', '30'])).toBe(20);
  });

  it('retourne 0 sans aucun nombre (pas de division par zero)', () => {
    expect(computeAvg(['rien'])).toBe(0);
  });
});

describe('computeCount', () => {
  it('compte lignes / mots / caracteres en ignorant les lignes vides et //', () => {
    const result = computeCount(['bonjour le monde', '', '// commentaire', 'deux mots']);
    expect(result).toEqual({ lines: 2, words: 5, chars: 25 });
  });

  it('retourne des zeros pour une note vide', () => {
    expect(computeCount([])).toEqual({ lines: 0, words: 0, chars: 0 });
  });
});
