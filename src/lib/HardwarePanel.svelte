<script lang="ts">
	import { onMount } from 'svelte';
	import type { ExtendedHardware } from '../peripherals';
	import {
		keyDefinitions,
		type KeyDefinition,
		type KeySignal,
	} from '../keyboard';
	import { virtualKeySignal } from '../virtual-keyboard';

	let {
		hardware,
		enabled,
		active,
		onEnabled,
		onPeriod,
	}: {
		hardware: ExtendedHardware;
		enabled: boolean;
		active: boolean;
		onEnabled: (value: boolean) => void;
		onPeriod: (value: number) => void;
	} = $props();
	let root: HTMLDivElement;
	let capture = $state<HTMLButtonElement>();
	let pressed = $state<number[]>([]);
	let events = $state<{ code: number; type: number }[]>([]);
	let inputCount = $state(0);
	let status = $state(0);
	let modifiers = $state(0);
	let ticks = $state(0);
	let currentPeriod = $state(300);
	let timerRunning = $state(false);
	let rewinding = $state(false);
	let hold = $state(false);
	let focused = $state(false);
	let virtualOpen = $state(false);
	const sources = new Map<string, Set<string>>();
	const pointers = new Map<number, KeyDefinition>();
	const latinKeys: KeyDefinition[] = ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü'].map(
		(key, i) => ({
			key,
			label: key,
			code: ['Semicolon', 'KeyA', 'KeyE', 'KeyI', 'KeyO', 'KeyU', 'KeyU'][i],
			id: [51, 4, 8, 12, 18, 24, 24][i],
		}),
	);

	function refresh() {
		pressed = [...hardware.keyboard.pressed];
		for (const code of sources.keys()) {
			const id = keyDefinitions.find((key) => key.code === code)?.id;
			if (id === undefined || !pressed.includes(id)) sources.delete(code);
		}
		events = [...hardware.keyboard.events];
		inputCount = hardware.keyboard.snapshot().input.length;
		status = hardware.keyboard.status;
		modifiers = hardware.keyboard.modifiers;
		ticks = hardware.count;
		currentPeriod = hardware.period;
		timerRunning = hardware.running;
		rewinding = hardware.rewinding;
	}
	function clear() {
		sources.clear();
		pointers.clear();
		// The selector belongs to the CPU, not to the capture session.
		const selected = hardware.keyboard.select;
		hardware.keyboard.clear();
		hardware.keyboard.select = selected;
		refresh();
	}
	function send(event: KeySignal, down: boolean, source: string) {
		if (!active || hardware.rewinding) return;
		const held = sources.get(event.code) ?? new Set<string>();
		if (down) {
			if (event.repeat || held.has(source)) return;
			if (!held.size) hardware.keyboard.keyDown(event);
			held.add(source);
			sources.set(event.code, held);
		} else {
			held.delete(source);
			if (!held.size) {
				hardware.keyboard.keyUp(event);
				sources.delete(event.code);
			}
		}
		refresh();
	}
	function physical(event: KeyboardEvent, down: boolean) {
		if (!active || hardware.rewinding || event.isComposing) return;
		// Only the explicit capture surface receives keyboard input.
		if (event.target !== capture) return;
		if (keyDefinitions.some((key) => key.code === event.code))
			event.preventDefault();
		send(event, down, 'physical');
	}
	function virtualSignal(key: KeyDefinition): KeySignal {
		return virtualKeySignal(key.code, key.key, hardware.keyboard.modifiers);
	}
	function pointerDown(event: PointerEvent, key: KeyDefinition) {
		if (!active || hardware.rewinding) return;
		event.preventDefault();
		capture?.focus();
		const button = event.currentTarget as HTMLButtonElement;
		button.setPointerCapture(event.pointerId);
		if (hold) {
			send(
				virtualSignal(key),
				!sources.get(key.code)?.has('latched'),
				'latched',
			);
		} else {
			pointers.set(event.pointerId, key);
			send(virtualSignal(key), true, `pointer:${event.pointerId}`);
		}
	}
	function pointerUp(event: PointerEvent) {
		const key = pointers.get(event.pointerId);
		if (key) send(virtualSignal(key), false, `pointer:${event.pointerId}`);
		pointers.delete(event.pointerId);
	}
	function focusOut(event: FocusEvent) {
		if (
			event.target === capture ||
			!root.contains(event.relatedTarget as Node | null)
		) {
			focused = false;
			clear();
		}
	}
	onMount(() => {
		refresh();
		const timer = setInterval(refresh, 50);
		return () => {
			clearInterval(timer);
			clear();
		};
	});
	$effect(() => {
		if (!active) clear();
	});
</script>

<svelte:window onblur={clear} />
<svelte:document
	onvisibilitychange={() => {
		if (document.hidden) clear();
	}}
/>

