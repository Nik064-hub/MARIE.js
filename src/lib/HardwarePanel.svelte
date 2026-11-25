<script lang="ts">
	import { onMount } from 'svelte';
	import {
		DEFAULT_TIMER_PERIOD,
		MAX_TIMER_PERIOD,
		MIN_TIMER_PERIOD,
		type ExtendedHardware,
	} from '../peripherals';
	import {
		keyDefinitions,
		type KeyDefinition,
		type KeyboardSnapshot,
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
	// Raw: these point into the keyboard's shared immutable snapshot.
	let pressed = $state.raw<number[]>([]);
	let events = $state.raw<{ code: number; type: number }[]>([]);
	let inputCount = $state(0);
	let status = $state(0);
	let modifiers = $state(0);
	let ticks = $state(0);
	let currentPeriod = $state(DEFAULT_TIMER_PERIOD);
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

	let shownKeyboard: KeyboardSnapshot | undefined;
	function refresh() {
		// The keyboard returns the same snapshot object until something changes,
		// so an idle panel only reads the timer and assigns nothing else.
		const keyboard = hardware.keyboard.snapshot();
		if (keyboard !== shownKeyboard) {
			shownKeyboard = keyboard;
			pressed = keyboard.pressed;
			for (const code of sources.keys()) {
				const id = keyDefinitions.find((key) => key.code === code)?.id;
				if (id === undefined || !pressed.includes(id)) sources.delete(code);
			}
			events = keyboard.events;
			inputCount = keyboard.input.length;
			status = hardware.keyboard.status;
			modifiers = hardware.keyboard.modifiers;
		}
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
		Optional MMIO EF7–EFF. Original display F00–FFF. Select Asynchronous input to read keys without stopping the CPU.
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
				? 'Capturing keyboard — click outside to stop'
				: 'Capture keyboard'}
		</button>
		<p class="is-size-7 mb-2">
			INPUT: −1 sin tecla; ↑256 ↓257 ←258 →259. Captura limitada a esta zona;
			algunos atajos los reserva el sistema.
		</p>
		<div class="stats is-size-7" aria-live="off">
			<span
				>Pending INPUT: <b data-testid="input-count">{inputCount}</b></span
			>
			<span
				>Physical events: <b data-testid="event-count">{events.length}</b></span
			>
			<span>Modifiers: {modifiers}</span>
			<span>Overflow: {status & 12 ? 'Yes (newest dropped)' : 'No'}</span>
		</div>
		<p class="is-size-7 mt-2" data-testid="pressed-keys">
			Pressed: {pressed
				.map((id) => keyDefinitions.find((k) => k.id === id)?.label ?? id)
				.join(', ') || 'none'}
		</p>
		<p class="is-size-7" data-testid="event-preview">
			Next: {events[0]
				? `${events[0].code} / ${events[0].type === 1 ? 'down' : 'up'}`
				: 'none'}
		</p>
		{#if rewinding}<p class="has-text-warning is-size-7">
				History frozen. Continue or take a step to accept new events.
			</p>{/if}
		{#if enabled}
			<div class="timer mt-3">
				<label class="is-size-7"
					>Period (ms)
					<input
						class="input is-small"
						type="number"
						min={MIN_TIMER_PERIOD}
						max={MAX_TIMER_PERIOD}
						value={currentPeriod}
						aria-label="Timer period"
						onchange={(e) => {
							const n = e.currentTarget.valueAsNumber;
							if (Number.isFinite(n))
								onPeriod(Math.max(
										MIN_TIMER_PERIOD,
										Math.min(MAX_TIMER_PERIOD, Math.floor(n)),
									));
						}}
					/>
				</label>
				<span class="is-size-7"
					>Ticks: <b data-testid="timer-count">{ticks}</b> · {timerRunning
						? 'Running'
						: 'Frozen'}</span
				>
			</div>
		{/if}
		<button class="button is-small mt-3" onclick={clear}
			>Clear keyboard and queues</button
		>
		<details class="mt-3" bind:open={virtualOpen}>
			<summary>Virtual keyboard</summary>
			<p class="is-size-7">
				US symbols + direct Latin-1 characters. Shift changes letters and symbols; Ctrl generates ASCII controls. Accented characters use the position of their base letter.
			</p>
			<label class="checkbox is-size-7 my-2"
				><input type="checkbox" bind:checked={hold} onchange={clear} /> Latch keys (click holds / click releases)</label
			>
			<div class="keys">
				{#each [...keyDefinitions, ...latinKeys] as key}
					<button
						type="button"
						class="button is-small"
						class:is-info={pressed.includes(key.id)}
						aria-label={`Key ${key.label}`}
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
			<summary>MMIO registers</summary>
			<p>
				EF7 period RW · EF8 ACK W (1 consume, 2 clear overflow, 4 clear released) · EF9 status R · EFA HID selector RW · EFB key state R · EFC event type R · EFD event count R · EFE ticks RW · EFF HID code R.
			</p>
			<p>
				KEY_STATE: bit0 held, bit1 released. KEY_STATUS: bits0–3 queues/overflow, high byte modifiers. In classic mode these addresses are RAM.
			</p>
		</details>
	{:else}
		<p class="is-size-7">
			Classic mode. Enable the hardware or select Asynchronous input to enable the keyboard.
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
