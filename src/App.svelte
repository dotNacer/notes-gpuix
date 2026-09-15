<script lang="ts">
	import { on_window_key, blur } from 'gpuix-svelte';
	import { state, refresh, next, prev, edit, flush, addNote, removeCurrent } from '../lib/state.svelte.ts';

	function onkey(e: { key: string; modifiers?: { cmd?: boolean }; editing?: boolean }) {
		if (!e.modifiers?.cmd) return;
		if (e.key === 'ArrowRight' || e.key === 'right') next();
		else if (e.key === 'ArrowLeft' || e.key === 'left') prev();
		else if (e.key === 'n') addNote();
		else if (e.key === 'Backspace' && state.notes.length > 1) removeCurrent();
	}

	$effect(() => on_window_key('keydown', onkey));

	refresh();
</script>

<div class="app" onmousedown={blur}>
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
		line-height: 1.6;
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
