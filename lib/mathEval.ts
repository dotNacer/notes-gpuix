/**
 * Evaluateur arithmetique minimal pour le mode `math` : +, -, *, /, parentheses,
 * nombres decimaux et unaire -/+. Pas de conversions devises/unites, pas de
 * variables reactives (hors perimetre v1, voir README). Volontairement pas de
 * `eval`/`Function` : petit parseur recursif-descendant, entree utilisateur.
 */

interface Token {
  type: 'num' | 'op' | 'lparen' | 'rparen';
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i]!;
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen', value: c });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: c });
      i++;
      continue;
    }
    if ('+-*/'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j]!)) j++;
      const numStr = expr.slice(i, j);
      if (!/^\d*\.?\d+$|^\d+\.?\d*$/.test(numStr)) return [];
      tokens.push({ type: 'num', value: numStr });
      i = j;
      continue;
    }
    // Caractere inconnu (lettre, symbole devise/unite...) : expression non arithmetique simple.
    return [];
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parseExpression(): number | null {
    let left = this.parseTerm();
    if (left === null) return null;
    for (;;) {
      const tok = this.peek();
      if (!tok || tok.type !== 'op' || (tok.value !== '+' && tok.value !== '-')) break;
      this.consume();
      const right = this.parseTerm();
      if (right === null) return null;
      left = tok.value === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseTerm(): number | null {
    let left = this.parseUnary();
    if (left === null) return null;
    for (;;) {
      const tok = this.peek();
      if (!tok || tok.type !== 'op' || (tok.value !== '*' && tok.value !== '/')) break;
      this.consume();
      const right = this.parseUnary();
      if (right === null) return null;
      if (tok.value === '/') {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  private parseUnary(): number | null {
    const tok = this.peek();
    if (tok && tok.type === 'op' && (tok.value === '-' || tok.value === '+')) {
      this.consume();
      const value = this.parseUnary();
      if (value === null) return null;
      return tok.value === '-' ? -value : value;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number | null {
    const tok = this.consume();
    if (!tok) return null;
    if (tok.type === 'num') return Number(tok.value);
    if (tok.type === 'lparen') {
      const value = this.parseExpression();
      const close = this.consume();
      if (value === null || !close || close.type !== 'rparen') return null;
      return value;
    }
    return null;
  }

  isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

/**
 * Evalue une ligne comme une expression arithmetique simple. Retourne null si
 * la ligne ne contient pas d'expression exploitable (texte libre, vide, ou
 * commencant par `//`).
 */
export function evaluateMathLine(line: string): number | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//')) return null;
  // Doit contenir au moins un chiffre, sinon on ne tente meme pas de parser.
  if (!/\d/.test(trimmed)) return null;
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;
  const parser = new Parser(tokens);
  const result = parser.parseExpression();
  if (result === null || !parser.isAtEnd() || !Number.isFinite(result)) return null;
  return result;
}
