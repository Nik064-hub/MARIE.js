import { expect, test } from 'vitest';
import { virtualKeySignal } from './virtual-keyboard';
import { KeyboardController } from './keyboard';

test('virtual Shift generates the same shifted digit and punctuation as the US layout', () => {
	expect(virtualKeySignal('Digit1', '1', 1).key).toBe('!');
	expect(virtualKeySignal('Slash', '/', 1).key).toBe('?');
	expect(virtualKeySignal('KeyD', 'd', 1).key).toBe('D');
});

test('virtual Latin-1 and Ctrl combinations reach the common keyboard controller', () => {
	const keyboard = new KeyboardController();
	keyboard.keyDown(virtualKeySignal('Semicolon', 'ñ', 1));
	expect(keyboard.readInput()).toBe(209);
	keyboard.keyDown(virtualKeySignal('KeyD', 'd', 2));
	expect(keyboard.readInput()).toBe(4);
});
