<script lang="ts">
	import { on_window_key } from 'gpuix-svelte';
	import { state, refresh, next, prev, edit, flush, addNote, removeCurrent } from '../lib/state.svelte.ts';
	import { parseChecklistLine, toggleChecklistLineAt } from '../lib/checklist.ts';
	import { detectKeyword, bodyLines } from '../lib/keywords.ts';
	import { evaluateMathLine } from '../lib/mathEval.ts';
	import { computeAvg, computeCount, computeSum } from '../lib/aggregate.ts';
	import { stripPastedText } from '../lib/pasteStrip.ts';
	import { readClipboardText } from '../lib/clipboardNode.ts';

	const LINE_HEIGHT = 26;
	const PAD_TOP = 48;
	const PAD_LEFT = 56;

	// Cmd+Flèche est un raccourci natif macOS de NSTextView (aller au début/fin
	// de ligne) : le champ de texte focus l'intercepte avant que on_window_key
	// ne le voie, donc ça ne marchait jamais depuis le textarea. ] / [ n'ont
	// pas de binding système par défaut, donc ils passent bien. On garde les
	// flèches en fallback si jamais le focus n'est pas dans le champ.
	//
	// Collage en texte brut : gpuix-svelte n'expose aucun événement `paste`
	// (voir vendor/gpuix-svelte/src/events.ts) et Cmd+V standard est très
	// probablement intercepté par NSTextView avant d'atteindre on_window_key
	// (même famille de problème que Cmd+Flèche, non vérifiable sans macOS —
	// voir README "Limites connues"). Cmd+Shift+V ("coller sans mise en
	// forme") n'a pas de binding système connu, donc il nous parvient de
	// façon fiable : on lit le presse-papier système nous-mêmes, on strip la
	// mise en forme (sauf en mode `code`), et on l'ajoute en fin de note —
	// faute d'API de position de curseur exposée par le renderer pour un
	// <textarea> natif (voir gpuix-svelte/src/window.ts), on ne peut pas
	// insérer exactement "au point d'insertion" comme un vrai paste DOM.
	function onkey(e: { key: string; modifiers?: { cmd?: boolean; shift?: boolean }; editing?: boolean }) {
		if (!e.modifiers?.cmd) return;
		if (e.modifiers.shift && e.key.toLowerCase() === 'v') {
			pasteStripped();
			return;
		}
		if (e.key === ']' || e.key === 'ArrowRight' || e.key === 'right') next();
		else if (e.key === '[' || e.key === 'ArrowLeft' || e.key === 'left') prev();
		else if (e.key === 'n') addNote();
		else if (e.key === 'Backspace' && state.notes.length > 1) removeCurrent();
	}

	function pasteStripped() {
		const clipboardText = readClipboardText();
		if (!clipboardText) return;
		const stripped = stripPastedText(clipboardText, keywordMode?.keyword ?? null);
		const needsNewline = state.draft.length > 0 && !state.draft.endsWith('\n');
		edit(state.draft + (needsNewline ? '\n' : '') + stripped);
	}

	$effect(() => on_window_key('keydown', onkey));

	refresh();

	// Mode de la note courante d'après sa 1ère ligne (list/math/sum/avg/count/code), ou null.
	let keywordMode = $derived(detectKeyword(state.draft));
	let lines = $derived(state.draft.split('\n'));
	let isCodeMode = $derived(keywordMode?.keyword === 'code');

	// Checklist auto : toute ligne "- "/"* "/"1." devient un item cochable, sauf en
	// mode code (où "- " peut faire partie de code source, pas d'une liste).
	let checklistItems = $derived(
		isCodeMode
			? []
			: lines
					.map((line, index) => ({ index, item: parseChecklistLine(line) }))
					.filter((entry): entry is { index: number; item: NonNullable<ReturnType<typeof parseChecklistLine>> } => entry.item !== null)
	);

	// Mode math : évalue chaque ligne du corps (après le mot-clé) et affiche le résultat à droite.
	let mathResults = $derived(
		keywordMode?.keyword === 'math'
			? lines.slice(1).map((line, i) => ({ index: i + 1, result: evaluateMathLine(line) })).filter((r) => r.result !== null)
			: []
	);

	// Modes sum/avg/count : bandeau de synthèse sur le corps (hors ligne mot-clé).
	let summaryBanner = $derived.by(() => {
		if (!keywordMode) return null;
		const body = bodyLines(state.draft);
		if (keywordMode.keyword === 'sum') return `Somme : ${computeSum(body)}`;
		if (keywordMode.keyword === 'avg') return `Moyenne : ${computeAvg(body).toFixed(2)}`;
		if (keywordMode.keyword === 'count') {
			const c = computeCount(body);
			return `${c.lines} ligne${c.lines > 1 ? 's' : ''} · ${c.words} mot${c.words > 1 ? 's' : ''} · ${c.chars} caractère${c.chars > 1 ? 's' : ''}`;
		}
		return null;
	});

	function toggleLine(index: number) {
		edit(toggleChecklistLineAt(state.draft, index));
	}
</script>

<div class="app">
	<textarea
		class="editor"
		class:code={isCodeMode}
		testId="editor"
		autofocus
		placeholder="Écris quelque chose..."
		value={state.draft}
		onchange={(e) => edit(e.value)}
		onblur={flush}
	></textarea>

	<div class="overlay">
		{#each checklistItems as { index, item } (index)}
			<div
				class="checkbox"
				class:checked={item.checked === true}
				testId="checkbox-{index}"
				style="top: {PAD_TOP + index * LINE_HEIGHT}px; left: {(PAD_LEFT - 32) / 2}px;"
				onclick={() => toggleLine(index)}
				hitbox="self"
			>
				{#if item.checked === true}
					<div class="checkbox-mark">✓</div>
				{/if}
			</div>
		{/each}

		{#each mathResults as { index, result } (index)}
			<div class="math-result" style="top: {PAD_TOP + index * LINE_HEIGHT}px;">
				= {result}
			</div>
		{/each}
	</div>

	{#if summaryBanner}
		<div class="summary-banner" testId="summary-banner">{summaryBanner}</div>
	{/if}

	{#if state.notes.length > 1}
		<div class="dots-wrap">
			<div class="dots">
				{#each state.notes as _note, i (i)}
					<div class="dot" class:active={i === state.index}></div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.app {
		width: 100%;
		height: 100%;
		background-color: #1e1e1e;
		position: relative;
		display: flex;
	}
	.editor {
		flex: 1;
		width: 100%;
		height: 100%;
		padding: 48px 56px;
		background-color: transparent;
		color: #e8e8e8;
		font-size: 16px;
		line-height: 26px;
	}
	.editor.code {
		font-family: monospace;
	}
	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.checkbox {
		position: absolute;
		width: 16px;
		height: 16px;
		border-radius: 3px;
		border-width: 1px;
		border-color: #6a6a6a;
		background-color: transparent;
		pointer-events: auto;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.checkbox.checked {
		background-color: #4a8fe7;
		border-color: #4a8fe7;
	}
	.checkbox-mark {
		font-size: 11px;
		color: #ffffff;
	}
	.math-result {
		position: absolute;
		right: 20px;
		color: #7fb3ff;
		font-size: 15px;
	}
	.summary-banner {
		position: absolute;
		top: 12px;
		right: 20px;
		color: #9a9a9a;
		font-size: 13px;
	}
	.dots-wrap {
		position: absolute;
		bottom: 16px;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
	.dots {
		display: flex;
		flex-direction: row;
		gap: 6px;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background-color: #4a4a4a;
	}
	.dot.active {
		background-color: #8a8a8a;
	}
</style>
