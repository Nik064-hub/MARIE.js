# Technical changes relative to the original MARIE.js (MARIE Async)

This document describes, in technical detail, everything this project changes with respect to the original simulator. It is meant for students and instructors who want to study how the extensions work. For installation see the [README](../README.md); for using the features see the [user guide](user-guide.md).

| Item                        | Value                                                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Original repository         | <https://github.com/MARIE-js/MARIE.js> (MIT License). The original README is kept as [README.upstream.md](../README.upstream.md). |
| Base commit                 | `a22d884` ("Bump the all-actions group with 5 updates")                                                                           |
| This fork                   | <https://github.com/Nik064-hub/MARIE.js>                                                                                          |
| Last functional commit      | `e40f397`. The documentation commits that follow it do not change any source file.                                                |
| How the inventory was built | `git diff --name-status a22d884..HEAD` and `git diff a22d884..HEAD -- <file>`, read file by file.                                 |

Contents: [A. Original vs. modified](#a-original-vs-modified-marie) · [B. Technologies](#b-technologies) · [C. File by file](#c-file-by-file-documentation) · [D. Function by function](#d-function-by-function-documentation) · [E. Code changes](#e-code-changes) · [F. Architecture](#f-computer-architecture) · [G. Asynchronous keyboard](#g-asynchronous-keyboard-implementation) · [H. Extended hardware](#h-extended-hardware-implementation) · [I. Performance and fixes](#i-performance-improvements-and-bug-fixes) · [J. Testing](#j-testing-and-validation) · [K. Limitations](#k-known-limitations)

## A. Original vs. modified MARIE

### A.1 Why

The original simulator is well suited to classic exercises but cannot run interactive programs such as games:

| Limitation of the original                       | Consequence                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Input` blocks until a value is typed            | A program cannot poll the keyboard while the CPU keeps running.                     |
| Input is text only                               | No key-up events, held keys, modifiers, arrows or function keys.                    |
| No clock                                         | A program cannot measure time independently of CPU speed.                           |
| The display is a fixed panel inside the side bar | It cannot be moved or resized.                                                      |
| Fast mode computes blocks of 100,000 micro-steps | The page freezes during a block (214 ms measured per block in an early local test). |

### A.2 Inventory of changed files

Verified with `git diff --name-status a22d884..HEAD`. The 36 files of the last functional commit (`e40f397`) are the contribution; later commits only reorganise documentation. Nothing from the original repository was deleted.

| Category                        |  Added | Modified | Deleted |
| ------------------------------- | -----: | -------: | ------: |
| Functional source (`src/`)      |      5 |        6 |       0 |
| Unit tests (`src/*.test.ts`)    |      6 |        0 |       0 |
| Browser test scripts (`tests/`) |      3 |        0 |       0 |
| Launchers (repository root)     |      3 |        0 |       0 |
| Diagnostic programs (`public/`) |      4 |        0 |       0 |
| Configuration                   |      0 |        3 |       0 |
| Documentation                   |      8 |        1 |       0 |
| **Total at HEAD**               | **29** |   **10** |   **0** |

**Reorganised files** (renames tracked by Git; none of these exist in the original repository):

| From                                                      | To                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `docs/superpowers/plans/2026-11-19-extended-hardware.md`  | `docs/development/plans/2026-11-19-extended-hardware.md`                                                     |
| `docs/superpowers/specs/2026-11-19-async-input-design.md` | `docs/development/specs/2026-11-19-async-input-design.md`                                                    |
| `docs/validation-2026-11-19.md`                           | `docs/development/validation-2026-11-19.md`                                                                  |
| `docs/extended-hardware.md` (Spanish)                     | `docs/development/extended-hardware.md`, consolidated into the [user guide](user-guide.md) and this document |
| `docs/keyboard-codes.md` (Spanish)                        | `docs/development/keyboard-codes.md`, consolidated into the [user guide](user-guide.md)                      |

**Documentation (not functional):** `README.md` (modified), `README.upstream.md`, `docs/user-guide.md`, `docs/changes.md`, and the five historical files under `docs/development/`. They do not affect the simulator.

### A.3 Features

| Feature                                                                                                                                                                                                                                                                                                        | Status                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Assembler, 16-bit CPU, 4096-word memory, 15 instructions, registers, micro-step engine, execution log and step-back, editor, Data Path, Instruction Set, Watch list, Output log, RTL log, Inputs (hex, decimal, octal, binary, Unicode), examples, sharing and recent projects, 16 × 16 display at `F00`–`FFF` | **Original, unchanged** |
| Asynchronous `Input`, universal keyboard, virtual keyboard, Extended Hardware Mode (MMIO `EF7`–`EFF`), virtual timer, hardware panel, floating display window, diagnostics, launchers                                                                                                                          | **Added**               |
| Fast mode (slices of 8 ms), display layout (scales to its container), step-back (restores devices), `enableLog` (clears history when toggled), project persistence (new optional fields), Inputs panel (new format), Simulator controls (session cancellation)                                                 | **Original, improved**  |

### A.4 Application identity

The application is named **MARIE Async** (subtitle _Extended Hardware Simulator_). Changes: browser title (`index.html`), npm package name `marie-async` (`package.json` and the two name fields of `package-lock.json`; no dependency changed) and a name label at the left of the top bar (`src/App.svelte`). The repository, its URLs, the logo, the licence and the credits keep their original names: `MARIE.js` always refers to the original project. The earlier local "Fork" commit `22f23f2` (kept in `backup/fork-commit`) only renamed the title to "Marie Asincrono" and the package to `marie-asincrono`; it was not merged.

## B. Technologies

Identified from `package.json`, `package-lock.json` and the source. `git diff a22d884..HEAD -- package.json` shows that the only change is one new script (`test:browser`); `package-lock.json` is unchanged, so **no dependency was added, removed or updated**.

| Technology                                                          | Purpose                                                           | Origin                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| TypeScript 5.9                                                      | Language of the simulator engine and application                  | MARIE.js                                        |
| Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)         | UI framework for every component                                  | MARIE.js                                        |
| HTML, CSS (Bulma 1.0)                                               | Layout and styling                                                | MARIE.js                                        |
| MARIE assembly (`.mas`)                                             | Language of the simulated programs                                | MARIE.js (the four diagnostic programs are new) |
| Vite 7 + `@sveltejs/vite-plugin-svelte`                             | Development server and production build (bundles with esbuild)    | MARIE.js                                        |
| CodeMirror 6 (`codemirror`, `@codemirror/*`)                        | Assembly editor                                                   | MARIE.js                                        |
| Split.js, lodash, Font Awesome, svelte-fa                           | Resizable panels, utilities (`throttle`), icons                   | MARIE.js                                        |
| Vitest 4                                                            | Unit tests                                                        | MARIE.js (more test files added here)           |
| svelte-check, `tsc` (TypeScript), Prettier + prettier-plugin-svelte | Type checking, formatting                                         | MARIE.js                                        |
| Node.js and npm                                                     | Runtime for the tools; the application itself runs in the browser | Required by MARIE.js                            |
| GitHub Actions workflow (`.github/workflows/`)                      | Build and deploy of the original project                          | MARIE.js (untouched)                            |
| Windows batch (`.cmd`) and Bash (`.sh`, `.command`)                 | Start-up launchers                                                | **This project**                                |
| Playwright (not installed by the project)                           | Optional browser tests (`npm run test:browser`)                   | **This project** (as an optional external tool) |

Needed to **run** MARIE: Node.js (20.19+, 22.12+ or 24+, as enforced by the launchers) and npm. Needed only to **develop or test**: Git, and for the browser tests Playwright plus a Chromium-based browser.

## C. File-by-file documentation

Each entry was written after reading the diff of the file.

### C.1 Functional source

| File                           | Change   | Responsibility and purpose                                                                                                          | Original behavior                                                                      | Current behavior                                                                                                                                                                                                          | Justification                                                                                                        | Related to                                                                                  |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/keyboard.ts`              | Added    | `KeyboardController` and the table of keys. Owns all keyboard state.                                                                | —                                                                                      | Two 64-entry FIFO queues (logical characters, physical events), held keys, release latch, key selector, overflow flags, AltGr, immutable snapshots.                                                                       | `Input` needs characters while MMIO needs positions, held state and events. They must be independent and restorable. | `peripherals.ts` (device wrapper), `HardwarePanel.svelte` (feeds it), `virtual-keyboard.ts` |
| `src/peripherals.ts`           | Added    | `ExtendedHardware`: MMIO map, virtual timer, snapshot/restore, enable flags.                                                        | —                                                                                      | Reads and writes of `EF7`–`EFF` are routed to the keyboard and the timer only when the mode is enabled.                                                                                                                   | Keep devices outside the CPU class; classic programs must be unaffected.                                             | `marie.ts` (calls it), `keyboard.ts` (owns one)                                             |
| `src/virtual-keyboard.ts`      | Added    | `virtualKeySignal()`: converts an on-screen key to the same `KeySignal` a physical key produces (US Shift symbols, modifier flags). | —                                                                                      | One function.                                                                                                                                                                                                             | One code path for physical and virtual keys.                                                                         | `HardwarePanel.svelte`, `keyboard.ts`                                                       |
| `src/marie.ts`                 | Modified | `MarieSim`: assembler, CPU, memory, micro-step engine, log.                                                                         | Memory accessed directly; `Input` always awaits a callback; `enableLog` a plain field. | Memory reads/writes go through `readAddress`/`writeAddress`, `Input` can use the keyboard queue, snapshots saved in the log, `state()` shows device registers. All instruction microsteps (the algorithms) are unchanged. | Integrate the devices into the original engine with the smallest possible edit.                                      | `peripherals.ts`, `App.svelte`, `Simulator.svelte`                                          |
| `src/project.ts`               | Modified | Types of saved projects.                                                                                                            | `InputItem.format` limited to the original radixes.                                    | `format` also accepts `'async'`; `Project` gains optional `extendedHardware` and `timerPeriod`.                                                                                                                           | Persist the new settings; old projects still load.                                                                   | `App.svelte`, `InputsPanel.svelte`                                                          |
| `src/App.svelte`               | Modified | Application shell.                                                                                                                  | Display inside a collapsible panel; no hardware.                                       | Imports `HardwarePanel` and `DisplayWindow`; derives `asyncInput`; calls `sim.configureHardware` in an effect; `setTimerPeriod`; the **Display** top-bar button; `reset()` also resets hardware.                          | Wire the new components to the engine and to project state.                                                          | `Simulator.svelte`, `HardwarePanel.svelte`, `DisplayWindow.svelte`                          |
| `src/lib/Simulator.svelte`     | Modified | Run, pause, step controls.                                                                                                          | One run loop; fast mode ran 100,000 micro-steps per pass.                              | Session counter (`executionId`) cancels stale loops; the hardware clock starts and stops with execution; fast mode yields every 8 ms; `invalidate()`; step-back disabled while running.                                   | Keep the timer and the loops consistent; keep the page responsive.                                                   | `marie.ts` (`sim.hardware`)                                                                 |
| `src/lib/InputsPanel.svelte`   | Modified | Input queues panel.                                                                                                                 | Five text formats.                                                                     | Adds the format **Asynchronous input** with an explanatory note; `InputItem` is now imported from `project.ts`; safe focus.                                                                                               | Choose the asynchronous mode.                                                                                        | `project.ts`, `App.svelte`                                                                  |
| `src/lib/Display.svelte`       | Modified | 16 × 16 pixel grid.                                                                                                                 | Fixed 1 rem pixels.                                                                    | CSS grid sized from its container (`min(100cqw, 100cqh)`).                                                                                                                                                                | The grid must scale inside a resizable window.                                                                       | `DisplayWindow.svelte`                                                                      |
| `src/lib/DisplayWindow.svelte` | Added    | Floating, draggable, resizable window that hosts `Display`.                                                                         | —                                                                                      | Pointer and arrow-key move/resize in 10-pixel steps, stays inside the viewport.                                                                                                                                           | Keep the display visible next to the editor.                                                                         | `Display.svelte`, `App.svelte`                                                              |
| `src/lib/HardwarePanel.svelte` | Added    | The **Extended Hardware** panel.                                                                                                    | —                                                                                      | Mode checkbox, capture button, queue statistics, timer period, virtual keyboard, MMIO summary; refreshes every 50 ms only when the keyboard snapshot changed.                                                             | Control and observe the devices.                                                                                     | `keyboard.ts`, `peripherals.ts`, `virtual-keyboard.ts`                                      |

### C.2 Tests, launchers, diagnostics, configuration

| File                                                             | Change   | Responsibility                                                                                                                    | Justification / relation                                            |
| ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/keyboard.test.ts`                                           | Added    | Controller: codes, queues, modifiers, overflow, snapshots (incl. shared snapshots).                                               | Pins the keyboard contract.                                         |
| `src/peripherals.test.ts`                                        | Added    | MMIO, timer, rewinding, phantom-key regression, address pinning, timer limits, long polling.                                      | Pins the device contract.                                           |
| `src/diagnostics.test.ts`                                        | Added    | Assembles and runs the four diagnostic programs.                                                                                  | Keeps `public/diagnostics` honest.                                  |
| `src/history-boundary.test.ts`                                   | Added    | History cleared when logging is toggled.                                                                                          | Prevents applying stale actions.                                    |
| `src/virtual-keyboard.test.ts`                                   | Added    | Virtual key signals.                                                                                                              |                                                                     |
| `src/project.test.ts`                                            | Added    | Project fields survive save/load; original projects load with hardware off.                                                       | Persistence compatibility.                                          |
| `tests/browser-display.mjs`, `tests/browser-hardware.mjs`        | Added    | Browser scenarios (see J).                                                                                                        | End-to-end checks.                                                  |
| `tests/launch-browser.mjs`                                       | Added    | Locates Playwright (`PLAYWRIGHT_PACKAGE_JSON` or the project) and starts the browser (`MARIE_BROWSER_CHANNEL`, default `msedge`). | Browser tests without a personal path.                              |
| `iniciar-marie.cmd`, `iniciar-marie.sh`, `iniciar-marie.command` | Added    | Start-up launchers (see I.7).                                                                                                     |                                                                     |
| `public/diagnostics/*.mas`                                       | Added    | `async-input`, `display-pixel`, `keyboard-mmio`, `timer-display`.                                                                 | Real assembly used by the tests and for manual checks.              |
| `package.json`                                                   | Modified | Adds the `test:browser` script.                                                                                                   | No dependency changes.                                              |
| `.gitattributes`                                                 | Modified | `*.mas`, `*.sh`, `*.command` are LF; `*.cmd` is CRLF.                                                                             | The assembler rejects CRLF; Windows batch needs CRLF even in a ZIP. |
| `.gitignore`                                                     | Modified | Ignores `/tests/*.png`.                                                                                                           | Screenshots from browser tests.                                     |

## D. Function-by-function documentation

Inherited functions are described only where they are needed to understand an extension (section F).

### D.1 `src/keyboard.ts`

| Element                                                                       | Responsibility                                                                                | Parameters / returns                                        | State it changes                                                                                 | Behavior                                                                                                                                                   | Why                                                     |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `KeySignal` (interface)                                                       | The part of a browser `KeyboardEvent` the controller needs.                                   | `key`, `code`, `repeat`, modifier flags, `getModifierState` | —                                                                                                | Lets tests and the virtual keyboard create events without a DOM.                                                                                           | Testability                                             |
| `KeyDefinition`, `keyDefinitions`                                             | Table of every supported physical key: `code` (browser name), `id` (USB HID), `label`, `key`. | —                                                           | —                                                                                                | Built from ranges (letters, digits, F-keys, keypad) plus a list of fixed keys.                                                                             | One table feeds the controller, the panel and the docs. |
| `KEY_QUEUE_CAPACITY`                                                          | Queue size, 64.                                                                               | —                                                           | —                                                                                                |                                                                                                                                                            |                                                         |
| `LEFT_CTRL` … `RIGHT_META`, `SPECIAL_KEY_BASE`                                | Named constants for modifier HID ids (224–231) and the special-key offset 512.                | —                                                           | —                                                                                                | Replaced bare numbers (commit `02a090f`).                                                                                                                  | Readability                                             |
| `logicalCodes`                                                                | Fixed logical codes: Backspace 8, Tab 9, Enter 13, Escape 27, Delete 127, arrows 256–259.     | —                                                           | —                                                                                                |                                                                                                                                                            |                                                         |
| `PhysicalKeyEvent`, `KeyboardSnapshot`                                        | Types of a queued event and of an immutable copy of the device state.                         | —                                                           | —                                                                                                |                                                                                                                                                            |                                                         |
| `KeyboardController.keyDown(event)`                                           | Press a key.                                                                                  | `KeySignal` → `boolean` (false if ignored)                  | `down`, `eventQueue`, `inputQueue`, `overflow`, `altGraph`                                       | Ignores unknown codes, `repeat`, and keys already held. Pushes a down event; computes the logical code (Section G) and pushes it.                          | Core of the keyboard                                    |
| `KeyboardController.keyUp(event)`                                             | Release a key.                                                                                | `KeySignal` → `boolean`                                     | `down`, `released`, `eventQueue`, `altGraph`                                                     | Removes the key from `down`, sets its release latch, pushes an up event. No character.                                                                     |                                                         |
| `KeyboardController.readInput()`                                              | Consume one logical character.                                                                | → code or `-1`                                              | `inputQueue`                                                                                     | `shift()` or −1.                                                                                                                                           | Non-blocking `Input`                                    |
| `KeyboardController.acknowledge(value)`                                       | MMIO `ACK`.                                                                                   | bit mask                                                    | `eventQueue`, `overflow`, `released`                                                             | 1 pops one event; 2 clears both overflow flags; 4 clears the release latch of `select`.                                                                    |                                                         |
| `KeyboardController.clear()`                                                  | Reset to a clean session.                                                                     | —                                                           | everything, including `select`                                                                   | Releases all keys without generating key-up events.                                                                                                        | Avoid stuck keys                                        |
| `KeyboardController.snapshot()`                                               | Immutable copy.                                                                               | → `KeyboardSnapshot`                                        | `cached`                                                                                         | Returns the **same object** until something changes (commit `bab7ee0`).                                                                                    | Memory and CPU saving                                   |
| `KeyboardController.restore(snapshot, keepPhysical = false)`                  | Return to a historical state.                                                                 | snapshot, flag                                              | queues, `released`, `select`, `overflow`; and, if `keepPhysical` is false, `down` and `altGraph` | With `keepPhysical = true` held keys are left as they are (commit `081f05f`).                                                                              | Fix phantom keys                                        |
| getters `select`, `events`, `pressed`, `modifiers`, `status`, `selectedState` | Read-only views used by MMIO and the panel.                                                   |                                                             |                                                                                                  | `modifiers`: bit 0 Shift, 1 Ctrl, 2 Alt, 3 Meta, 4 AltGr. `status`: bit 0 characters, 1 events, 2/3 overflow. `selectedState`: bit 0 held, bit 1 released. |                                                         |
| setter `select`                                                               | Choose the observed key.                                                                      | number                                                      | `_select`, `cached`                                                                              | Invalidates the cached snapshot.                                                                                                                           |                                                         |

### D.2 `src/peripherals.ts`

| Element                                                                    | Responsibility                                               | Parameters / returns                                           | State it changes                                     | Behavior                                                                                                 | Why                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `MMIO` (const object)                                                      | The nine register addresses `PERIOD` EF7 … `EVENT_CODE` EFF. | —                                                              | —                                                    | `as const`; a test pins the values.                                                                      | Named addresses                                  |
| `MMIO_START`, `MMIO_END`                                                   | `EF7`, `EFF`.                                                |                                                                |                                                      | Used by `marie.ts`.                                                                                      |                                                  |
| `DEFAULT_TIMER_PERIOD` 300, `MIN_TIMER_PERIOD` 1, `MAX_TIMER_PERIOD` 65535 | Timer limits.                                                |                                                                |                                                      |                                                                                                          |                                                  |
| `HardwareSnapshot`                                                         | Keyboard snapshot + `period`, `count`, `phase`.              |                                                                |                                                      |                                                                                                          |                                                  |
| `ExtendedHardware` (class)                                                 | The optional devices.                                        | constructor takes a clock function (default `performance.now`) |                                                      | Disabled addresses stay RAM.                                                                             | Injectable clock makes the timer testable        |
| `configure(enabled, asyncInput)`                                           | Turn features on/off.                                        |                                                                | `enabled`, `asyncInput`, then `reset()`              | No-op if unchanged.                                                                                      |                                                  |
| `setRunning(running)`                                                      | Start/stop the clock.                                        |                                                                | `_running`, `sampledAt`                              | Settles elapsed time first; never running when disabled.                                                 |                                                  |
| `beginRewind()` / `beginForward()`                                         | Mark rewinding on/off.                                       |                                                                | `_rewinding`                                         | `beginRewind` also stops the clock.                                                                      | Freeze time while stepping back                  |
| `settle()` (private)                                                       | Convert elapsed time to ticks.                               |                                                                | `_count`, `phase`, `sampledAt`                       | `ticks = floor((phase + elapsed) / period)`; counter wraps at 65536.                                     | Time from the real clock, not instruction counts |
| `period` (get/set)                                                         | EF7.                                                         |                                                                | `_period`, `phase`                                   | Setter ignores non-finite values, floors, clamps to 1–65535, restarts the phase.                         |                                                  |
| `count` (getter)                                                           | EFE read.                                                    |                                                                | settles                                              |                                                                                                          |                                                  |
| `input()`                                                                  | Asynchronous `Input`.                                        | → code or −1                                                   | queue                                                | Delegates to `keyboard.readInput()`.                                                                     |                                                  |
| `read(address)`                                                            | MMIO read.                                                   | → value or `undefined`                                         | none (except `settle`)                               | `undefined` if disabled or outside the map.                                                              | Pure reads                                       |
| `write(address, value)`                                                    | MMIO write.                                                  | → `true` if handled                                            | depends on the register                              | Masks to 16 bits; only `PERIOD`, `ACK`, `SELECT`, `COUNT` act; other registers are accepted and ignored. |                                                  |
| `reset()`                                                                  | Restart devices.                                             |                                                                | clock stopped, count 0, phase 0, keyboard cleared    | Keeps the period.                                                                                        |                                                  |
| `snapshot()` / `restore(s)`                                                | History support.                                             |                                                                | `restore` also sets `_rewinding` and stops the clock | `restore` passes `keepPhysical = true` to the keyboard.                                                  |                                                  |

### D.3 `src/marie.ts` (added or changed members)

| Element                                  | Parameters / returns | State it changes                   | Previous behavior   | New behavior                                                                                                                                                  | Why                                                                                                                                   |
| ---------------------------------------- | -------------------- | ---------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `hardware` (field)                       | `ExtendedHardware`   | —                                  | none                | One device set per simulator.                                                                                                                                 |                                                                                                                                       |
| `hardwareUndo` (private)                 | `HardwareSnapshot?`  | —                                  | none                | Links `captureHardware` and `addLog`: the snapshot taken just before an instruction step is attached to the next log entry as `hardwareBefore`, then cleared. | Undo of devices                                                                                                                       |
| `enableLog` (get/set)                    | boolean              | `_log`, `hardwareUndo`             | plain field         | Changing it clears the history.                                                                                                                               | Old actions cannot undo state created without a log                                                                                   |
| `memory` (Proxy)                         |                      | `_memory`                          | `set` wrote RAM     | `get` returns device values for numeric indices; `set` goes through `writeAddress`.                                                                           | Debugger/UI edits reach the devices                                                                                                   |
| `configureHardware(enabled, asyncInput)` |                      | `hardware`, `_log`, `hardwareUndo` | none                | Starts a new history epoch when the configuration changes.                                                                                                    |                                                                                                                                       |
| `resetRegisters()`                       |                      | also `hardware.reset()`            | registers only      | Resets devices too.                                                                                                                                           |                                                                                                                                       |
| `microStep()`                            | → `Action            | null`                              |                     | `Input` always awaited the callback                                                                                                                           | Calls `beginForward()`; for `Input` in asynchronous mode takes a snapshot (when logging) and reads the queue instead of the callback. | Non-blocking input |
| `microStepBack()`                        | → `Action            | null`                              |                     | restored RAM                                                                                                                                                  | Calls `beginRewind()`; skips the RAM restore for MMIO accesses; restores `hardwareBefore`.                                            | Reversible devices |
| `stepBack()`                             |                      |                                    |                     | Stops if the log is empty.                                                                                                                                    | Safety                                                                                                                                |
| `state()`                                | → `State`            |                                    | copy of RAM         | Overlays the live registers on `EF7`–`EFF` when enabled.                                                                                                      | Memory view shows devices                                                                                                             |
| `readMemory()` / `writeMemory()`         |                      | MBR / memory                       | direct array access | Use `captureHardware` and `readAddress`/`writeAddress`.                                                                                                       | Used by `Load`, `Store`, `LoadI`, `StoreI`                                                                                            |
| `readAddress(a)`                         | → value              |                                    |                     | `hardware.read(a) ?? RAM`.                                                                                                                                    |                                                                                                                                       |
| `writeAddress(a, v)`                     |                      |                                    |                     | If `hardware.write` did not handle it, write RAM.                                                                                                             |                                                                                                                                       |
| `captureHardware(a)`                     |                      | `hardwareUndo`                     |                     | Snapshot when logging, enabled and `a` in `EF7`–`EFF`.                                                                                                        |                                                                                                                                       |
| `addLog(action)`                         |                      | log                                |                     | Stores `hardwareBefore`; a Halt stops the clock.                                                                                                              |                                                                                                                                       |

### D.4 `src/project.ts`, `src/App.svelte`, `src/lib/Simulator.svelte`, components

| Element                                                                          | File                   | Previous behavior                              | New behavior                                                                                                                                                                                                                                                                                                                                                                                  | Purpose                                         |
| -------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `InputItem.format`, `Project.extendedHardware`, `Project.timerPeriod`            | `project.ts`           | Fixed radix formats                            | `'async'` format and two optional fields                                                                                                                                                                                                                                                                                                                                                      | Persistence                                     |
| `asyncInput` (`$derived`)                                                        | `App.svelte`           | none                                           | True when any input row has format `'async'`                                                                                                                                                                                                                                                                                                                                                  | Drives `configureHardware` and the capture area |
| the effect calling `sim.configureHardware`                                       | `App.svelte`           | none                                           | Applies hardware settings and the saved period; clears input indices on change; invalidates when the project changes                                                                                                                                                                                                                                                                          | Keep engine and UI consistent                   |
| `setTimerPeriod(value)`                                                          | `App.svelte`           | none                                           | Pauses, saves the period in the project and writes `EF7` through `editMemory` (a reversible device write)                                                                                                                                                                                                                                                                                     | Panel → engine                                  |
| `reset()`                                                                        | `App.svelte`           | requeues consumed text                         | also `sim.hardware.reset()`                                                                                                                                                                                                                                                                                                                                                                   | Clean devices on restart                        |
| `executionId`                                                                    | `Simulator.svelte`     | none                                           | Incremented by every start/stop; loops stop when theirs is stale                                                                                                                                                                                                                                                                                                                              | Avoid overlapping loops                         |
| `run()`, `runFast()`                                                             | `Simulator.svelte`     | `runFast` pushed 100,000 micro-steps per block | Both start/stop the hardware clock; fast mode loops while `performance.now() - start < 8`                                                                                                                                                                                                                                                                                                     | Responsiveness and timer correctness            |
| `pause()`, `invalidate()`, `forceUpdateState()`                                  | `Simulator.svelte`     | `forceUpdateState` was private                 | `forceUpdateState` exported; `pause()` stops the clock; `invalidate()` resets the run state                                                                                                                                                                                                                                                                                                   | Used by `App.svelte`                            |
| `refresh()`, `clear()`, `send()`, `physical()`, `pointerDown/Up()`, `focusOut()` | `HardwarePanel.svelte` | —                                              | `refresh` (every 50 ms) reads the shared snapshot and assigns state only if it changed. `send` feeds the controller, tracks which source (physical, pointer, latched) holds each key, and ignores events while rewinding. `physical` accepts events only from the capture button. `clear` releases keys and queues but keeps `select`. `focusOut` and window blur / page hidden call `clear`. | Capture and observe                             |
| `begin()`, `change()`, `move()`, `keyboard()`, `fit()`                           | `DisplayWindow.svelte` | —                                              | Pointer-capture drag/resize with minimum size; arrow keys move or resize by 10 px; `fit` keeps the window inside the viewport                                                                                                                                                                                                                                                                 | Floating display                                |
| `virtualKeySignal(code, key, modifiers)`                                         | `virtual-keyboard.ts`  | —                                              | Applies Shift (US symbol map, upper case) and builds a `KeySignal` with modifier flags                                                                                                                                                                                                                                                                                                        | Virtual keys                                    |

## E. Code changes

Fragments come from `git diff a22d884..HEAD`. Commit hashes refer to this repository.

### E.1 Memory access goes through the devices (`src/marie.ts`)

Original (`writeMemory`):

```ts
const oldContents = this.memory[this._registers.MAR];
this._memory[this._registers.MAR] = this._registers.MBR;
```

Modified:

```ts
const oldContents = this.readAddress(this._registers.MAR);
this.writeAddress(this._registers.MAR, this._registers.MBR);
// ...
private readAddress(address: number): number {
	return this.hardware.read(address) ?? this._memory[address];
}
private writeAddress(address: number, value: number) {
	this.captureHardware(address);
	if (!this.hardware.write(address, value)) this._memory[address] = value;
}
```

**How it works.** `hardware.read` returns `undefined` when the mode is off or the address is not one of the nine registers, so `??` falls back to RAM and every classic program behaves as before. `write` returns `true` when a device handled the access, in which case RAM is not touched. `readMemory()` uses the same pair, so the instructions `Load`, `Store`, `LoadI`, `StoreI`, `Add`, `Subt` and the others reach the devices **without changing any instruction algorithm**.

### E.2 Non-blocking `Input` (`src/marie.ts`)

Original:

```ts
const callbackValue = await this._inputCallback();
```

Modified:

```ts
if (this.hardware.asyncInput && this.enableLog)
	this.hardwareUndo = this.hardware.snapshot();
const callbackValue = this.hardware.asyncInput
	? this.hardware.input()
	: await this._inputCallback();
```

**How it works.** In the original, a `null` callback result pauses the program until the user types. With asynchronous input the value is `readInput()`: a code or `-1`, never `null`, so execution does not stop. `-1 & 0xffff` is `FFFF`, which `Skipcond 000` sees as negative. The snapshot is taken first so that stepping back returns the consumed key to the queue.

### E.3 Rewinding restores devices (`src/marie.ts`)

Original:

```ts
case 'memwrite':
	this._memory[last.address] = last.oldContents;
	break;
```

Modified:

```ts
case 'memwrite':
	if (!last.hardwareBefore) this._memory[last.address] = last.oldContents;
	break;
// ... at the end of microStepBack:
if (last.hardwareBefore) this.hardware.restore(last.hardwareBefore);
```

**How it works.** A log entry carries a `hardwareBefore` snapshot when it touched a device. For such entries the RAM cell below must not be written (a device register is not RAM), and the device state is restored instead.

### E.4 Held keys are not history (`src/keyboard.ts`, commit `081f05f`)

Before the fix, `restore()` also reinstated the held-key set from the snapshot, so a key released after the snapshot reappeared as pressed.

```ts
restore(snapshot: KeyboardSnapshot, keepPhysical = false): void {
	this.cached = undefined;
	this.inputQueue = [...snapshot.input];
	this.eventQueue = snapshot.events.map((event) => ({ ...event }));
	this.released = new Set(snapshot.released);
	this._select = snapshot.select;
	this.overflow = snapshot.overflow;
	if (keepPhysical) return;          // fingers are not part of the CPU history
	this.down = new Set(snapshot.pressed);
	this.altGraph = snapshot.altGraph;
}
```

`ExtendedHardware.restore` calls `restore(snapshot.keyboard, true)`.

### E.5 Shared snapshots (`src/keyboard.ts`, commit `bab7ee0`)

```ts
snapshot(): KeyboardSnapshot {
	return (this.cached ??= { input: [...this.inputQueue], /* … */ });
}
```

Every method that changes the device sets `this.cached = undefined`. A program that polls a status register thousands of times between key events now stores **one** shared, never-mutated snapshot instead of a fresh deep copy per log entry.

### E.6 Fast mode (`src/lib/Simulator.svelte`)

Original:

```ts
while (performance.now() - start < 200) {
	for (let i = 0; i < 100000; i++) {
		actions.push(await sim.microStep());
	}
}
```

Modified:

```ts
// Measured old blocks exceeded 200ms; yield within one display frame.
while (running && performance.now() - start < 8) {
	const action = await sim.microStep();
	/* handle output / halt */
}
```

The original inner `for` always ran 100,000 micro-steps before looking at the clock, and kept every action in an array. The new loop checks the 8 ms budget after each micro-step and then yields with `setTimeout(…, 0)`.

### E.7 Display layout (`src/lib/Display.svelte`)

Original: `.pixel { width: 1rem; height: 1rem }` inside flex rows. Modified: `.pixels { display: grid; grid-template-columns: repeat(16, 1fr); width: min(100cqw, 100cqh) }` and `.row { display: contents }`, with the parent declared as a container (`container-type: size`). The 16 × 16 cells now scale with the window that contains them.

### E.8 HardwarePanel refresh (`src/lib/HardwarePanel.svelte`, commit `70246fa`)

```ts
const keyboard = hardware.keyboard.snapshot();
if (keyboard !== shownKeyboard) {
	// same object ⇒ nothing changed
	shownKeyboard = keyboard;
	pressed = keyboard.pressed; // $state.raw: no deep proxy
	/* events, counts, status, modifiers */
}
ticks = hardware.count; /* period, running, rewinding */
```

The 50 ms timer used to copy the queues and re-render every time. It now compares object identity and uses `$state.raw` for arrays that are never mutated.

## F. Computer architecture

### F.1 The MARIE machine (original)

| Part               | Description                                                                                                                                                                             | Where in the code                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Word and memory    | 16-bit words, 4096 words (12-bit addresses `000`–`FFF`)                                                                                                                                 | `_memory`                                                                                     |
| Registers          | AC (accumulator), MAR (memory address), MBR (memory buffer), PC (program counter), IR (instruction register), IN, OUT                                                                   | `_registers`                                                                                  |
| Instruction format | 4-bit opcode in the top bits of IR, 12-bit address operand                                                                                                                              | `fetchDecode`, `opDecoder`                                                                    |
| Instructions       | Add, Subt, AddI, Load, LoadImmi, LoadI, Store, StoreI, Input, Output, Jump, JumpI, JnS, SkipCond, Halt (15 opcodes; `Clear` and `ADR` are assembler aliases for `LoadImmi 0` and `JnS`) | `MarieSim.instructions`                                                                       |
| Instruction cycle  | **Fetch**: `MAR ← PC`, `MBR ← M[MAR]`, `IR ← MBR`, `PC ← PC + 1`. **Decode**: the opcode `IR >> 12` selects the instruction. **Execute**: the instruction's own list of micro-steps.    | `fetchDecode` (6 micro-steps) + `microSteps` of each instruction                              |
| Micro-instructions | Each micro-step is one register transfer or ALU action and is logged                                                                                                                    | `registerTransfer`, `arithmeticOperation`, `comparisonOperation`, `readMemory`, `writeMemory` |
| Step vs micro-step | A _step_ runs micro-steps until the next `step` marker                                                                                                                                  | `step()`, `microStep()`                                                                       |
| Reversibility      | Every action carries the old value; `microStepBack` undoes the latest action                                                                                                            | `_log`, `microStepBack`                                                                       |
| Input/Output       | `Input` pauses for a value (`_inputInterrupt`: NeedsValue → NeedsLoad), the value goes to IN then AC. `Output` copies AC to OUT and emits an action.                                    | `Input` and `Output` instructions                                                             |
| Display memory     | The 256 cells `F00`–`FFF` are ordinary RAM that the user interface draws as a 16 × 16 image                                                                                             | `Display.svelte`                                                                              |

### F.2 What this project adds

```text
Browser events ──► HardwarePanel ──► KeyboardController ─┐
                                                          ├─► ExtendedHardware ◄─── MarieSim memory access / Input
