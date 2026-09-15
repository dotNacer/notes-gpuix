/**
 * Lecture/ecriture du presse-papier système, cote Node (ce repo tourne sur Node via
 * `gpuix-svelte`, pas Bun — voir vendor/gpuix-svelte/examples/second-brain/lib/clipboard.ts
 * pour l'equivalent Bun que ce module reprend cote commandes shell). Utilise
 * `execFileSync` plutot qu'un `eval`/shell string pour eviter toute injection.
 */

import { execFileSync } from 'node:child_process';

function readCommand(): [string, string[]] | null {
  if (process.platform === 'darwin') return ['pbpaste', []];
  if (process.platform === 'win32') return ['powershell', ['-NoProfile', '-Command', 'Get-Clipboard']];
  if (process.env.WAYLAND_DISPLAY && hasBinary('wl-paste')) return ['wl-paste', ['--no-newline']];
  if (hasBinary('xclip')) return ['xclip', ['-selection', 'clipboard', '-o']];
  if (hasBinary('xsel')) return ['xsel', ['--clipboard', '--output']];
  return null;
}

function writeCommand(): [string, string[]] | null {
  if (process.platform === 'darwin') return ['pbcopy', []];
  if (process.platform === 'win32') return ['powershell', ['-NoProfile', '-Command', 'Set-Clipboard -Value ([Console]::In.ReadToEnd())']];
  if (process.env.WAYLAND_DISPLAY && hasBinary('wl-copy')) return ['wl-copy', []];
  if (hasBinary('xclip')) return ['xclip', ['-selection', 'clipboard']];
  if (hasBinary('xsel')) return ['xsel', ['--clipboard', '--input']];
  return null;
}

function hasBinary(name: string): boolean {
  try {
    execFileSync('which', [name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Retourne '' quand vide/indisponible plutot que de faire echouer l'appelant. */
export function readClipboardText(): string {
  const cmd = readCommand();
  if (!cmd) return '';
  try {
    return execFileSync(cmd[0], cmd[1], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

/** Retourne false quand indisponible/echec plutot que de faire echouer l'appelant. */
export function writeClipboardText(text: string): boolean {
  const cmd = writeCommand();
  if (!cmd) return false;
  try {
    execFileSync(cmd[0], cmd[1], { input: text, encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}
