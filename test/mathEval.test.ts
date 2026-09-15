import { describe, expect, it } from 'vitest';
import { evaluateMathLine } from '../lib/mathEval.ts';

describe('evaluateMathLine', () => {
  it('evalue les 4 operations de base', () => {
    expect(evaluateMathLine('2 + 3')).toBe(5);
    expect(evaluateMathLine('10 - 4')).toBe(6);
    expect(evaluateMathLine('3 * 4')).toBe(12);
    expect(evaluateMathLine('10 / 4')).toBe(2.5);
  });

  it('respecte la priorite des operateurs et les parentheses', () => {
    expect(evaluateMathLine('2 + 3 * 4')).toBe(14);
    expect(evaluateMathLine('(2 + 3) * 4')).toBe(20);
    expect(evaluateMathLine('(1 + 2) * (3 + 4)')).toBe(21);
  });

  it('gere les nombres decimaux et le moins unaire', () => {
    expect(evaluateMathLine('1.5 + 2.5')).toBe(4);
    expect(evaluateMathLine('-5 + 10')).toBe(5);
    expect(evaluateMathLine('-(2 + 3)')).toBe(-5);
  });

  it('ignore les lignes commentees par //', () => {
    expect(evaluateMathLine('// 2 + 2')).toBeNull();
  });

  it('retourne null pour du texte libre ou une ligne vide', () => {
    expect(evaluateMathLine('juste du texte')).toBeNull();
    expect(evaluateMathLine('')).toBeNull();
    expect(evaluateMathLine('   ')).toBeNull();
  });

  it('retourne null pour une division par zero', () => {
    expect(evaluateMathLine('5 / 0')).toBeNull();
  });

  it('retourne null pour une expression malformee', () => {
    expect(evaluateMathLine('2 + ')).toBeNull();
    expect(evaluateMathLine('(2 + 3')).toBeNull();
    expect(evaluateMathLine('2 3')).toBeNull();
  });

  it('accepte le plus unaire enchaine (2 + +3 = 5)', () => {
    expect(evaluateMathLine('2 + + 3')).toBe(5);
  });

  it('rejette les devises/unites (hors perimetre v1)', () => {
    expect(evaluateMathLine('10€ + 5€')).toBeNull();
    expect(evaluateMathLine('10kg + 5kg')).toBeNull();
  });

  it('rejette une ligne contenant une variable (hors perimetre v1)', () => {
    expect(evaluateMathLine('x = 2 + 3')).toBeNull();
  });
});
