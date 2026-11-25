<script lang="ts">
	import { rgb } from '../utils';

	let { memory }: { memory: number[] } = $props();

	function getColor(memory: number[], i: number, j: number) {
		const address = 0xf00 + 16 * i + j;
		const value = memory[address];
		return rgb(value);
	}
</script>

<div class="display">
	<div>16x16 display, 0xF00-0xFFF. Pixel: R[14-10] G[9-5] B[4-0]</div>
	<div class="screen">
		<div class="pixels">
			{#each [...Array(16)].map((_, i) => i) as i}
				<div class="row">
					{#each [...Array(16)].map((_, j) => j) as j}
						<div
							class="pixel"
							style:background-color={getColor(memory, i, j)}
						></div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.display {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 0.75rem;
		padding: 1rem;
	}
	.screen {
		flex: 1;
		min-height: 0;
		container-type: size;
		display: grid;
		place-items: center;
	}

	.pixels {
		display: grid;
		grid-template-columns: repeat(16, 1fr);
		grid-template-rows: repeat(16, 1fr);
		gap: 1px;
		padding: 1px;
		background-color: var(--bulma-border);
		width: min(100cqw, 100cqh);
		height: min(100cqw, 100cqh);
	}

	.row {
		display: contents;
	}

	.pixel {
		min-width: 0;
		min-height: 0;
	}
</style>
