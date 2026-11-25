<script lang="ts">
	import Display from './Display.svelte';
	let {
		memory,
		open = $bindable(false),
	}: { memory: number[]; open?: boolean } = $props();
	let box = $state({
		x: Math.max(8, (window.innerWidth - 390) / 2),
		y: 80,
		width: 390,
		height: 440,
	});
	let gesture:
		| { edge: string; x: number; y: number; box: typeof box }
		| undefined;
	const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

	function fit() {
		box.width = Math.min(box.width, window.innerWidth);
		box.height = Math.min(box.height, window.innerHeight);
		box.x = Math.max(0, Math.min(box.x, window.innerWidth - box.width));
		box.y = Math.max(0, Math.min(box.y, window.innerHeight - box.height));
	}
	$effect(() => {
		if (open) fit();
		else gesture = undefined;
	});

	function begin(event: PointerEvent, edge = '') {
		if (event.button !== 0) return;
		event.preventDefault();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		gesture = { edge, x: event.clientX, y: event.clientY, box: { ...box } };
	}
	function change(start: typeof box, edge: string, dx: number, dy: number) {
		const minWidth = Math.min(240, window.innerWidth);
		const minHeight = Math.min(260, window.innerHeight);
		let { x, y, width, height } = start;
		if (!edge) {
			x += dx;
			y += dy;
		}
		if (edge.includes('e'))
			width = Math.max(
				minWidth,
				Math.min(start.width + dx, window.innerWidth - x),
			);
		if (edge.includes('s'))
			height = Math.max(
				minHeight,
				Math.min(start.height + dy, window.innerHeight - y),
			);
		if (edge.includes('w')) {
			x = Math.max(0, Math.min(start.x + dx, start.x + start.width - minWidth));
			width = start.x + start.width - x;
		}
		if (edge.includes('n')) {
			y = Math.max(
				0,
				Math.min(start.y + dy, start.y + start.height - minHeight),
			);
			height = start.y + start.height - y;
		}
		box = { x, y, width, height };
		fit();
	}
	function move(event: PointerEvent) {
		if (gesture)
			change(
				gesture.box,
				gesture.edge,
				event.clientX - gesture.x,
				event.clientY - gesture.y,
			);
	}
	function keyboard(event: KeyboardEvent, edge = '') {
		const delta: Record<string, [number, number]> = {
			ArrowLeft: [-10, 0],
			ArrowRight: [10, 0],
			ArrowUp: [0, -10],
			ArrowDown: [0, 10],
		};
		if (delta[event.key]) {
			event.preventDefault();
			change({ ...box }, edge, ...delta[event.key]);
		}
	}
</script>

<svelte:window onresize={fit} />

{#if open}
	<div
		class="display-window"
		role="dialog"
		aria-label="Display"
		aria-modal="false"
		tabindex="-1"
		style:left={`${box.x}px`}
		style:top={`${box.y}px`}
		style:width={`${box.width}px`}
		style:height={`${box.height}px`}
	>
		<header>
			<button
				type="button"
				class="drag-handle"
				aria-label="Move Display"
				title="Drag to move; arrow keys also work"
				onpointerdown={(event) => begin(event)}
				onpointermove={move}
				onpointerup={() => (gesture = undefined)}
				onpointercancel={() => (gesture = undefined)}
				onlostpointercapture={() => (gesture = undefined)}
				onkeydown={(event) => keyboard(event)}
				>Display <span>16 × 16</span></button
			>
			<button
				type="button"
				class="delete"
				aria-label="Close Display"
				onclick={() => (open = false)}
			></button>
		</header>
		<div class="screen"><Display {memory} /></div>
		{#each edges as edge}
			<button
				type="button"
				class={`resize-handle ${edge}`}
				aria-label={`Resize Display ${edge}`}
				title="Drag to resize; arrow keys also work"
				onpointerdown={(event) => begin(event, edge)}
				onpointermove={move}
				onpointerup={() => (gesture = undefined)}
				onpointercancel={() => (gesture = undefined)}
				onlostpointercapture={() => (gesture = undefined)}
				onkeydown={(event) => keyboard(event, edge)}
			></button>
		{/each}
	</div>
{/if}

<style>
	.display-window {
		position: fixed;
		z-index: 35;
		display: flex;
		flex-direction: column;
		background: var(--bulma-scheme-main);
		color: var(--bulma-text);
		border: 1px solid var(--bulma-border);
		border-radius: var(--bulma-radius);
		box-shadow: 0 12px 40px #0006;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.8rem 0 0;
		flex: 0 0 42px;
		border-bottom: 1px solid var(--bulma-border);
		background: var(--bulma-scheme-main-bis);
		border-radius: var(--bulma-radius) var(--bulma-radius) 0 0;
	}
	.drag-handle {
		flex: 1;
		align-self: stretch;
		text-align: left;
		font: inherit;
		font-weight: 600;
		color: inherit;
		border: 0;
		background: transparent;
		padding: 0 1rem;
		cursor: move;
		touch-action: none;
		user-select: none;
	}
	.drag-handle span {
		margin-left: 0.5rem;
		font-size: 0.75rem;
		font-weight: 400;
		opacity: 0.65;
	}
	.screen {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}
	.resize-handle {
		position: absolute;
		border: 0;
		padding: 0;
		background: transparent;
		touch-action: none;
		z-index: 1;
	}
	.resize-handle:focus-visible {
		outline: 2px solid var(--bulma-link);
	}
	.n,
	.s {
		left: 10px;
		right: 10px;
		height: 8px;
		cursor: ns-resize;
	}
	.n {
		top: -4px;
	}
	.s {
		bottom: -4px;
	}
	.e,
	.w {
		top: 10px;
		bottom: 10px;
		width: 8px;
		cursor: ew-resize;
	}
	.e {
		right: -4px;
	}
	.w {
		left: -4px;
	}
	.ne,
	.nw,
	.se,
	.sw {
		width: 14px;
		height: 14px;
	}
	.ne,
	.sw {
		cursor: nesw-resize;
	}
	.nw,
	.se {
		cursor: nwse-resize;
	}
	.ne {
		right: -4px;
		top: -4px;
	}
	.nw {
		left: -4px;
		top: -4px;
	}
	.se {
		right: -4px;
		bottom: -4px;
		border-right: 2px solid var(--bulma-text);
		border-bottom: 2px solid var(--bulma-text);
		border-radius: 0 0 3px 0;
		opacity: 0.5;
	}
	.sw {
		left: -4px;
		bottom: -4px;
	}
</style>
