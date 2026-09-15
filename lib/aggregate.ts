/**
 * Modes `sum` / `avg` / `count` : agregent les lignes de la note (hors mot-cle,
 * hors lignes commentees par `//`, comme Antinote).
 */

function meaningfulLines(lines: string[]): string[] {
  return lines.filter((line) => !line.trim().startsWith('//'));
}

/** Extrait tous les nombres presents dans les lignes (un nombre par ligne au plus, le premier trouve). */
export function extractNumbers(lines: string[]): number[] {
  const numbers: number[] = [];
  for (const line of meaningfulLines(lines)) {
    const match = /-?\d+(?:\.\d+)?/.exec(line);
    if (match) numbers.push(Number(match[0]));
  }
  return numbers;
}

export function computeSum(lines: string[]): number {
  return extractNumbers(lines).reduce((acc, n) => acc + n, 0);
}

export function computeAvg(lines: string[]): number {
  const numbers = extractNumbers(lines);
  if (numbers.length === 0) return 0;
  return computeSum(lines) / numbers.length;
}

export interface CountResult {
  lines: number;
  words: number;
  chars: number;
}

/** Compte lignes / mots / caracteres, en ignorant les lignes vides et les `//`. */
export function computeCount(lines: string[]): CountResult {
  const kept = meaningfulLines(lines).filter((l) => l.trim().length > 0);
  const words = kept.reduce((acc, line) => acc + line.trim().split(/\s+/).filter(Boolean).length, 0);
  const chars = kept.reduce((acc, line) => acc + line.trim().length, 0);
  return { lines: kept.length, words, chars };
}