Real clock ───────────────────────► virtual timer ───────┘          │
                                                                    └─► snapshots ─► execution log (undo)
```

`MarieSim` owns one `ExtendedHardware`. The CPU never knows which device it talks to: it asks `readAddress` / `writeAddress`, and for `Input` it asks `hardware.input()`. The display stays plain RAM. The instruction set and micro-step lists are the original ones.

## G. Asynchronous keyboard implementation

| Topic                    | Implementation                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event capture            | `HardwarePanel.svelte`: the capture `<button>` receives `keydown`/`keyup`; `physical()` ignores events from any other element, composition events, and everything while rewinding.                                                                                                                                                                                                |
| Sources                  | `send()` remembers which source holds each key (`physical`, `pointer:<id>`, `latched`, `accessible`) so two sources can hold the same key and it is released only when all let go.                                                                                                                                                                                                |
| Encoding                 | `KeyboardController.keyDown` takes `event.key`: first `logicalCodes` (Backspace, Tab, Enter, Escape, Delete, arrows); otherwise a one-character key with code ≤ 255 gives its character code (with the Ctrl rule: letters and `@`–`_` become 0–31 unless Alt/AltGr is held); otherwise a named key without a character gives `512 + HID id`. Anything else gives no logical code. |
| Queues                   | `inputQueue` (characters) and `eventQueue` (`{code, type}`) each hold 64 entries. A full queue drops the **new** entry and sets a sticky overflow bit (4 or 8).                                                                                                                                                                                                                   |
| Non-blocking read        | `readInput()` returns `shift() ?? -1`.                                                                                                                                                                                                                                                                                                                                            |
| Physical state           | `down` (set of HID ids), `released` (latches), `select`, `altGraph` (set when Right Alt arrives with `key === 'AltGraph'` or the browser reports the AltGraph modifier state).                                                                                                                                                                                                    |
| Held and released keys   | `keyDown` ignores a key already in `down`; `keyUp` ignores a key not in `down`. Auto-repeat (`event.repeat`) is dropped.                                                                                                                                                                                                                                                          |
| Virtual keyboard         | Buttons call the same `send()` with signals from `virtualKeySignal()`; the **Latch keys** checkbox switches from hold-while-pressed to toggle.                                                                                                                                                                                                                                    |
| Integration with `Input` | `MarieSim.microStep` → `hardware.input()` → `keyboard.readInput()`.                                                                                                                                                                                                                                                                                                               |
| Integration with MMIO    | `ExtendedHardware.read/write` map `EF8`–`EFD`, `EFF` to `acknowledge`, `status`/`modifiers`, `select`, `selectedState`, `events`.                                                                                                                                                                                                                                                 |
| Cleaning                 | `clear()` on focus loss, window blur, hidden page, capture start, **Clear keyboard and queues**, `hardware.reset()` (Restart, project change). It never generates key-up events.                                                                                                                                                                                                  |
| Reset                    | `ExtendedHardware.reset()` also stops the clock and zeroes the counter.                                                                                                                                                                                                                                                                                                           |
| Reversible execution     | Snapshots (`KeyboardSnapshot`) hold queues, held keys, latches, select, overflow, AltGr. `restore(…, keepPhysical = true)` returns everything **except** the held keys and AltGr. `HardwarePanel` refuses events while `hardware.rewinding`.                                                                                                                                      |

## H. Extended hardware implementation

| Topic                       | Implementation                                                                                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Register map                | The `MMIO` object in `peripherals.ts`: `PERIOD` EF7, `ACK` EF8, `STATUS` EF9, `SELECT` EFA, `SELECTED_STATE` EFB, `EVENT_TYPE` EFC, `EVENT_COUNT` EFD, `COUNT` EFE, `EVENT_CODE` EFF. Full description in the [user guide](user-guide.md#f-extended-hardware-mode).                         |
| Reads and writes            | `read(address)` is a `switch` over the map; `write(address, value)` masks to 16 bits and handles `PERIOD`, `ACK`, `SELECT`, `COUNT`. Writes to read-only registers return `true` (handled, no effect), so the RAM beneath is never changed.                                                 |
| Timer                       | `settle()` converts `now() - sampledAt` plus the stored `phase` into whole ticks; the remainder becomes the new `phase`. `COUNT` wraps modulo 65536. The clock runs only while `_running`; `setRunning` is driven by `Simulator.svelte` (Run/Continue, Pause, Halt, breakpoints, stepping). |
| Period limits               | `period` setter: non-finite values ignored; `Math.floor`; clamp to 1–65535. Through MMIO the value is first masked to 16 bits: a write of 0 or 65536 gives period 1, 70000 gives 4464. This is intentional and pinned by tests.                                                             |
| Side effects                | Reads change nothing; `EF7` write restarts the phase; `EFE` write sets the counter and restarts the phase; `EF8` acknowledges.                                                                                                                                                              |
| Integration with the memory | `readAddress` / `writeAddress` (E.1); `state()` overlays register values for the memory view; the `memory` proxy makes the debugger and the period field use the same path.                                                                                                                 |
| Enabling                    | `MarieSim.configureHardware(enabled, asyncInput)`; disabled addresses are RAM.                                                                                                                                                                                                              |
| Compatibility               | With `enabled = false` and `asyncInput = false`, `read` returns `undefined` and `write` returns `false`, and `Input` awaits the callback: the engine behaves as the original. Projects saved by the original load with the mode off (`project.test.ts`).                                    |
| Snapshots                   | `HardwareSnapshot` = keyboard snapshot + `period`, `count`, `phase`. Taken by `captureHardware` (MMIO access) and before an asynchronous `Input`, stored in the log entry as `hardwareBefore`.                                                                                              |
| Restoration                 | `restore()` sets the values, stops the clock and marks `_rewinding`; time restarts from the restored count without catching up.                                                                                                                                                             |

## I. Performance improvements and bug fixes

### I.1 Fast mode

8 ms slices instead of blocks of 100,000 micro-steps (E.6). Fast mode keeps no history.

### I.2 Display

The grid scales to its container (E.7) and lives in a floating window.

### I.3 Phantom keys (fix `081f05f`)

Stepping back restored the held-key set, so a key already released came back as held and survived into later execution. Held keys are now live physical state (E.4). Regression tests cover press, release, rewind, re-run, reset, and virtual plus physical sources.

### I.4 Shared snapshots (`bab7ee0`)

Memory per log entry in a loop that polls a device register dropped from about 199 B to about 101 B (E.5).

### I.5 HardwarePanel (`70246fa`)

Identity-checked refresh and `$state.raw` (E.8).

### I.6 Measured results (audits 04A and 04B)

| Metric                                                                                                        | Before (04A)          | After (04B)                         |
| ------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------- |
| Memory retained per log entry, loop polling an MMIO register (after forced GC, 1,000,000 micro-steps, log on) | 199 B (about 190 MB)  | 101 B (about 97 MB), about −49 %    |
| Memory per entry, ordinary loop                                                                               | 99 B                  | 99 B (the same in the original)     |
| Time for 1,000,000 micro-steps polling MMIO                                                                   | 707 ms                | 528–571 ms                          |
| Browser CPU at idle, hardware panel active, capture focused                                                   | 7.0 %                 | 2.9 %                               |
| Garbage produced at idle over 5 s                                                                             | 9.6 MB                | 0.5 MB                              |
| Micro-steps per second, log off (original / this project)                                                     | —                     | about 4.2–4.9 M / 5.3–5.8 M (noisy) |
| Fast mode in the browser (original / this project)                                                            | 4–5 frames per second | 16–17 frames per second             |
| Normal mode at maximum speed with the log on                                                                  | 10 fps, 100 % CPU     | unchanged                           |

**Conditions and limits.** One Windows 11 machine; Edge headless at 1440 × 1050 driven by Playwright and Chrome DevTools Protocol metrics; memory figures from scripts bundled with esbuild and run with `node --expose-gc`. Figures are single runs or short repeats; the browser heap growth during execution was too affected by garbage collection to be used as evidence. These are **not** guarantees for other computers, browsers or programs.

**Node.js versions.** The system Node.js installed for this project (through `winget`, used by npm, Vite, Vitest, the build and the Windows launcher) is **v26.13.1**. The benchmark scripts were launched from a shell whose `node` was the runtime bundled with the coding tool, **v24.22.3**; that is the version the benchmark and browser-driver scripts ran on. The versions were reconstructed from the session log, not recorded by the scripts themselves, and an earlier draft that said "Node 24" for everything was imprecise.

### I.7 Portability and launchers

| Item                    | Detail                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.gitattributes`        | `*.mas`, `*.sh`, `*.command` LF (assembler and shells reject CRLF); `*.cmd` CRLF (commit `226c8d3`; a ZIP download of the repository keeps CR+LF).                                                                                                                                                     |
| `iniciar-marie.cmd`     | Windows. Checks `node` and `npm`, the Node version (`^20.19 \|\| ^22.12 \|\| >=24`), runs `npm ci` only if `node_modules/.package-lock.json` is missing or older than `package-lock.json`, checks that port 5173 is free, then runs `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open`. |
| `iniciar-marie.sh`      | Linux/macOS. The same checks and command in Bash.                                                                                                                                                                                                                                                      |
| `iniciar-marie.command` | macOS double-click. Adds `/opt/homebrew/bin` and `/usr/local/bin` to `PATH`, runs `iniciar-marie.sh`, waits for Enter on failure.                                                                                                                                                                      |
| Accepted Node versions  | 20.19 and later 20.x; 22.12 and later 22.x; 24 and later. Versions 21.x, 23.x, 20.0–20.18 and 22.0–22.11 are rejected.                                                                                                                                                                                 |
| Browser tests           | `tests/launch-browser.mjs`: `PLAYWRIGHT_PACKAGE_JSON`, `MARIE_BROWSER_CHANNEL`.                                                                                                                                                                                                                        |
| Platforms               | The Windows launcher was run end to end. The `.sh` and `.command` scripts passed a Bash syntax check and were **never run on Linux or macOS**.                                                                                                                                                         |

