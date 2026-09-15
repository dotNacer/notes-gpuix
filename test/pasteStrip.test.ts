import { describe, expect, it } from 'vitest';
import { stripPastedText } from '../lib/pasteStrip.ts';

describe('stripPastedText', () => {
  it('retire les puces en tete de ligne', () => {
    expect(stripPastedText('- item 1\n* item 2\n+ item 3')).toBe('item 1\nitem 2\nitem 3');
  });

  it('retire la numerotation en tete de ligne', () => {
    expect(stripPastedText('1. premier\n2) deuxieme')).toBe('premier\ndeuxieme');
  });

  it("retire l'indentation en tete de ligne", () => {
    expect(stripPastedText('    texte indente\n\ttab indente')).toBe('texte indente\ntab indente');
  });

  it('garde le texte intact sans puces/indentation', () => {
    expect(stripPastedText('juste du texte\nsur plusieurs lignes')).toBe('juste du texte\nsur plusieurs lignes');
  });

  it('en mode code, ne touche a rien (indentation preservee)', () => {
    const code = '  function foo() {\n    return 1;\n  }';
    expect(stripPastedText(code, 'code')).toBe(code);
  });

  it('en mode code, garde meme les puces telles quelles', () => {
    expect(stripPastedText('- not a list, just code', 'code')).toBe('- not a list, just code');
  });
});
