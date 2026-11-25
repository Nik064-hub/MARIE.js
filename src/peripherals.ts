import { KeyboardController } from './keyboard';

/** Memory-mapped registers of the optional hardware (see docs/extended-hardware.md). */
export const MMIO = {
	/** Timer period in ms (read/write). */
	PERIOD: 0xef7,
	/** Keyboard acknowledge (write only): 1 pops one event, 2 clears overflow, 4 clears the release latch. */
	ACK: 0xef8,
	/** Keyboard status flags in the low byte, modifier bits in the high byte. */
	STATUS: 0xef9,
	/** USB HID code of the key observed through SELECTED_STATE (read/write). */
	SELECT: 0xefa,
	/** Bit 0: selected key is held; bit 1: it was released since the last ACK 4. */
	SELECTED_STATE: 0xefb,
	/** Type of the oldest pending physical event: 1 key down, 2 key up, 0 none. */
	EVENT_TYPE: 0xefc,
	/** Number of pending physical events. */
	EVENT_COUNT: 0xefd,
	/** Timer ticks, wrapping at 65536 (read/write). */
	COUNT: 0xefe,
	/** USB HID code of the oldest pending physical event, 0 if none. */
	EVENT_CODE: 0xeff,
} as const;
export const MMIO_START = MMIO.PERIOD;
export const MMIO_END = MMIO.EVENT_CODE;

export const DEFAULT_TIMER_PERIOD = 300;
export const MIN_TIMER_PERIOD = 1;
export const MAX_TIMER_PERIOD = 65535;

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
	private _period = DEFAULT_TIMER_PERIOD;
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
		this._period = Math.max(
			MIN_TIMER_PERIOD,
			Math.min(MAX_TIMER_PERIOD, Math.floor(value)),
		);
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
			case MMIO.PERIOD:
				return this.period;
			case MMIO.ACK:
				return 0;
			case MMIO.STATUS:
				return this.keyboard.status | (this.keyboard.modifiers << 8);
			case MMIO.SELECT:
				return this.keyboard.select;
			case MMIO.SELECTED_STATE:
				return this.keyboard.selectedState;
			case MMIO.EVENT_TYPE:
				return this.keyboard.events[0]?.type ?? 0;
			case MMIO.EVENT_COUNT:
				return this.keyboard.events.length;
			case MMIO.COUNT:
				return this.count;
			case MMIO.EVENT_CODE:
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
			case MMIO.PERIOD:
				this.period = value;
				break;
			case MMIO.ACK:
				this.keyboard.acknowledge(value);
				break;
			case MMIO.SELECT:
				this.keyboard.select = value;
				break;
			case MMIO.COUNT:
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
