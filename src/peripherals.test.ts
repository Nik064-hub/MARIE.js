import { describe, expect, test } from 'vitest';
import { MarieSim, assemble } from './marie';
import { ExtendedHardware } from './peripherals';

function program(code: string, input: () => number | null = () => null) {
	const result = assemble(code);
	if (!result.success) throw new Error(JSON.stringify(result.errors));
	const sim = new MarieSim(input);
	sim.load(result.assembled);
	return sim;
}

async function instruction(sim: MarieSim) {
	for (let i = 0; i < 40; i++) {
		if ((await sim.microStep())?.type === 'step-end') return;
	}
	throw new Error('Instruction did not finish');
}

describe('extended peripherals', () => {
	test('exposes opt-in hardware without reserving classic RAM', () => {
		const sim = new MarieSim(() => null);
		expect(sim.hardware).toBeDefined();
		expect(sim.hardware.enabled).toBe(false);
		sim.memory[0xef7] = 123;
		sim.memory[0xeff] = 456;
		expect(sim.memory[0xef7]).toBe(123);
		expect(sim.memory[0xeff]).toBe(456);
	});
	test('async INPUT returns FFFF without waiting and keeps the ordinary callback untouched', async () => {
		let calls = 0;
		const sim = program('Input\nHalt', () => {
			calls++;
			return null;
		});
		sim.configureHardware(false, true);
		await sim.run();
		expect(sim.registers.AC).toBe(65535);
		expect(calls).toBe(0);
	});
	test('traditional INPUT waits for a callback value', async () => {
		let input: number | null = null;
		const sim = program('Input\nHalt', () => input);
		for (let i = 0; i < 20; i++) await sim.microStep();
		expect(sim.halted).toBe(false);
		expect(sim.registers.PC).toBe(1);
		input = 42;
		await sim.run();
		expect(sim.registers.AC).toBe(42);
	});
	test('direct and indirect CPU reads/writes reach MMIO and preserve display RAM', async () => {
		const sim = program(
			'Load Period\nStoreI TimerPtr\nLoad 0EF7\nStore 0F00\nLoad Selected\nStore 0EFA\nLoadI StatePtr\nHalt\nPeriod, DEC 40\nTimerPtr, HEX EF7\nStatePtr, HEX EFB\nSelected, DEC 7',
		);
		sim.configureHardware(true, false);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		await sim.run();
		expect(sim.hardware.period).toBe(40);
		expect(sim.registers.AC & 1).toBe(1);
		expect(sim.memory[0xf00]).toBe(40);
		expect(sim.state().memory[0xef7]).toBe(40);
	});
	test('MMIO peeking never consumes events and writes to read-only registers do not mutate RAM', () => {
		const sim = new MarieSim(() => null);
		sim.memory[0xefd] = 99;
		sim.configureHardware(true, false);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		expect(sim.memory[0xefd]).toBe(1);
		expect(sim.state().memory[0xefd]).toBe(1);
		sim.memory[0xefd] = 9;
		expect(sim.memory[0xefd]).toBe(1);
		sim.memory[0xef8] = 1;
		expect(sim.memory[0xefd]).toBe(0);
		sim.configureHardware(false, false);
		expect(sim.memory[0xefd]).toBe(99);
	});
	test('rewinding INPUT restores its independent character queue and resumes deterministically', async () => {
		const sim = program('Input\nHalt');
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		await instruction(sim);
		expect(sim.registers.AC).toBe(100);
		expect(sim.hardware.keyboard.events).toHaveLength(1);
		sim.stepBack();
		expect(sim.hardware.rewinding).toBe(true);
		await instruction(sim);
		expect(sim.registers.AC).toBe(100);
		expect(sim.hardware.keyboard.readInput()).toBe(-1);
	});
	test('rewinding CPU ACK restores physical event order independently of INPUT', async () => {
		const sim = program('Load One\nStore 0EF8\nHalt\nOne, DEC 1');
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		sim.hardware.keyboard.keyUp({ key: 'd', code: 'KeyD' });
		await sim.step();
		await sim.step();
		expect(sim.hardware.keyboard.events).toHaveLength(1);
		sim.stepBack();
		expect(sim.hardware.keyboard.events).toEqual([
			{ code: 7, type: 1 },
			{ code: 7, type: 2 },
		]);
		expect(sim.hardware.keyboard.readInput()).toBe(100);
	});
	test('rewinding debugger MMIO edits restores the device instead of backing RAM', () => {
		const sim = new MarieSim(() => null);
		sim.configureHardware(true, false);
		sim.memory[0xef7] = 40;
		expect(sim.hardware.period).toBe(40);
		sim.microStepBack();
		expect(sim.hardware.period).toBe(300);
	});
	test.each([
		['period', '0EF7', 300, 40],
		['count', '0EFE', 0, 40],
		['select', '0EFA', 0, 40],
	] as const)(
		'rewinding CPU Store restores the previous %s register',
		async (_name, address, previous, next) => {
			const sim = program(`Load Value\nStore ${address}\nHalt\nValue, DEC 40`);
			sim.configureHardware(true, false);
			await instruction(sim);
			await instruction(sim);
			expect(sim.memory[parseInt(address, 16)]).toBe(next);
			sim.stepBack();
			expect(sim.memory[parseInt(address, 16)]).toBe(previous);
			expect(sim.hardware.running).toBe(false);
			await instruction(sim);
			expect(sim.memory[parseInt(address, 16)]).toBe(next);
		},
	);
	test('CPU Store to read-only MMIO and its undo preserve the backing classic memory', async () => {
		const sim = program('Load Nine\nStore 0EFD\nHalt\nNine, DEC 9');
		sim.memory[0xefd] = 99;
		sim.configureHardware(true, false);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		await instruction(sim);
		await instruction(sim);
		expect(sim.memory[0xefd]).toBe(1);
		sim.stepBack();
		expect(sim.memory[0xefd]).toBe(1);
		sim.configureHardware(false, false);
		expect(sim.memory[0xefd]).toBe(99);
	});
	test('HALT freezes a running hardware timer', async () => {
		const sim = program('Halt');
		sim.configureHardware(true, false);
		sim.hardware.setRunning(true);
		expect(sim.hardware.running).toBe(true);
		await sim.run();
		expect(sim.halted).toBe(true);
		expect(sim.hardware.running).toBe(false);
	});
	test('changing hardware mode clears history and input state while preserving classic RAM', async () => {
		const sim = program('Clear\nHalt');
		sim.memory[0xef7] = 17;
		sim.memory[0xeff] = 23;
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		await instruction(sim);
		expect(sim.log.length).toBeGreaterThan(0);
		sim.configureHardware(false, false);
		expect(sim.log).toHaveLength(0);
		expect(sim.hardware.keyboard.pressed).toEqual([]);
		expect(sim.hardware.keyboard.events).toEqual([]);
		expect(sim.hardware.keyboard.readInput()).toBe(-1);
		expect(sim.memory[0xef7]).toBe(17);
		expect(sim.memory[0xeff]).toBe(23);
		expect(sim.microStepBack()).toBeNull();
	});
	test('MMIO event consumption and async INPUT stay independent with simultaneous held keys', async () => {
		const sim = program(
			'Input\nStore First\nLoad One\nStore 0EF8\nInput\nStore Second\nHalt\nFirst, DEC 0\nSecond, DEC 0\nOne, DEC 1',
		);
		sim.configureHardware(true, true);
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		sim.hardware.keyboard.keyDown({ key: ' ', code: 'Space' });
		await sim.run();
		expect(sim.memory[7]).toBe(100);
		expect(sim.memory[8]).toBe(32);
		expect(sim.hardware.keyboard.pressed).toEqual([7, 44]);
		expect(sim.memory[0xefd]).toBe(1);
		expect(sim.memory[0xeff]).toBe(44);
		expect(sim.hardware.keyboard.readInput()).toBe(-1);
	});
	test('reset clears peripheral queues and timer while preserving configuration and display', () => {
		const sim = new MarieSim(() => null);
		sim.configureHardware(true, true);
		sim.memory[0xef7] = 40;
		sim.memory[0xefe] = 19;
		sim.memory[0xf00] = 0x7fff;
		sim.hardware.keyboard.keyDown({ key: 'd', code: 'KeyD' });
		sim.resetRegisters();
		expect(sim.hardware.enabled).toBe(true);
		expect(sim.hardware.asyncInput).toBe(true);
		expect(sim.hardware.count).toBe(0);
		expect(sim.hardware.period).toBe(40);
		expect(sim.hardware.keyboard.events).toHaveLength(0);
		expect(sim.memory[0xf00]).toBe(0x7fff);
	});
	test('rewinding the first instruction never dereferences an empty log', async () => {
		const sim = program('Clear\nHalt');
		await sim.step();
		expect(() => sim.stepBack()).not.toThrow();
		expect(sim.registers.PC).toBe(0);
	});
});

