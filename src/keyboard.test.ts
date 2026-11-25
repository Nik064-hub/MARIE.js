import { describe, expect, test } from 'vitest';
import { KeyboardController, keyDefinitions } from './keyboard';

describe('extended keyboard', () => {
	test('empty input is non-blocking and keeps ASCII NUL distinct', () => {
		const keyboard = new KeyboardController();
		expect(keyboard.readInput()).toBe(-1);
		keyboard.keyDown({ code: 'Space', key: '\0' });
		expect(keyboard.readInput()).toBe(0);
		expect(keyboard.readInput()).toBe(-1);
	});
	test('logical characters preserve case, Latin-1 and FIFO while physical events are independent', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'KeyA', key: 'A' });
		keyboard.keyUp({ code: 'KeyA', key: 'A' });
		keyboard.keyDown({ code: 'Semicolon', key: 'ñ' });
		keyboard.keyUp({ code: 'Semicolon', key: 'ñ' });
		keyboard.keyDown({ code: 'Quote', key: 'é' });
		expect([
			keyboard.readInput(),
			keyboard.readInput(),
			keyboard.readInput(),
		]).toEqual([65, 241, 233]);
		expect(keyboard.events).toEqual([
			{ code: 4, type: 1 },
			{ code: 4, type: 2 },
			{ code: 51, type: 1 },
			{ code: 51, type: 2 },
			{ code: 52, type: 1 },
		]);
		keyboard.acknowledge(1);
		expect(keyboard.events[0]).toEqual({ code: 4, type: 2 });
	});
	test.each([
		['ArrowUp', 'ArrowUp', 256],
		['ArrowDown', 'ArrowDown', 257],
		['ArrowLeft', 'ArrowLeft', 258],
		['ArrowRight', 'ArrowRight', 259],
		['Backspace', 'Backspace', 8],
		['Tab', 'Tab', 9],
		['Enter', 'Enter', 13],
		['Escape', 'Escape', 27],
		['Space', ' ', 32],
		['Delete', 'Delete', 127],
		['Numpad1', '1', 49],
		['F12', 'F12', 581],
	])('encodes %s as %i', (code, key, expected) => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code, key });
		expect(keyboard.readInput()).toBe(expected);
	});
	test('simultaneous keys and release latches work without OS repeat events', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'KeyD', key: 'd' });
		keyboard.keyDown({ code: 'Space', key: ' ' });
		keyboard.keyDown({ code: 'KeyD', key: 'd', repeat: true });
		keyboard.keyDown({ code: 'Space', key: ' ' });
		expect(keyboard.pressed).toEqual([7, 44]);
		expect(keyboard.events.length).toBe(2);
		keyboard.select = 7;
		expect(keyboard.selectedState).toBe(1);
		keyboard.keyUp({ code: 'KeyD', key: 'd' });
		expect(keyboard.selectedState).toBe(2);
		keyboard.acknowledge(4);
		expect(keyboard.selectedState).toBe(0);
		expect(keyboard.pressed).toEqual([44]);
	});
	test('modifiers derive from physical keys and preserve combinations', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'ShiftLeft', key: 'Shift' });
		keyboard.keyDown({ code: 'ControlRight', key: 'Control' });
		keyboard.keyDown({
			code: 'AltRight',
			key: 'AltGraph',
			getModifierState: (name) => name === 'AltGraph',
		});
		expect(keyboard.modifiers).toBe(23);
		keyboard.keyUp({ code: 'ShiftLeft', key: 'Shift' });
		expect(keyboard.modifiers).toBe(22);
		keyboard.keyUp({ code: 'AltRight', key: 'AltGraph' });
		expect(keyboard.modifiers).toBe(2);
	});
	test('bounded queues drop newest and report independent sticky overflow flags', () => {
		const keyboard = new KeyboardController();
		for (let i = 0; i < 65; i++) {
			keyboard.keyDown({ code: 'KeyA', key: 'a' });
			keyboard.keyUp({ code: 'KeyA', key: 'a' });
		}
		expect(keyboard.events.length).toBe(64);
		expect(keyboard.status).toBe(15);
		for (let i = 0; i < 64; i++) expect(keyboard.readInput()).toBe(97);
		expect(keyboard.readInput()).toBe(-1);
		expect(keyboard.status).toBe(14);
		keyboard.acknowledge(2);
		expect(keyboard.status).toBe(2);
	});
	test('snapshot and restore preserve consumed events, held keys and overflow state by value', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'ArrowLeft', key: 'ArrowLeft' });
		keyboard.select = 80;
		const snapshot = keyboard.snapshot();
		keyboard.readInput();
		keyboard.acknowledge(1);
		keyboard.clear();
		keyboard.restore(snapshot);
		expect(keyboard.selectedState).toBe(1);
		expect(keyboard.events).toEqual([{ code: 80, type: 1 }]);
		expect(keyboard.readInput()).toBe(258);
		keyboard.restore(snapshot);
		expect(keyboard.readInput()).toBe(258);
	});
	test('clear releases all keys and drops pending queues and latches', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'ShiftLeft', key: 'Shift' });
		keyboard.keyDown({ code: 'KeyA', key: 'A' });
		keyboard.clear();
		expect(keyboard.modifiers).toBe(0);
		expect(keyboard.pressed).toEqual([]);
		expect(keyboard.events).toEqual([]);
		expect(keyboard.status).toBe(0);
		expect(keyboard.readInput()).toBe(-1);
	});
	test('table has stable unique physical USB HID identifiers', () => {
		expect(new Set(keyDefinitions.map((key) => key.id)).size).toBe(
			keyDefinitions.length,
		);
		expect(new Set(keyDefinitions.map((key) => key.code)).size).toBe(
			keyDefinitions.length,
		);
		expect(keyDefinitions.find((key) => key.code === 'KeyA')?.id).toBe(4);
		expect(keyDefinitions.find((key) => key.code === 'ArrowUp')?.id).toBe(82);
		expect(keyDefinitions.find((key) => key.code === 'NumpadEnter')?.id).toBe(
			88,
		);
	});
	test('Ctrl characters and AltGr text use distinct logical codes', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'ControlLeft', key: 'Control' });
		expect(keyboard.readInput()).toBe(736);
		keyboard.keyDown({ code: 'KeyA', key: 'a', ctrlKey: true });
		expect(keyboard.readInput()).toBe(1);
		keyboard.keyDown({ code: 'AltRight', key: 'AltGraph' });
		expect(keyboard.readInput()).toBe(742);
		keyboard.keyDown({ code: 'Digit2', key: '@', ctrlKey: true, altKey: true });
		expect(keyboard.readInput()).toBe(64);
	});
	test('non Latin-1 characters and dead composition keys never impersonate special keys', () => {
		const keyboard = new KeyboardController();
		keyboard.keyDown({ code: 'KeyA', key: 'Ω' });
		keyboard.keyDown({ code: 'KeyB', key: '😀' });
		keyboard.keyDown({ code: 'Quote', key: 'Dead' });
		expect(keyboard.readInput()).toBe(-1);
		expect(keyboard.events.length).toBe(3);
	});
});
