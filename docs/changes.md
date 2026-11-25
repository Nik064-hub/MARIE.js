# Changes relative to the original MARIE.js

This document lists everything this project changes with respect to the original simulator.

| Item | Value |
|---|---|
| Original repository | <https://github.com/MARIE-js/MARIE.js> (MIT License) |
| Base commit | `a22d884` |
| This fork | <https://github.com/Nik064-hub/MARIE.js> |
| Compared against | `e40f397` (`git diff a22d884..e40f397`) |
| Scope of this inventory | 36 files: 26 added, 10 modified, 0 removed (before this documentation commit) |

MARIE.js is a browser simulator of the MARIE architecture from *The Essentials of Computer Organization and Architecture* (Null and Lobur). Everything not listed here (assembler, CPU model, editor, memory and register views, examples, build setup) is inherited unchanged from MARIE.js. The original README is preserved as [README.upstream.md](../README.upstream.md).

> Some files under `docs/` and the comments in the source code are still written in Spanish. They are being translated in later work.

## 1. Motivation and limitations of the original

The original simulator is well suited to classic exercises, but it cannot run interactive programs such as games:

| Limitation of the original | Consequence |
|---|---|
| `INPUT` blocks until the user types a value | A program cannot poll the keyboard while the CPU keeps running. |
| Keyboard input is text only | No key-up events, no held keys, no modifiers, no arrow or function keys. |
| No clock | A program cannot measure time independently of CPU speed. |
| The 16 × 16 display is a fixed-size panel | It cannot be detached or resized. |
| The fast mode freezes the page for about 200 ms per block | Poor responsiveness while a program runs. |

## 2. Summary of contributions

| Area | Contribution |
|---|---|
| Asynchronous input | An optional `INPUT` mode that never waits: it returns the next queued key, or `-1` (`FFFF`) if there is none. |
| Universal keyboard | A physical keyboard layer with USB HID codes, modifiers, simultaneous keys and a virtual on-screen keyboard. |
| Extended Hardware Mode | Optional memory-mapped registers (`EF7`–`EFF`) for the keyboard and a timer. No new opcodes. |
| Display | Resizable display and an optional detached display window. |
| Fast execution | Fast mode runs in slices of at most 8 ms and yields to the browser. |
| Execution history | Hardware state is snapshotted and restored when stepping back. |
| Performance | Shared keyboard snapshots and a cheaper `HardwarePanel` refresh. |
| Launchers | `iniciar-marie.cmd`, `.sh`, `.command`. |
| Tests | 6 new unit-test files and 3 browser test scripts. |
| Portability | Line-ending rules in `.gitattributes`; browser tests no longer depend on a personal path. |

All extensions are **opt-in**. With them off, EF7–EFF are ordinary RAM and `INPUT` waits for a value as in the original.

## 3. File inventory

Change types: **A** added, **M** modified, **D** deleted. No file was deleted.

### 3.1 Source code

| File | Change | Original responsibility | Modification | Technical justification |
|---|---|---|---|---|
| `src/keyboard.ts` | A | — | `KeyboardController`: logical-character FIFO, physical event FIFO (both capacity 64), held keys, release latch, key selector, overflow flags, AltGr; key table of USB HID codes; immutable cached snapshots | Separates text input from physical key state and makes it restorable |
| `src/peripherals.ts` | A | — | `ExtendedHardware`: MMIO read/write for `EF7`–`EFF`, virtual timer, snapshot/restore; `MMIO` register map and timer-limit constants | Keeps device logic outside the CPU class |
| `src/virtual-keyboard.ts` | A | — | `virtualKeySignal()` turns on-screen key presses into the same signals as the physical keyboard | One code path for physical and virtual keys |
| `src/marie.ts` | M | `MarieSim`: CPU, registers, memory, microsteps, undo log | Memory access routed through hardware; `INPUT` can use the keyboard queue; snapshots stored in the log; `enableLog` setter clears the log; `configureHardware()` | Integrates devices without changing instruction algorithms |
| `src/project.ts` | M | Project save/load types | `InputItem.format` accepts `'async'`; optional `extendedHardware` and `timerPeriod` | Persist the new settings |
| `src/App.svelte` | M | Application shell | Hardware panel and detached display wiring, keyboard capture, restore of hardware settings from a project | UI integration |
| `src/lib/Simulator.svelte` | M | Run / step / fast-mode controls | Execution-session counter that cancels stale loops; hardware clock started/stopped with execution; fast mode in 8 ms slices; `invalidate()`; step-back disabled while running | Responsiveness and correct timer behavior |
| `src/lib/InputsPanel.svelte` | M | Input queues panel | New "Input asíncrono" format and its explanation; safe focus | Choose the async mode |
| `src/lib/Display.svelte` | M | 16 × 16 pixel display | Layout scales to the container (CSS grid) instead of fixed 1 rem pixels | Resizable and detachable display |
| `src/lib/DisplayWindow.svelte` | A | — | Floating/detached display window | Play while the editor stays visible |
| `src/lib/HardwarePanel.svelte` | A | — | Panel for mode selection, timer period, keyboard capture zone, virtual keyboard, event and key lists | Control and observe the devices |

