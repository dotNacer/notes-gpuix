import { describe, expect, it } from 'vitest';
import { bodyLines, detectKeyword, stripKeywordLine } from '../lib/keywords.ts';

describe('detectKeyword', () => {
  it('detecte chaque mot-cle exact en 1ere ligne', () => {
    for (const kw of ['list', 'math', 'sum', 'avg', 'count', 'code']) {
      expect(detectKeyword(`${kw}\nligne 2`)).toEqual({ keyword: kw, title: undefined });
    }
  });

  it('est insensible a la casse', () => {
    expect(detectKeyword('MATH\n1+1')).toEqual({ keyword: 'math', title: undefined });
  });

  it('accepte "list: Titre"', () => {
    expect(detectKeyword('list: Courses\n- pain')).toEqual({ keyword: 'list', title: 'Courses' });
  });

  it('list: sans titre laisse title undefined', () => {
    expect(detectKeyword('list:\n- pain')).toEqual({ keyword: 'list', title: undefined });
  });

  it('ignore un mot-cle qui ne serait pas seul sur la ligne', () => {
    expect(detectKeyword('mathematiques\n1+1')).toBeNull();
    expect(detectKeyword('list des courses\n- pain')).toBeNull();
  });

  it('retourne null si la note est vide ou sans mot-cle', () => {
    expect(detectKeyword('')).toBeNull();
    expect(detectKeyword('note normale\nsuite')).toBeNull();
  });
});

describe('stripKeywordLine', () => {
  it('retire la 1ere ligne quand un mot-cle est present', () => {
    expect(stripKeywordLine('math\n1+1\n2+2')).toBe('1+1\n2+2');
  });

  it('laisse le contenu intact sans mot-cle', () => {
    expect(stripKeywordLine('note normale\nsuite')).toBe('note normale\nsuite');
  });

  it('gere le mot-cle seul (note vide apres)', () => {
    expect(stripKeywordLine('math')).toBe('');
  });
});

describe('bodyLines', () => {
  it('renvoie les lignes de corps sans le mot-cle', () => {
    expect(bodyLines('sum\n1\n2\n3')).toEqual(['1', '2', '3']);
  });

  it('renvoie toutes les lignes si pas de mot-cle', () => {
    expect(bodyLines('a\nb')).toEqual(['a', 'b']);
  });

  it('renvoie un tableau vide pour une note vide', () => {
    expect(bodyLines('')).toEqual([]);
  });
});