<div class="hardware p-4" bind:this={root} onfocusout={focusOut}>
	<label class="checkbox mb-3">
		<input
			type="checkbox"
			checked={enabled}
			onchange={(e) => onEnabled(e.currentTarget.checked)}
		/>
		Extended Hardware Mode
	</label>
	<p class="is-size-7 mb-3">
		MMIO opcional EF7–EFF. Display original F00–FFF. Selecciona Input asíncrono
		para leer teclas sin detener la CPU.
	</p>
	{#if active}
		<button
			bind:this={capture}
			type="button"
			class="button capture is-fullwidth mb-2"
			class:is-info={focused}
			onfocus={() => {
				focused = true;
				if (!hardware.rewinding) clear();
			}}
			onkeydown={(e) => physical(e, true)}
			onkeyup={(e) => physical(e, false)}
		>
			{focused
				? 'Teclado capturando — haz clic fuera para salir'
				: 'Capturar teclado'}
		</button>
		<p class="is-size-7 mb-2">
			INPUT: −1 sin tecla; ↑256 ↓257 ←258 →259. Captura limitada a esta zona;
			algunos atajos los reserva el sistema.
		</p>
		<div class="stats is-size-7" aria-live="off">
			<span
				>INPUT pendientes: <b data-testid="input-count">{inputCount}</b></span
			>
			<span
				>Eventos físicos: <b data-testid="event-count">{events.length}</b></span
			>
			<span>Modificadores: {modifiers}</span>
			<span>Overflow: {status & 12 ? 'Sí (se descartó el nuevo)' : 'No'}</span>
		</div>
		<p class="is-size-7 mt-2" data-testid="pressed-keys">
			Presionadas: {pressed
				.map((id) => keyDefinitions.find((k) => k.id === id)?.label ?? id)
				.join(', ') || 'ninguna'}
		</p>
		<p class="is-size-7" data-testid="event-preview">
			Siguiente: {events[0]
				? `${events[0].code} / ${events[0].type === 1 ? 'down' : 'up'}`
				: 'ninguno'}
		</p>
		{#if rewinding}<p class="has-text-warning is-size-7">
				Historial congelado. Continúa o avanza un paso para aceptar eventos
				nuevos.
			</p>{/if}
		{#if enabled}
			<div class="timer mt-3">
				<label class="is-size-7"
					>Periodo (ms)
					<input
						class="input is-small"
						type="number"
						min="1"
						max="65535"
						value={currentPeriod}
						aria-label="Periodo del temporizador"
						onchange={(e) => {
							const n = e.currentTarget.valueAsNumber;
							if (Number.isFinite(n))
								onPeriod(Math.max(1, Math.min(65535, Math.floor(n))));
						}}
					/>
				</label>
				<span class="is-size-7"
					>Ticks: <b data-testid="timer-count">{ticks}</b> · {timerRunning
						? 'En marcha'
						: 'Congelado'}</span
				>
			</div>
		{/if}
		<button class="button is-small mt-3" onclick={clear}
			>Limpiar teclado y colas</button
		>
		<details class="mt-3" bind:open={virtualOpen}>
			<summary>Teclado virtual</summary>
			<p class="is-size-7">
				Símbolos US + caracteres Latin-1 directos. Shift modifica letras y
				símbolos; Ctrl genera controles ASCII. Los caracteres acentuados usan la
				posición de su letra base.
			</p>
			<label class="checkbox is-size-7 my-2"
				><input type="checkbox" bind:checked={hold} onchange={clear} /> Enclavar teclas
				(clic mantiene / clic libera)</label
			>
			<div class="keys">
				{#each [...keyDefinitions, ...latinKeys] as key}
					<button
						type="button"
						class="button is-small"
						class:is-info={pressed.includes(key.id)}
						aria-label={`Tecla ${key.label}`}
						aria-pressed={pressed.includes(key.id)}
						title={`USB HID ${key.id} · ${key.code}`}
						onpointerdown={(e) => pointerDown(e, key)}
						onpointerup={pointerUp}
						onpointercancel={pointerUp}
						onlostpointercapture={pointerUp}
						onclick={(e) => {
							if (e.detail === 0) {
								send(virtualSignal(key), true, 'accessible');
								send(virtualSignal(key), false, 'accessible');
							}
						}}
					>
						{key.label}
					</button>
				{/each}
			</div>
		</details>
		<details class="mt-3 is-size-7">
			<summary>Registros MMIO</summary>
			<p>
				EF7 periodo RW · EF8 ACK W (1 consumir, 2 limpiar overflow, 4 limpiar
				liberada) · EF9 estado R · EFA selector HID RW · EFB tecla R · EFC tipo
				R · EFD eventos R · EFE ticks RW · EFF código HID R.
			</p>
			<p>
				KEY_STATE: bit0 presionada, bit1 liberada. KEY_STATUS: bits0–3
				colas/overflow, byte alto modificadores. En modo clásico estas
				direcciones son RAM.
			</p>
		</details>
	{:else}
		<p class="is-size-7">
			Modo clásico. Activa el hardware o selecciona Input asíncrono para
			habilitar el teclado.
		</p>
	{/if}
</div>

<style>
	.hardware {
		overflow: auto;
	}
	.capture {
		white-space: normal;
		height: auto;
		min-height: 2.5rem;
	}
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
	}
	.timer {
		display: flex;
		align-items: end;
		gap: 1rem;
	}
	.timer input {
		width: 8rem;
	}
	.keys {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
		gap: 0.3rem;
	}
	.keys button {
		touch-action: none;
		padding: 0.25rem;
		overflow: hidden;
	}
	summary {
		cursor: pointer;
	}
</style>
