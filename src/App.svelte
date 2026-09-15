<script lang="ts">
	import { on_window_key } from 'gpuix-svelte';
	import { state, refresh, next, prev, edit, flush, addNote, removeCurrent } from '../lib/state.svelte.ts';

	// Cmd+Flèche est un raccourci natif macOS de NSTextView (aller au début/fin
	// de ligne) : le champ de texte focus l'intercepte avant que on_window_key
	// ne le voie, donc ça ne marchait jamais depuis le textarea. ] / [ n'ont
	// pas de binding système par défaut, donc ils passent bien. On garde les
	// flèches en fallback si jamais le focus n'est pas dans le champ.
	function onkey(e: { key: string; modifiers?: { cmd?: boolean }; editing?: boolean }) {
		if (!e.modifiers?.cmd) return;
		if (e.key === ']' || e.key === 'ArrowRight' || e.key === 'right') next();
		else if (e.key === '[' || e.key === 'ArrowLeft' || e.key === 'left') prev();
		else if (e.key === 'n') addNote();
		else if (e.key === 'Backspace' && state.notes.length > 1) removeCurrent();
	}

	$effect(() => on_window_key('keydown', onkey));

	refresh();
</script>

<div class="app">
	<textarea
		class="editor"
		testId="editor"
		autofocus
		placeholder="Écris quelque chose..."
		value={state.draft}
		onchange={(e) => edit(e.value)}
		onblur={flush}
	></textarea>

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
