import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadProject, saveProject, type Project } from './project';

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
	};
}

const base: Project = {
	code: 'Halt',
	breakpoints: {},
	pointers: {},
	inputs: [],
	outputMode: 'dec',
};

describe('project persistence', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', memoryStorage());
		vi.stubGlobal('sessionStorage', memoryStorage());
	});
	afterEach(() => vi.unstubAllGlobals());

	test('extended hardware settings and the async input survive a save and load', () => {
		saveProject('p', {
			...base,
			inputs: [{ format: 'async', consumed: '', queued: '' }],
			extendedHardware: true,
			timerPeriod: 40,
		});
		const loaded = loadProject('p');
		expect(loaded.extendedHardware).toBe(true);
		expect(loaded.timerPeriod).toBe(40);
		expect(loaded.inputs).toEqual([
			{ format: 'async', consumed: '', queued: '' },
		]);
	});
	test('projects saved by the original MARIE load with the hardware disabled', () => {
		localStorage.setItem(
			'marie.projects',
			JSON.stringify([{ ...base, _id: 'old', _timestamp: 1 }]),
		);
		const loaded = loadProject('old');
		expect(loaded.extendedHardware).toBeUndefined();
		expect(loaded.timerPeriod).toBeUndefined();
	});
	test('text queues are rewound on load while the async entry stays untouched', () => {
		saveProject('p', {
			...base,
			inputs: [
				{ format: 'dec', consumed: '5', queued: '6' },
				{ format: 'async', consumed: '', queued: '' },
				{ format: 'unicode', consumed: 'ab', queued: 'c' },
			],
			extendedHardware: true,
		});
		expect(loadProject('p').inputs).toEqual([
			{ format: 'dec', consumed: '', queued: '5\n6' },
			{ format: 'async', consumed: '', queued: '' },
			{ format: 'unicode', consumed: '', queued: 'abc' },
		]);
	});
});
