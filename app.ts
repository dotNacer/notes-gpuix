import { render_hot } from 'gpuix-svelte';

render_hot(new URL('./src/App.svelte', import.meta.url), {
	title: 'Notes',
	width: 720,
	height: 520
});
