# MARIE.js with asynchronous input and extended hardware: installation and start-up guide

A modified copy of [MARIE.js](https://github.com/MARIE-js/MARIE.js), a browser simulator of the **MARIE** architecture (_Machine Architecture that is Really Intuitive and Easy_) from [The Essentials of Computer Organization and Architecture](https://books.google.com.au/books/about/The_Essentials_of_Computer_Organization.html?id=3kQoAwAAQBAJ&redir_esc=y) by Linda Null and Julia Lobur.

This version keeps everything MARIE.js does and adds optional features for interactive programs such as games: a keyboard that never blocks the CPU, memory-mapped keyboard and timer registers, and a resizable, detachable display.

> **Naming.** The application is still called MARIE.js inside the program. This project is not an official release of MARIE.js.

## Contents

[Overview](#overview) · [Features](#main-features) · [Original vs. modified](#original-vs-modified-marie) · [Technology](#technology-stack) · [Requirements](#system-requirements) · [Install and run](#download-and-installation) · [Troubleshooting](#troubleshooting) · [Documentation](#documentation-index) · [Tests](#testing-overview) · [Limitations](#known-limitations) · [Attribution and license](#upstream-attribution)

## Overview

**Academic context.** MARIE is a teaching architecture used in computer organization courses. Students write assembly programs, run them on a simulated CPU and watch registers, memory and the data path change step by step.

**Motivation.** In the original simulator, `INPUT` waits for a typed value, there is no clock, and the display cannot be used comfortably for real-time programs. That makes it hard to write something like a game. This project adds those capabilities without adding instructions, so programs are still ordinary MARIE assembly.

**You do not need** Claude, Codex, Visual Studio Code or a GitHub account to use the simulator. **Git is optional** (only for the `git clone` method; the ZIP download needs nothing else). You only need Node.js (which includes npm) and a web browser.

This README only covers installation and start-up. To learn how to use the simulator and write programs, read the [user guide](docs/user-guide.md); to see exactly what was changed from the original, read [docs/changes.md](docs/changes.md).

## Main features

- **Asynchronous `INPUT`**: returns the next queued key, or `-1` if none, without stopping the CPU.
- **Universal keyboard**: physical keys (USB HID codes), key up/down events, modifiers, simultaneous keys, plus an on-screen virtual keyboard.
- **Extended Hardware Mode**: memory-mapped registers `EF7`–`EFF` for the keyboard and a timer.
- **Timer** independent of CPU speed.
- **Display**: scalable, with an optional detached window.
- **Fast execution** that keeps the page responsive.
- **Reversible execution** that also rewinds the virtual devices.
- **Launchers** for Windows, macOS and Linux.

All extensions are optional; with them off, MARIE behaves like the original.

## Original vs. modified MARIE

| Aspect       | Original MARIE.js              | This project                                              |
| ------------ | ------------------------------ | --------------------------------------------------------- |
| `INPUT`      | Waits for a typed value        | Optionally returns immediately (`-1` if no key)           |
| Keyboard     | Text values                    | Characters plus physical key events, held keys, modifiers |
| Timer / MMIO | None                           | Optional `EF7`–`EFF`                                      |
| Display      | Fixed 16 × 16 panel            | Scalable, detachable                                      |
| Fast mode    | Blocks the page in long bursts | Yields to the browser every 8 ms                          |
| Launch       | `npm` commands                 | Double-click launchers (npm still works)                  |

The complete list of differences is in [docs/changes.md](docs/changes.md).

## Technology stack

| Technology                                          | Purpose                                   | Origin               |
| --------------------------------------------------- | ----------------------------------------- | -------------------- |
| TypeScript, Svelte 5                                | Language and UI framework                 | MARIE.js             |
| Vite 7                                              | Development server and build              | MARIE.js             |
| CodeMirror 6, Bulma, Split.js, Font Awesome, lodash | Editor, styling, layout, icons, utilities | MARIE.js             |
| Vitest, svelte-check, Prettier                      | Tests, type checks, formatting            | MARIE.js             |
| Node.js and npm                                     | Run the tools                             | Required by MARIE.js |
| Windows batch and Bash scripts                      | Start-up launchers                        | This project         |
| Playwright (not installed by the project)           | Optional browser tests                    | This project         |

No dependency was added to `package.json`. Versions are in `package.json` and `package-lock.json`.

## System requirements

| Needed to run                                                                                                                                    | Optional (developers only)                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Node.js in the range below (includes npm), a recent web browser, about 300 MB disk space for dependencies, internet access for the first install | Git; Playwright and a Chromium-based browser for `npm run test:browser` |

**Supported Node.js versions** (checked by the launchers, from the requirements of Vite 7): **20.19 or newer 20.x, 22.12 or newer 22.x, or 24 and newer**. Versions 21.x, 23.x, 20.0–20.18 and 22.0–22.11 are **not** accepted. Recommendation: install the **current LTS** release from nodejs.org, which falls inside this range. Windows validation was done with Node.js 26.13.1; you do not need that exact version.

**What are Node.js and npm?** MARIE runs in your browser, but it is built and served by a small development server written for Node.js (a JavaScript runtime). npm is the package manager that comes with Node.js; it downloads the libraries MARIE needs into a `node_modules` folder the first time you start it.

## Download and installation

### 1. Install Node.js

Download the LTS installer from <https://nodejs.org> and run it with the default options (npm is included). Alternatively use your package manager (for example `winget install OpenJS.NodeJS.LTS` on Windows, `brew install node` on macOS). Then **open a new terminal** and check:

```sh
node --version
npm --version
```

### 2. Get the project

**Option A: download a ZIP.** On <https://github.com/Nik064-hub/MARIE.js> press **Code → Download ZIP**, then extract it. Do not run it from inside the ZIP.

**Option B: git clone.**

```sh
git clone https://github.com/Nik064-hub/MARIE.js.git
cd MARIE.js
```

(The folder name may differ if you renamed it.)

### 3. Start the simulator

The launcher installs dependencies the first time (`npm ci`, internet required), starts the server and opens your browser at **http://127.0.0.1:5173**.

| System  | Launcher                             | Status                             |
| ------- | ------------------------------------ | ---------------------------------- |
| Windows | Double-click `iniciar-marie.cmd`     | Validated                          |
| macOS   | Double-click `iniciar-marie.command` | Not yet run on a real Mac          |
| Linux   | `./iniciar-marie.sh`                 | Not yet run on a real Linux system |

**macOS.** If the file is not executable (common after a ZIP download), open Terminal in the project folder and run:

```sh
chmod +x iniciar-marie.command iniciar-marie.sh
```

If macOS blocks the file, right-click it, choose **Open**, then confirm.

**Linux.**

```sh
chmod +x iniciar-marie.sh
./iniciar-marie.sh
```

Without the executable bit you can always run `bash iniciar-marie.sh`.

**Any system (terminal).** From the project folder:

```sh
npm ci
npm run dev
```

To use exactly what the launchers use (local address only, fixed port, open the browser):

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
```

Keep the window open while you use MARIE. The simulator needs the server; do not open `index.html` directly from the file system.

### Stopping the server

Press **Ctrl+C** in the terminal (or close the launcher window).

## Troubleshooting

| Problem                                | What to do                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js is not installed               | Install the LTS version from <https://nodejs.org> and run the launcher again.                                                                                   |
| `node` or `npm` is not recognized      | Close and reopen the terminal (or log out and in) so the updated PATH is loaded. If it persists, reinstall Node.js and keep the "Add to PATH" option.           |
| "Node.js is too old"                   | Install Node.js 20.19+, 22.12+ or 24+.                                                                                                                          |
| Dependencies fail to install           | Check your internet connection and any proxy, then run `npm ci` again. If `node_modules` is damaged, delete that folder and rerun. Do not use `npm audit fix`.  |
| Port 5173 is already in use            | MARIE may already be running at <http://127.0.0.1:5173>. Otherwise close the program using the port. The launchers use a strict port and will not pick another. |
| The browser does not open              | Open <http://127.0.0.1:5173> manually while the server is running.                                                                                              |
| A launcher has no execution permission | Run `chmod +x iniciar-marie.sh iniciar-marie.command`, or `bash iniciar-marie.sh`.                                                                              |
| Windows SmartScreen warning            | Choose **More info → Run anyway** only for files you downloaded from this repository.                                                                           |

## Documentation index

| Document                                 | Content                                                                                                                                    | Language |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| [README.md](README.md)                   | Installation and start-up (this file)                                                                                                      | English  |
| [docs/user-guide.md](docs/user-guide.md) | Using the simulator, input modes, keyboard codes, real-time input, assembly examples, extended hardware, game development, troubleshooting | English  |
| [docs/changes.md](docs/changes.md)       | Technical description of every change relative to the original MARIE.js                                                                    | English  |
| [README.upstream.md](README.upstream.md) | Original MARIE.js README at commit `a22d884`                                                                                               | English  |
| [docs/development/](docs/development/)   | Historical development notes and the previous Spanish manuals (not current instructions)                                                   | Spanish  |

## Testing overview

```sh
npm run test -- --run   # unit tests (Vitest): 103 tests
npm run check           # TypeScript and Svelte checks
npm run build           # production build
npm run test:browser    # optional browser tests
```

`npm run test:browser` needs Playwright, which is not a dependency of this project. Point `PLAYWRIGHT_PACKAGE_JSON` to a `package.json` beside a `node_modules` that contains Playwright, and optionally set `MARIE_BROWSER_CHANNEL` (default `msedge`; also `chrome` or `chromium`). Students do not need these tests.

## Known limitations

- **Windows is the only validated system.** The macOS and Linux launchers passed a syntax check but have not been run on those systems.
- In normal mode the execution history is **unbounded** and can use a lot of memory in long runs at full speed. Fast mode does not store history, so use it for long-running programs and games.
- Rewinding restores devices but does not replay external key presses, and held keys are not rewound.
- Performance numbers in [docs/changes.md](docs/changes.md) come from one computer and are not guarantees.
- Some screen labels of the hardware panel and the code comments are still in Spanish; the guides quote the labels exactly.
- Not tested: all keyboard layouts, IME and touch screens.

## Upstream attribution

This project is based on [MARIE.js](https://github.com/MARIE-js/MARIE.js) by The MARIE.js Team, forked at commit `a22d884`. The original project is used in FIT1047 at Monash University. All original credits are preserved; see [README.upstream.md](README.upstream.md).

## License

Distributed under the [MIT License](LICENSE). Copyright (c) 2016 The MARIE.js Team. Modifications in this fork are released under the same license.
