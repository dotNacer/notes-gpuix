<script lang="ts">
	import { on_window_key, get_native, type GpuixEvent } from 'gpuix-svelte';
	import { state, refresh, next, prev, edit, flush, addNote, removeCurrent } from '../lib/state.svelte.ts';
	import { SwipeNavState } from '../lib/swipeNav.ts';
	import {
		outgoingMotion,
		incomingMotion,
		PAGE_TURN_DURATION_S,
		PAGE_TURN_EASE,
		PAGE_TURN_CLEANUP_BUFFER_MS,
		type PageTurnDirection,
		type PageTurnMotion
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
		else if (e.key === 'Backspace' && state.notes.length > 1) removeCurrent();
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
	// Deux calques pendant la transition :
	// - `transition.outgoingText` : instantané en lecture seule de l'ancienne note,
	//   affiché dans un <div> qui glisse hors écran puis est démonté. Purement visuel.
	// - le vrai <textarea> (toujours lié à state.draft, donc déjà sur la NOUVELLE note) :
	//   reste l'unique source de vérité et reste éditable immédiatement, mais sa prop
	//   `motion` est pilotée en deux temps pour lui faire rejouer une entrée depuis le
	//   bord opposé plutôt que de rester visible à sa position normale pendant que la
	//   sortante glisse par-dessus :
	//   1) un saut instantané (duration: 0) jusqu'au bord d'où elle doit "entrer" —
	//      le textarea ne bouge jamais réellement dans le DOM, `left` est juste une
	//      valeur numérique reprise par le moteur de rendu GPUI ;
	//   2) au tick suivant, une vraie transition (`PAGE_TURN_DURATION_S`, easeOut) qui
	//      la ramène à `left: 0`. GPUI tween automatiquement depuis la position courante.
	// `initial` ne joue qu'au montage : comme le textarea n'est jamais démonté, l'étape
	// 1 (saut instantané) est ce qui simule un "re-montage" à la bonne position de départ.
	interface PageTurnState {
		id: number;
		direction: PageTurnDirection;
		outgoingText: string;
		width: number;
	}

	let transition = $state<PageTurnState | null>(null);
	let transitionId = 0;
	const STILL: PageTurnMotion = {
		initial: false,
		animate: { left: 0, opacity: 1 },
		transition: { duration: 0, ease: PAGE_TURN_EASE }
	};
	let editorMotion = $state<PageTurnMotion>(STILL);

	function containerWidth(): number {
		return get_native()?.getWindowSize().width ?? 800;
	}

	function beginPageTurn(direction: PageTurnDirection, outgoingText: string, width: number): void {
		transitionId += 1;
		const id = transitionId;
		transition = { id, direction, outgoingText, width };

		const target = incomingMotion(direction, width);
		if (target.initial !== false) {
			// Phase 1 : saut instantané jusqu'au bord d'entrée (duration 0, pas de tween).
			editorMotion = { initial: false, animate: target.initial, transition: { duration: 0, ease: PAGE_TURN_EASE } };
		}
		// Phase 2 : au tick suivant, vraie transition vers la position finale.
		setTimeout(() => {
			editorMotion = { initial: false, animate: target.animate, transition: target.transition };
		}, 0);

		// Demonte le calque sortant une fois la transition terminée (+ marge de securite).
		setTimeout(() => {
			if (transition?.id === id) transition = null;
		}, PAGE_TURN_DURATION_S * 1000 + PAGE_TURN_CLEANUP_BUFFER_MS);
	}

	function goNext(): void {
		if (state.notes.length <= 1) {
			next();
			return;
		}
		const outgoingText = state.draft;
		const width = containerWidth();
		next();
		beginPageTurn('next', outgoingText, width);
	}

	function goPrev(): void {
		if (state.notes.length <= 1) {
			prev();
			return;
		}
		const outgoingText = state.draft;
		const width = containerWidth();
		prev();
		beginPageTurn('prev', outgoingText, width);
	}

	function goAddNote(): void {
		const hadExistingNote = state.notes.length >= 1;
		const outgoingText = state.draft;
		const width = containerWidth();
		addNote();
		if (hadExistingNote) beginPageTurn('next', outgoingText, width);
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
			{/key}
		{/if}
		<textarea
			class="editor-layer editor"
			testId="editor"
			autofocus
			placeholder="Écris quelque chose..."
			value={state.draft}
			onchange={(e) => edit(e.value)}
			onblur={flush}
			motion={editorMotion}
		></textarea>
	</div>

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
	.editor-layer.outgoing {
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
