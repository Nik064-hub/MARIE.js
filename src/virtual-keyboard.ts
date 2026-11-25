import type { KeySignal } from './keyboard';

/** US symbols plus direct Latin-1 keys; physical IDs remain USB HID. */
const shifted: Record<string, string> = {
	'1': '!',
	'2': '@',
	'3': '#',
	'4': '$',
	'5': '%',
	'6': '^',
	'7': '&',
	'8': '*',
	'9': '(',
	'0': ')',
	'-': '_',
	'=': '+',
	'[': '{',
	']': '}',
	'\\': '|',
	';': ':',
	"'": '"',
	'`': '~',
	',': '<',
	'.': '>',
	'/': '?',
};

export function virtualKeySignal(
	code: string,
	key: string,
	modifiers: number,
): KeySignal {
	if (modifiers & 1 && key.length === 1)
		key = shifted[key] ?? key.toUpperCase();
	return {
		code,
		key,
		shiftKey: !!(modifiers & 1),
		ctrlKey: !!(modifiers & 2),
		altKey: !!(modifiers & 4),
		metaKey: !!(modifiers & 8),
		getModifierState: (name) => name === 'AltGraph' && !!(modifiers & 16),
	};
}