## J. Testing and validation

### J.1 Tests added

| File                           | Tests | Purpose                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/keyboard.test.ts`         |    30 | Non-blocking empty input; ASCII/Latin-1 and FIFO; simultaneous keys and latches; modifiers; overflow; snapshots; clear; unique HID ids; Ctrl and AltGr; non-Latin-1; shared snapshots.                                                                                                                         |
| `src/peripherals.test.ts`      |    34 | MMIO from the CPU (direct, indirect, debugger); read-only registers; rewinding `Input`, `ACK` and debugger edits; Halt freezes the clock; mode change clears history; timer behavior; phantom-key regression; address pinning; period limits; 50,000-step polling and rewind; running forward after rewinding. |
| `src/diagnostics.test.ts`      |     5 | The four `public/diagnostics` programs.                                                                                                                                                                                                                                                                        |
| `src/history-boundary.test.ts` |     1 | Unlogged execution discards history.                                                                                                                                                                                                                                                                           |
| `src/virtual-keyboard.test.ts` |     2 | Virtual Shift and Ctrl.                                                                                                                                                                                                                                                                                        |
| `src/project.test.ts`          |     3 | Persistence (stubbed storage).                                                                                                                                                                                                                                                                                 |
| `src/marie.test.ts`            |    28 | The original suite, unchanged.                                                                                                                                                                                                                                                                                 |

Total at the last functional validation: **103 tests in 7 files, all passed**, together with `svelte-check` (0 errors, 0 warnings) and a successful `vite build`.

### J.2 Browser tests

`tests/browser-display.mjs` and `tests/browser-hardware.mjs` drive a headless browser against the dev server: physical capture, focus and the editor, simultaneous keys, virtual hold and latch, traditional input, MMIO with rewinding, pause and breakpoint, fast mode, the floating display. They passed on Windows with Edge in the last validation.

### J.3 Differential fuzz against the original

A throw-away script (not in the repository) assembled random classic programs and compared this engine with the original engine from `a22d884` micro-step by micro-step, including full rewinding: 3,000 comparisons (1,500 programs, 2 modes) found 0 differences. This shows the **classic behavior was preserved**; it says nothing about the extended hardware, which the original does not have, so it is **not** a proof of equivalence of the whole system.

### J.4 How to run

```sh
npm run test -- --run   # unit tests
npm run check           # svelte-check
npm run build           # production build
npm run dev             # for the browser tests, in another terminal
npm run test:browser    # needs Playwright and Edge, Chrome or Chromium
```

Playwright is **not** a dependency. Either run `npm i -D playwright` (not recommended for students, it changes `package.json`) or point `PLAYWRIGHT_PACKAGE_JSON` to a `package.json` next to a `node_modules` that has it; set `MARIE_BROWSER_CHANNEL` to `chrome` or `chromium` if you do not have Edge.

### J.5 Limits of the validation

Documentation examples were assembled and executed through the engine with simulated key events, not clicked in a browser. Real keyboards, layouts, IME, touch screens and system-reserved shortcuts were not tested exhaustively. Measurements come from one machine.

## K. Known limitations

| Limitation                    | Detail                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unbounded history             | In normal mode the log grows with every micro-step, about 99 bytes each. A cap was evaluated and **not** implemented: `App.svelte` stores absolute log indices (`inputLogIndices`, `outputActions`, rewind detection by length), so trimming the start of the log would require changing the log API and the UI. |
| Fast mode                     | Keeps no history and ignores breakpoints and the RTL log; toggling it clears the history.                                                                                                                                                                                                                        |
| Maximum speed with history on | About 10 fps and 100 % CPU in the browser; inherited from the original design.                                                                                                                                                                                                                                   |
| Rewinding and the real world  | Held keys are not rewound; the history is not an event replay; time is frozen while rewinding.                                                                                                                                                                                                                   |
| Linux and macOS               | Launchers not yet run on those systems.                                                                                                                                                                                                                                                                          |
| Keyboard coverage             | System-reserved shortcuts, national layouts, IME and touch devices are not covered. Only Latin-1 characters reach `Input`.                                                                                                                                                                                       |
| Benchmarks                    | One machine, one browser, noisy; see I.6.                                                                                                                                                                                                                                                                        |
| Dependencies                  | `npm audit` reported 9 advisories in inherited development dependencies; nothing was updated.                                                                                                                                                                                                                    |
| Language                      | Some code comments are still in Spanish. `src/peripherals.ts` has a comment that still points to `docs/extended-hardware.md`, now in `docs/development/`.                                                                                                                                                        |
| Application name              | The application is "MARIE Async" (subtitle "Extended Hardware Simulator", package `marie-async`); the repository keeps the name MARIE.js because it is a fork.                                                                                                                                                   |
