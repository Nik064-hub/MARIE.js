import { KeyboardController } from './keyboard';

export const MMIO_START = 0xef7;
export const MMIO_END = 0xeff;

export type HardwareSnapshot = {
	keyboard: ReturnType<KeyboardController['snapshot']>;
	period: number;
	count: number;
	phase: number;
};

/** Optional devices; disabled addresses remain ordinary RAM. */
export class ExtendedHardware {
	readonly keyboard = new KeyboardController();
	enabled = false;
	asyncInput = false;
	private _period = 300;
	private _count = 0;
	private phase = 0;
	private sampledAt = 0;
	private _running = false;
	private _rewinding = false;

	constructor(private readonly now: () => number = () => performance.now()) {}

	get running() {
		return this._running;
	}
	get rewinding() {
		return this._rewinding;
	}
	get period() {
		return this._period;
	}
	set period(value: number) {
		if (!Number.isFinite(value)) return;
		this.settle();
		this._period = Math.max(1, Math.min(65535, Math.floor(value)));
		this.phase = 0;
	}
	get count() {
		this.settle();
		return this._count;
	}

	configure(enabled: boolean, asyncInput: boolean) {
		if (this.enabled === enabled && this.asyncInput === asyncInput) return;
		this.enabled = enabled;
		this.asyncInput = asyncInput;
		this.reset();
	}

	setRunning(running: boolean) {
		this.settle();
		this._running = running && this.enabled;
		this.sampledAt = this.now();
		if (running) this._rewinding = false;
	}

	/** Reverse execution is an observation barrier, not an external-event replay. */
	beginRewind() {
		this.setRunning(false);
		this._rewinding = true;
	}

	beginForward() {
		this._rewinding = false;
	}

	private settle() {
		const current = this.now();
		if (this._running) {
			const elapsed = this.phase + Math.max(0, current - this.sampledAt);
			const ticks = Math.floor(elapsed / this._period);
			this._count = (this._count + ticks) % 65536;
			this.phase = elapsed % this._period;
		}
		this.sampledAt = current;
	}

	input() {
		return this.keyboard.readInput();
	}

	read(address: number): number | undefined {
		if (!this.enabled) return undefined;
		switch (address) {
			case 0xef7:
				return this.period;
			case 0xef8:
				return 0;
			case 0xef9:
				return this.keyboard.status | (this.keyboard.modifiers << 8);
			case 0xefa:
				return this.keyboard.select;
			case 0xefb:
				return this.keyboard.selectedState;
			case 0xefc:
				return this.keyboard.events[0]?.type ?? 0;
			case 0xefd:
				return this.keyboard.events.length;
			case 0xefe:
				return this.count;
			case 0xeff:
				return this.keyboard.events[0]?.code ?? 0;
			default:
				return undefined;
		}
	}

	write(address: number, value: number): boolean {
		if (!this.enabled || address < MMIO_START || address > MMIO_END)
			return false;
		value &= 0xffff;
		switch (address) {
			case 0xef7:
				this.period = value;
				break;
			case 0xef8:
				this.keyboard.acknowledge(value);
				break;
			case 0xefa:
				this.keyboard.select = value;
				break;
			case 0xefe:
				this.settle();
				this._count = value;
				this.phase = 0;
				break;
		}
		return true;
	}

	reset() {
		this._running = false;
		this._rewinding = false;
		this._count = 0;
		this.phase = 0;
		this.sampledAt = this.now();
		this.keyboard.clear();
	}

	snapshot(): HardwareSnapshot {
		this.settle();
		return {
			keyboard: this.keyboard.snapshot(),
			period: this._period,
			count: this._count,
			phase: this.phase,
		};
	}

	restore(snapshot: HardwareSnapshot) {
		// Held keys are the live physical state, not part of the CPU history.
		this.keyboard.restore(snapshot.keyboard, true);
		this._period = snapshot.period;
		this._count = snapshot.count;
		this.phase = snapshot.phase;
		this._running = false;
		this._rewinding = true;
		this.sampledAt = this.now();
	}
}
