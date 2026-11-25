import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { MarieSim, assemble } from './marie';

function diagnostic(name: string) {
	const source = readFileSync(
		new URL(`../public/diagnostics/${name}.mas`, import.meta.url),
		'utf8',
	);
	const result = assemble(source);
	if (!result.success) throw new Error(JSON.stringify(result.errors));
	const sim = new MarieSim(() => null);
	sim.load(result.assembled);
	return sim;
}

async function finish(sim: MarieSim) {
	for (let i = 0; i < 1000 && !sim.halted; i++) await sim.microStep();
	expect(sim.halted).toBe(true);
	return sim.log.flatMap((action) =>
		action.type === 'output' ? [action.value] : [],
	);
}

describe('shipped assembly peripheral diagnostics', () => {
	test('async diagnostic completes without a key and reports FFFF', async () => {
		const sim = diagnostic('async-input');
		sim.configureHardware(false, true);
		expect(await finish(sim)).toEqual([65535]);
	});
	test('async diagnostic reports one arrow key without consuming physical events', async () => {
		const sim = diagnostic('async-input');
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ code: 'ArrowUp', key: 'ArrowUp' });
		expect(await finish(sim)).toEqual([256]);
		expect(sim.hardware.keyboard.events.length).toBe(1);
	});
	test('keyboard diagnostic selects D, observes event order and acknowledges one physical event', async () => {
		const sim = diagnostic('keyboard-mmio');
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ code: 'KeyD', key: 'd' });
		expect(await finish(sim)).toEqual([1, 1, 7, 1, 0]);
		expect(sim.hardware.keyboard.readInput()).toBe(100);
	});
	test('timer diagnostic continuously copies MMIO ticks into the original display', async () => {
		const sim = diagnostic('timer-display');
		sim.configureHardware(true, false);
		sim.memory[0xefe] = 42;
		for (let i = 0; i < 3; i++) await sim.step();
		expect(sim.memory[0xf00]).toBe(42);
		sim.memory[0xefe] = 43;
		for (let i = 0; i < 3; i++) await sim.step();
		expect(sim.memory[0xf00]).toBe(43);
		expect(sim.halted).toBe(false);
	});
	test('display diagnostic works in classic mode and changes only its intended pixel', async () => {
		const sim = diagnostic('display-pixel');
		await finish(sim);
		expect(sim.hardware.enabled).toBe(false);
		expect(sim.memory[0xf00]).toBe(0x7fff);
		expect(sim.memory[0xf01]).toBe(0);
		expect(sim.memory[0xfff]).toBe(0);
	});
});