### 3.2 Tests

| File | Change | Content |
|---|---|---|
| `src/keyboard.test.ts` | A | Keyboard controller: codes, modifiers, queues, overflow, shared snapshots |
| `src/peripherals.test.ts` | A | MMIO, timer, snapshots, rewind and forward, phantom-key regression, timer limits, long polling |
| `src/diagnostics.test.ts` | A | Assembles and runs the diagnostic programs |
| `src/history-boundary.test.ts` | A | Log reset when configuration or logging changes |
| `src/virtual-keyboard.test.ts` | A | Virtual key signals |
| `src/project.test.ts` | A | Persistence of the new project fields |
| `tests/browser-display.mjs`, `tests/browser-hardware.mjs` | A | Browser scenarios (see section 9) |
| `tests/launch-browser.mjs` | A | Finds Playwright and launches the browser for the two scripts above |

The original `src/marie.test.ts` is unchanged and still passes. The complete suite has 103 tests in 7 files.

### 3.3 Configuration, launchers and documentation

| File | Change | Modification |
|---|---|---|
| `package.json` | M | One new script, `test:browser`. No dependency was added or changed. |
| `package-lock.json` | — | Unchanged. |
| `.gitattributes` | M | `*.mas`, `*.sh`, `*.command` forced to LF; `*.cmd` forced to CRLF. |
| `.gitignore` | M | Ignores screenshots written by browser tests (`/tests/*.png`). |
| `iniciar-marie.cmd` / `.sh` / `.command` | A | Startup launchers (section 8). |
| `public/diagnostics/*.mas` | A | Four diagnostic programs: `async-input`, `display-pixel`, `keyboard-mmio`, `timer-display`. |
| `docs/extended-hardware.md`, `docs/keyboard-codes.md` | A | Hardware manual and key-code table (Spanish for now). |
| `docs/development/` | A | Historical development plan, design spec and validation record (moved here from `docs/superpowers/` and `docs/`). |
| `README.md` | M | Rewritten in English. |
| `README.upstream.md` | A | Original README at `a22d884`. |
| `docs/changes.md` | A | This file. |

## 4. Important new and modified functions

| Function | File | Previous behavior | New behavior | Purpose |
|---|---|---|---|---|
| `KeyboardController.keyDown / keyUp` | `keyboard.ts` | did not exist | Updates held keys, event queue and (for key-down) the character queue; ignores auto-repeat | Universal keyboard |
| `KeyboardController.readInput` | `keyboard.ts` | did not exist | Pops the next character, or returns `-1` | Async `INPUT` |
| `KeyboardController.snapshot / restore` | `keyboard.ts` | did not exist | Immutable shared snapshot; `restore(s, keepPhysical)` can leave held keys untouched | Reversible history |
| `ExtendedHardware.read / write` | `peripherals.ts` | did not exist | Maps addresses `EF7`–`EFF` to devices, only when the mode is enabled | MMIO |
| `ExtendedHardware.settle` | `peripherals.ts` | did not exist | Advances the timer from the real clock while running | Virtual timer |
| `MarieSim.readAddress / writeAddress` | `marie.ts` | direct array access | Try the hardware first, fall back to RAM | MMIO in `LOAD`, `STORE` and indirect access |
| `MarieSim.captureHardware` | `marie.ts` | did not exist | Snapshots device state before an MMIO access or `INPUT` | Undo of device effects |
| `MarieSim.configureHardware` | `marie.ts` | did not exist | Applies mode changes and starts a new history epoch | Avoid mixing incompatible histories |
| `MarieSim.enableLog` (setter) | `marie.ts` | plain property | Clears the log when toggled | Old actions cannot undo state produced without a log |
| `MarieSim.state()` | `marie.ts` | copies RAM | Also overlays the device registers on `EF7`–`EFF` | Show registers in the memory view |
| `MarieSim.microStepBack / stepBack` | `marie.ts` | restore RAM and registers | Also restore hardware; skip RAM restore for MMIO writes | Reversible devices |
| `INPUT` microstep | `marie.ts` | waits on the input callback | Reads the keyboard queue when async mode is on | Non-blocking input |
| `Simulator` run loops | `Simulator.svelte` | one loop with 200 ms blocks | Session id cancels stale loops; fast mode checks an 8 ms budget | Responsiveness |

