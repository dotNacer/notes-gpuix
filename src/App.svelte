<script lang="ts">
	import { on_window_key, get_native, type GpuixEvent } from 'gpuix-svelte';
	import { state as appState, refresh, next, prev, edit, flush, addNote, removeCurrent } from '../lib/state.svelte.ts';
	import { SwipeNavState } from '../lib/swipeNav.ts';
	import {
		outgoingMotion,
		incomingMotion,
		PAGE_TURN_DURATION_S,
		PAGE_TURN_CLEANUP_BUFFER_MS,
		type PageTurnDirection
	} from '../lib/pageTurn.ts';

	// Cmd+Flèche est un raccourci natif macOS de NSTextView (aller au début/fin
	// de ligne) : le champ de texte focus l'intercepte avant que on_window_key
	// ne le voie, donc ça ne marchait jamais depuis le textarea. ] / [ n'ont
	// pas de binding système par défaut, donc ils passent bien. On garde les
	// flèches en fallback si jamais le focus n'est pas dans le champ.
	function onkey(e: { key: string; modifiers?: { cmd?: boolean }; editing?: boolean }) {
		if (!e.modifiers?.cmd) return;
		if (e.key === ']' || e.key === 'ArrowRight' || e.key === 'right') goNext();
		else if (e.key === '[' || e.key === 'ArrowLeft' || e.key === 'left') goPrev();
		else if (e.key === 'n') goAddNote();
		else if (e.key === 'Backspace' && appState.notes.length > 1) removeCurrent();
	}

	$effect(() => on_window_key('keydown', onkey));

	// Swipe à deux doigts (trackpad) pour naviguer entre notes, comme Antinote.
	// La logique de seuil/cooldown est un module pur testé isolément (lib/swipeNav.ts) ;
	// ici on ne fait que router l'event GPUI 'scroll' de la zone .app vers next()/prev().
	const swipe = new SwipeNavState();
	function onscroll(e: GpuixEvent) {
		const action = swipe.handleScroll(e.deltaX ?? 0, e.deltaY ?? 0, Date.now());
		if (action === 'next') goNext();
		else if (action === 'prev') goPrev();
	}

	// Animation "page qui tourne" au changement de note (voir lib/pageTurn.ts pour le
	// calcul pur des valeurs motion). `vendor/gpuix-svelte` n'a pas de CSS transitions ;
	// tout passe par la prop native `motion={{ initial, animate, transition }}`.
	//
	// Deux calques PUREMENT DECORATIFS pendant la transition, tous les deux en lecture
	// seule et `pointer-events: none` :
	// - `transition.outgoingText` : instantané de l'ANCIENNE note, glisse hors écran
	//   et disparaît.
	// - `transition.incomingText` : instantané de la NOUVELLE note, glisse depuis le
	//   bord opposé jusqu'à sa position finale.
	// Le vrai <textarea> (toujours lié à appState.draft, donc déjà sur la NOUVELLE
	// note) reste STATIQUE à `left: 0, opacity: 1` pendant toute l'animation — sa prop
	// `motion` n'est JAMAIS manipulée. Il est visible et éditable immédiatement ; une
	// fois la transition du calque `incoming` terminée, ce dernier est démonté et le
	// textarea prend le relais visuellement sans discontinuité, puisqu'il affichait
	// déjà le même texte à la même position. Ainsi le pire cas possible (un souci de
	// timing sur un calque décoratif) donne au pire une animation ratée, jamais un
	// texte invisible.
	interface PageTurnState {
		id: number;
		direction: PageTurnDirection;
		outgoingText: string;
		incomingText: string;
		width: number;
	}

	let transition = $state<PageTurnState | null>(null);
	let transitionId = 0;

	function containerWidth(): number {
		return get_native()?.getWindowSize().width ?? 800;
	}

	function beginPageTurn(
		direction: PageTurnDirection,
		outgoingText: string,
		incomingText: string,
		width: number
	): void {
		transitionId += 1;
		const id = transitionId;
		transition = { id, direction, outgoingText, incomingText, width };

		// Demonte les calques decoratifs une fois la transition terminee (+ marge de securite).
		setTimeout(() => {
			if (transition?.id === id) transition = null;
		}, PAGE_TURN_DURATION_S * 1000 + PAGE_TURN_CLEANUP_BUFFER_MS);
	}

	function goNext(): void {
		if (appState.notes.length <= 1) {
			next();
			return;
		}
		const outgoingText = appState.draft;
		const width = containerWidth();
		next();
		beginPageTurn('next', outgoingText, appState.draft, width);
	}

	function goPrev(): void {
		if (appState.notes.length <= 1) {
			prev();
			return;
		}
		const outgoingText = appState.draft;
		const width = containerWidth();
		prev();
		beginPageTurn('prev', outgoingText, appState.draft, width);
	}

	function goAddNote(): void {
		const hadExistingNote = appState.notes.length >= 1;
		const outgoingText = appState.draft;
		const width = containerWidth();
		addNote();
		if (hadExistingNote) beginPageTurn('next', outgoingText, appState.draft, width);
	}

	refresh();
</script>

<div class="app" {onscroll}>
	<div class="editor-stack">
		{#if transition}
			{#key transition.id}
				<div
					class="editor-layer outgoing"
					motion={outgoingMotion(transition.direction, transition.width)}
				>{transition.outgoingText}</div>
				<div
					class="editor-layer incoming"
					motion={incomingMotion(transition.direction, transition.width)}
				>{transition.incomingText}</div>
			{/key}
		{/if}
		<textarea
			class="editor-layer editor"
			testId="editor"
			autofocus
			placeholder="Écris quelque chose..."
			value={appState.draft}
			onchange={(e) => edit(e.value)}
			onblur={flush}
		></textarea>
	</div>

	{#if appState.notes.length > 1}
		<div class="dots-wrap">
			<div class="dots">
				{#each appState.notes as _note, i (i)}
					<div class="dot" class:active={i === appState.index}></div>
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
	.editor-stack {
		flex: 1;
		position: relative;
		overflow: hidden;
	}
	/* `left` est piloté par la prop `motion` de chaque calque (pas de valeur statique
	   ici) : GPUI calcule sa valeur courante à partir de `animate`/`transition`. */
	.editor-layer {
		position: absolute;
		top: 0;
		width: 100%;
		height: 100%;
		padding: 48px 56px;
		background-color: transparent;
		color: #e8e8e8;
		font-size: 16px;
		line-height: 26px;
	}
	.editor-layer.outgoing,
	.editor-layer.incoming {
		pointer-events: none;
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
