/** Logical characters and physical USB HID usages intentionally use separate namespaces. */
export interface KeySignal {
	key: string;
	code: string;
	repeat?: boolean;
	shiftKey?: boolean;
	ctrlKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
	getModifierState?: (key: string) => boolean;
}

export interface KeyDefinition {
	code: string;
	id: number;
	label: string;
	key: string;
}

export const KEY_QUEUE_CAPACITY = 64;

const fixedKeys: [string, number, string, string?][] = [
	['Enter', 40, 'Enter'],
	['Escape', 41, 'Escape'],
	['Backspace', 42, 'Backspace'],
	['Tab', 43, 'Tab'],
	['Space', 44, 'Space', ' '],
	['Minus', 45, '-'],
	['Equal', 46, '='],
	['BracketLeft', 47, '['],
	['BracketRight', 48, ']'],
	['Backslash', 49, '\\'],
	['Semicolon', 51, ';'],
	['Quote', 52, "'"],
	['Backquote', 53, '`'],
	['Comma', 54, ','],
	['Period', 55, '.'],
	['Slash', 56, '/'],
	['CapsLock', 57, 'CapsLock'],
	['PrintScreen', 70, 'PrintScreen'],
	['ScrollLock', 71, 'ScrollLock'],
	['Pause', 72, 'Pause'],
	['Insert', 73, 'Insert'],
	['Home', 74, 'Home'],
	['PageUp', 75, 'PageUp'],
	['Delete', 76, 'Delete'],
	['End', 77, 'End'],
	['PageDown', 78, 'PageDown'],
	['ArrowRight', 79, '→', 'ArrowRight'],
	['ArrowLeft', 80, '←', 'ArrowLeft'],
	['ArrowDown', 81, '↓', 'ArrowDown'],
	['ArrowUp', 82, '↑', 'ArrowUp'],
	['NumLock', 83, 'NumLock'],
	['NumpadDivide', 84, 'Num /', '/'],
	['NumpadMultiply', 85, 'Num *', '*'],
	['NumpadSubtract', 86, 'Num -', '-'],
	['NumpadAdd', 87, 'Num +', '+'],
	['NumpadEnter', 88, 'Num Enter', 'Enter'],
	['Numpad0', 98, 'Num 0', '0'],
	['NumpadDecimal', 99, 'Num .', '.'],
	['IntlBackslash', 100, 'Intl \\', '\\'],
	['ContextMenu', 101, 'Menu', 'ContextMenu'],
	['NumpadEqual', 103, 'Num =', '='],
	['IntlRo', 135, 'Intl Ro'],
	['IntlYen', 137, 'Intl Yen'],
	['ControlLeft', 224, 'Ctrl L', 'Control'],
	['ShiftLeft', 225, 'Shift L', 'Shift'],
	['AltLeft', 226, 'Alt L', 'Alt'],
	['MetaLeft', 227, 'Meta L', 'Meta'],
	['ControlRight', 228, 'Ctrl R', 'Control'],
	['ShiftRight', 229, 'Shift R', 'Shift'],
	['AltRight', 230, 'AltGr', 'AltGraph'],
	['MetaRight', 231, 'Meta R', 'Meta'],
];

export const keyDefinitions: readonly KeyDefinition[] = [
	...Array.from({ length: 26 }, (_, i) => ({
		code: `Key${String.fromCharCode(65 + i)}`,
		id: 4 + i,
		label: String.fromCharCode(65 + i),
		key: String.fromCharCode(97 + i),
	})),
	...Array.from({ length: 10 }, (_, i) => ({
		code: `Digit${(i + 1) % 10}`,
		id: 30 + i,
		label: String((i + 1) % 10),
		key: String((i + 1) % 10),
	})),
	...Array.from({ length: 12 }, (_, i) => ({
		code: `F${i + 1}`,
		id: 58 + i,
		label: `F${i + 1}`,
		key: `F${i + 1}`,
	})),
	...Array.from({ length: 9 }, (_, i) => ({
		code: `Numpad${i + 1}`,
		id: 89 + i,
		label: `Num ${i + 1}`,
		key: String(i + 1),
	})),
	...fixedKeys.map(([code, id, label, key]) => ({
		code,
		id,
		label,
		key: key ?? label,
	})),
];

const byCode = new Map(
	keyDefinitions.map((definition) => [definition.code, definition]),
);
const specialKeyNames = new Set(
	keyDefinitions
		.filter((definition) => definition.key.length > 1)
		.map((definition) => definition.key),
);
const logicalCodes: Record<string, number> = {
	Backspace: 8,
	Tab: 9,
	Enter: 13,
	Escape: 27,
	Delete: 127,
	ArrowUp: 256,
	ArrowDown: 257,
	ArrowLeft: 258,
	ArrowRight: 259,
};