## 5. Features

### 5.1 Asynchronous keyboard input
Selecting **Input asíncrono** in the Inputs panel makes every `INPUT` return immediately. If a character is queued it is consumed; otherwise the result is `-1`. Text queues from the traditional mode are kept so the user can switch back. Special keys use codes 256–259 (arrows), 8, 9, 13, 27, 127, and `512 + HID id` for other named keys.

### 5.2 Universal keyboard
The browser reports physical keys; the controller maps them to USB HID usage codes, tracks held keys, modifiers (including AltGr), and keeps two independent queues: logical characters (for `INPUT`) and physical key events (down/up). Both queues hold 64 entries; overflow sets status flags. A virtual keyboard offers latching keys for devices without a physical keyboard. Full code tables are in [keyboard-codes.md](keyboard-codes.md).

### 5.3 Extended Hardware Mode and MMIO
When enabled, nine words are reserved (all other RAM, and the display at `F00`–`FFF`, are unchanged). Details and programming guide: [extended-hardware.md](extended-hardware.md).

| Address | Name | Access | Meaning |
|---|---|---|---|
| `EF7` | `PERIOD` | R/W | Timer period in ms (1–65535) |
| `EF8` | `ACK` | W | 1: pop an event, 2: clear overflow, 4: clear release latch |
| `EF9` | `STATUS` | R | Status flags (low byte), modifiers (high byte) |
| `EFA` | `SELECT` | R/W | Key observed through `EFB` |
| `EFB` | `SELECTED_STATE` | R | Bit 0 held, bit 1 released since last ACK 4 |
| `EFC` | `EVENT_TYPE` | R | Oldest event: 1 down, 2 up, 0 none |
| `EFD` | `EVENT_COUNT` | R | Pending events |
| `EFE` | `COUNT` | R/W | Timer ticks, wraps at 65536 |
| `EFF` | `EVENT_CODE` | R | HID code of the oldest event |

Writing `0` to `EF7` is intentional: the period is clamped to the range 1–65535 and `0` reads back as `1`. A write of 65536 reads back as 1.

### 5.4 Virtual timer
Time comes from `performance.now()`, not from instruction counts, so one tick lasts the same regardless of CPU speed. The timer runs only during active execution and freezes on pause, Halt, step-by-step debugging and rewind.

### 5.5 Display and detached window
The display keeps its 16 × 16 size at `F00`–`FFF` but scales to its container, and can be opened in a detached window.

### 5.6 Fast execution
The original fast mode ran blocks of 100,000 microsteps per pass and measured 214 ms per block in an earlier local test. The new loop yields every 8 ms. Fast mode does not store history (see 5.7).

### 5.7 Execution history
Device state is snapshotted at MMIO accesses and async `INPUT`, and restored when stepping back, so rewinding also rewinds the queues, key selector, release latch, overflow flags and timer. Held keys are deliberately **not** rewound: they are the live physical state (fixed in `081f05f`). While rewinding, time is frozen and external events are rejected; the history is not an event replay.

### 5.8 Keyboard snapshot optimization
Snapshots of an unchanged keyboard are shared, immutable objects instead of fresh copies (`bab7ee0`).

