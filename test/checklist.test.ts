import { describe, expect, it } from 'vitest';
import {
  formatChecklistLine,
  isChecklistLine,
  parseChecklistLine,
  toggleChecklistLine,
  toggleChecklistLineAt
} from '../lib/checklist.ts';

describe('parseChecklistLine', () => {
  it('reconnait un tiret simple sans case', () => {
    expect(parseChecklistLine('- acheter du pain')).toEqual({
      kind: 'bullet',
      marker: '-',
      indent: '',
      checked: undefined,
      text: 'acheter du pain'
    });
  });

  it('reconnait * et + comme puces', () => {
    expect(parseChecklistLine('* item')?.marker).toBe('*');
    expect(parseChecklistLine('+ item')?.marker).toBe('+');
  });

  it('reconnait une case non cochee', () => {
    expect(parseChecklistLine('- [ ] tache')).toEqual({
      kind: 'bullet',
      marker: '-',
      indent: '',
      checked: false,
      text: 'tache'
    });
  });

  it('reconnait une case cochee (x minuscule ou majuscule)', () => {
    expect(parseChecklistLine('- [x] fait')?.checked).toBe(true);
    expect(parseChecklistLine('- [X] fait')?.checked).toBe(true);
  });

  it('reconnait une liste numerotee', () => {
    expect(parseChecklistLine('1. premier')).toEqual({
      kind: 'ordered',
      marker: '1.',
      indent: '',
      checked: undefined,
      text: 'premier'
    });
    expect(parseChecklistLine('2) deuxieme')?.marker).toBe('2)');
  });

  it("preserve l'indentation pour les sous-listes", () => {
    expect(parseChecklistLine('  - sous-item')?.indent).toBe('  ');
  });

  it("retourne null pour une ligne qui n'est pas une liste", () => {
    expect(parseChecklistLine('juste du texte')).toBeNull();
    expect(parseChecklistLine('')).toBeNull();
  });
});

describe('isChecklistLine', () => {
  it('detecte correctement', () => {
    expect(isChecklistLine('- item')).toBe(true);
    expect(isChecklistLine('texte normal')).toBe(false);
  });
});

describe('formatChecklistLine', () => {
  it('reconstruit une ligne sans case', () => {
    expect(formatChecklistLine({ kind: 'bullet', marker: '-', indent: '', checked: undefined, text: 'item' })).toBe(
      '- item'
    );
  });

  it('reconstruit une ligne avec case cochee/decochee', () => {
    expect(formatChecklistLine({ kind: 'bullet', marker: '-', indent: '', checked: false, text: 'item' })).toBe(
      '- [ ] item'
    );
    expect(formatChecklistLine({ kind: 'bullet', marker: '-', indent: '', checked: true, text: 'item' })).toBe(
      '- [x] item'
    );
  });
});

describe('toggleChecklistLine', () => {
  it('ajoute une case decochee puis la coche au prochain appel', () => {
    const first = toggleChecklistLine('- item');
    expect(first).toBe('- [x] item');
    const second = toggleChecklistLine(first);
    expect(second).toBe('- [ ] item');
  });

  it('bascule une case deja cochee', () => {
    expect(toggleChecklistLine('- [x] fait')).toBe('- [ ] fait');
  });

  it("laisse une ligne non-liste inchangee", () => {
    expect(toggleChecklistLine('texte libre')).toBe('texte libre');
  });
});

describe('toggleChecklistLineAt', () => {
  it('bascule uniquement la ligne visee dans un contenu multi-lignes', () => {
    const content = '- [ ] un\n- [ ] deux\n- [ ] trois';
    expect(toggleChecklistLineAt(content, 1)).toBe('- [ ] un\n- [x] deux\n- [ ] trois');
  });

  it('ignore un index hors bornes', () => {
    const content = '- [ ] un';
    expect(toggleChecklistLineAt(content, 5)).toBe(content);
    expect(toggleChecklistLineAt(content, -1)).toBe(content);
  });
});