export interface PhysicalKeyEvent {
	code: number;
	/** 1 = keydown; 2 = keyup */
	type: number;
}

export interface KeyboardSnapshot {
	input: number[];
	events: PhysicalKeyEvent[];
	pressed: number[];
	released: number[];
	select: number;
	overflow: number;
	altGraph: boolean;
}

export class KeyboardController {
	select = 0;
	private inputQueue: number[] = [];
	private eventQueue: PhysicalKeyEvent[] = [];
	private down = new Set<number>();
	private released = new Set<number>();
	private overflow = 0;
	private altGraph = false;

	get events(): readonly PhysicalKeyEvent[] {
		return this.eventQueue;
	}
	get pressed(): readonly number[] {
		return [...this.down];
	}
	get modifiers(): number {
		return (
			(this.down.has(225) || this.down.has(229) ? 1 : 0) |
			(this.down.has(224) || this.down.has(228) ? 2 : 0) |
			(this.down.has(226) || this.down.has(230) ? 4 : 0) |
			(this.down.has(227) || this.down.has(231) ? 8 : 0) |
			(this.altGraph && this.down.has(230) ? 16 : 0)
		);
	}
	get status(): number {
		return (
			(this.inputQueue.length ? 1 : 0) |
			(this.eventQueue.length ? 2 : 0) |
			this.overflow
		);
	}
	get selectedState(): number {
		return (
			(this.down.has(this.select) ? 1 : 0) |
			(this.released.has(this.select) ? 2 : 0)
		);
	}

	keyDown(event: KeySignal): boolean {
		const definition = byCode.get(event.code);
		if (!definition || event.repeat || this.down.has(definition.id))
			return false;
		this.down.add(definition.id);
		if (definition.id === 230) {
			this.altGraph =
				event.key === 'AltGraph' || !!event.getModifierState?.('AltGraph');
		}
		this.pushEvent({ code: definition.id, type: 1 });
		let input = logicalCodes[event.key];
		if (
			input === undefined &&
			event.key.length === 1 &&
			event.key.charCodeAt(0) <= 255
		) {
			input = event.key.charCodeAt(0);
			// Ctrl+ASCII provides control characters; AltGr text must remain text.
			if (
				(event.ctrlKey || this.modifiers & 2) &&
				!(event.altKey || this.modifiers & 4)
			) {
				const upper = event.key.toUpperCase().charCodeAt(0);
				if (upper >= 64 && upper <= 95) input = upper & 31;
			}
		} else if (input === undefined && specialKeyNames.has(event.key)) {
			input = 512 + definition.id;
		}
		if (input !== undefined) {
			if (this.inputQueue.length < KEY_QUEUE_CAPACITY)
				this.inputQueue.push(input);
			else this.overflow |= 4;
		}
		return true;
	}

	keyUp(event: KeySignal): boolean {
		const definition = byCode.get(event.code);
		if (!definition || !this.down.delete(definition.id)) return false;
		if (definition.id === 230) this.altGraph = false;
		this.released.add(definition.id);
		this.pushEvent({ code: definition.id, type: 2 });
		return true;
	}

	readInput(): number {
		return this.inputQueue.shift() ?? -1;
	}

	acknowledge(value: number): void {
		if (value & 1) this.eventQueue.shift();
		if (value & 2) this.overflow = 0;
		if (value & 4) this.released.delete(this.select);
	}

	clear(): void {
		this.inputQueue = [];
		this.eventQueue = [];
		this.down.clear();
		this.released.clear();
		this.overflow = 0;
		this.altGraph = false;
		this.select = 0;
	}

	snapshot(): KeyboardSnapshot {
		return {
			input: [...this.inputQueue],
			events: this.eventQueue.map((event) => ({ ...event })),
			pressed: [...this.down],
			released: [...this.released],
			select: this.select,
			overflow: this.overflow,
			altGraph: this.altGraph,
		};
	}

	restore(snapshot: KeyboardSnapshot): void {
		this.inputQueue = [...snapshot.input];
		this.eventQueue = snapshot.events.map((event) => ({ ...event }));
		this.down = new Set(snapshot.pressed);
		this.released = new Set(snapshot.released);
		this.select = snapshot.select;
		this.overflow = snapshot.overflow;
		this.altGraph = snapshot.altGraph;
	}

	private pushEvent(event: PhysicalKeyEvent): void {
		if (this.eventQueue.length < KEY_QUEUE_CAPACITY)
			this.eventQueue.push(event);
		else this.overflow |= 8;
	}
}