### 5.9 HardwarePanel optimization
The panel (refreshed every 50 ms) no longer copies queues or re-renders when the keyboard snapshot object has not changed (`70246fa`).

## 6. Performance results

These figures come from the earlier audits (04A, 04B), not from new measurements for this document.

**Conditions and limits:** one Windows 11 machine, Edge headless at 1440 × 1050, Node 24; browser CPU from Chrome DevTools Protocol metrics, memory from `node --expose-gc` on 1,000,000 microsteps with log on. Single runs or small repeats; the browser heap figures were too noisy (garbage collection) to be used as evidence. **They are not guarantees for other computers, browsers or programs.**

| Metric | Before optimization (04A) | After (04B) |
|---|---|---|
| Memory retained per log entry, loop polling an MMIO register | 199 B (≈190 MB per 1M microsteps) | 101 B (≈97 MB), about −49 % |
| Memory per entry, ordinary loop (same as original) | 99 B | 99 B |
| Time, 1M microsteps polling MMIO | 707 ms | 528–571 ms |
| Browser CPU at idle, hardware panel active and capture focused | 7.0 % | 2.9 % |
| Garbage produced at idle (5 s) | 9.6 MB | 0.5 MB |
| Fast mode throughput (log off), original / this project | — | roughly 4.2–4.9 M / 5.3–5.8 M microsteps/s (noisy) |
| Fast mode in the browser (original / this project) | 4–5 fps | 16–17 fps |
| Normal mode at maximum speed with log on | 10 fps | 10 fps (unchanged) |

A differential test compared 3,000 executions against the original engine (`a22d884`): 0 mismatches. It covers the classic instruction set only, because the original has no extended hardware.

## 7. Execution history is unbounded

In normal mode the log grows with every microstep (about 99 B each, as in the original). A long run at maximum speed can therefore consume memory without limit. The **fast mode does not store the log**, so it avoids this; use it for long-running programs and games. A history cap was evaluated and **not** implemented: `App.svelte` relies on absolute log indices, so trimming the start of the log would need changes to the reversible-execution design.

## 8. Startup launchers

| File | Platform | Behavior |
|---|---|---|
| `iniciar-marie.cmd` | Windows | Checks Node.js/npm and version, runs `npm ci` when `node_modules` is missing or older than `package-lock.json`, checks port 5173, starts Vite on `127.0.0.1:5173` with `--strictPort --open`. |
| `iniciar-marie.sh` | Linux, macOS | Same checks and command in Bash. |
| `iniciar-marie.command` | macOS (double-click) | Adds Homebrew paths, calls `iniciar-marie.sh`, keeps the window open on error. |

Validation status: Windows launcher tested end to end. The Linux and macOS scripts passed a Bash syntax check but **have not been run on real Linux or macOS systems**.

## 9. Testing improvements

| Level | Command | Notes |
|---|---|---|
| Unit | `npm run test -- --run` | 103 tests, 7 files (Vitest) |
| Types | `npm run check` | `svelte-check`, 0 errors |
| Build | `npm run build` | Vite production build |
| Browser | `npm run test:browser` | Needs Playwright, which is **not** a project dependency (see README) |

## 10. Portability improvements

- `.gitattributes` keeps `.mas`, `.sh`, `.command` as LF (the assembler rejects CRLF) and `.cmd` as CRLF.
- Browser tests locate Playwright through `PLAYWRIGHT_PACKAGE_JSON` or the project, and the browser through `MARIE_BROWSER_CHANNEL`.
- Documentation no longer requires any external workspace or tool installation.

## 11. Known limitations

| Limitation | Detail |
|---|---|
| Unbounded history | See section 7. |
| Linux and macOS | Launchers not yet run on those systems. |
| Held keys while rewinding | Not restored by design; history is not an event replay. |
| Maximum speed with log on | About 10 fps, unchanged from the original design. |
| Keyboard coverage | Not all system shortcuts, national layouts, IME or touch screens were tested; the browser may reserve some key combinations. |
| Measurements | One computer and one browser. |
| Dependencies | `npm audit` reports advisories (9 at the time of the audit) in inherited development dependencies; none were changed. |
| Language | Part of the documentation and the code comments are still in Spanish. |
