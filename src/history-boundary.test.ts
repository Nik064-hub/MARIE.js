import { expect, test } from 'vitest';
import { MarieSim, assemble } from './marie';

test('unlogged execution discards older history before it can be applied to a newer CPU state', async () => {
	const assembled = assemble('Clear\nJump 000');
	if (!assembled.success) throw new Error('Fixture must assemble');
	const sim = new MarieSim(() => null);
	sim.load(assembled.assembled);
	await sim.step();
	expect(sim.log.length).toBeGreaterThan(0);
	sim.enableLog = false;
	expect(sim.log).toHaveLength(0);
	await sim.step();
	const before = sim.state();
	expect(sim.microStepBack()).toBeNull();
	expect(sim.state()).toEqual(before);
});