describe('virtual timer', () => {
	function clock() {
		let time = 0;
		const hardware = new ExtendedHardware(() => time);
		hardware.configure(true, false);
		return {
			hardware,
			advance: (ms: number) => {
				time += ms;
			},
		};
	}
	test('uses elapsed monotonic time rather than CPU access frequency', () => {
		const { hardware, advance } = clock();
		hardware.setRunning(true);
		advance(900);
		expect(hardware.count).toBe(3);
		for (let i = 0; i < 100; i++) hardware.read(0xefe);
		expect(hardware.count).toBe(3);
	});
	test('freezes fractional elapsed time during pause without accumulating paused time', () => {
		const { hardware, advance } = clock();
		hardware.setRunning(true);
		advance(450);
		hardware.setRunning(false);
		advance(10000);
		expect(hardware.count).toBe(1);
		hardware.setRunning(true);
		advance(150);
		expect(hardware.count).toBe(2);
	});
	test('period writes settle elapsed ticks then restart the fractional phase', () => {
		const { hardware, advance } = clock();
		hardware.setRunning(true);
		advance(450);
		hardware.write(0xef7, 50);
		expect(hardware.count).toBe(1);
		advance(100);
		expect(hardware.count).toBe(3);
		hardware.write(0xef7, 0);
		expect(hardware.period).toBe(1);
	});
	test('wraps at 65536 ticks and allows counter reset', () => {
		const { hardware, advance } = clock();
		hardware.write(0xef7, 1);
		hardware.write(0xefe, 65535);
		hardware.setRunning(true);
		advance(2);
		expect(hardware.count).toBe(1);
		hardware.write(0xefe, 0);
		expect(hardware.count).toBe(0);
	});
	test('snapshot restore is frozen and never catches up time elapsed in rewind', () => {
		const { hardware, advance } = clock();
		hardware.setRunning(true);
		advance(450);
		const snapshot = hardware.snapshot();
		advance(900);
		expect(hardware.count).toBe(4);
		hardware.restore(snapshot);
		advance(10000);
		expect(hardware.count).toBe(1);
		expect(hardware.running).toBe(false);
		hardware.setRunning(true);
		advance(150);
		expect(hardware.count).toBe(2);
	});
});
