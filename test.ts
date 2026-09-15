import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Isole ce test de ~/Notes: NOTES_DIR doit etre fixe AVANT que App.svelte
// (via lib/notes.ts) ne le lise a l'import.
const dir = mkdtempSync(join(tmpdir(), 'notes-gpuix-test-'));
process.env.NOTES_DIR = dir;

const { mount_headless, click_test_id, type, press, find_test_id, all_text, check, finish } = await import('gpuix-svelte/test');
const { default: App } = await import('./src/App.svelte');

mount_headless(App, { width: 600, height: 400 });

// Une note vide existe au demarrage (refresh() cree le dossier mais pas de note).
check('aucune note au demarrage', all_text().includes('Écris quelque chose'));

// cmd-n cree une premiere note et la snapshot doit refleter le champ vide.
press('cmd-n');
check('une note existe apres cmd-n', find_test_id('editor') !== undefined);

click_test_id('editor');
type('Bonjour');
press('tab'); // force le blur/onchange a etre pris en compte avant la lecture suivante
check('le texte tape apparait', all_text().includes('Bonjour'));

press('cmd-n');
type('Deuxieme note');
check('deuxieme note visible', all_text().includes('Deuxieme note'));

press('cmd-left');
check('retour a la premiere note', all_text().includes('Bonjour') && !all_text().includes('Deuxieme note'));

rmSync(dir, { recursive: true, force: true });
finish('notes-gpuix', 4);
