# MARIE.js user and programming guide

This guide explains how to use the simulator and how to write interactive MARIE assembly programs with the asynchronous keyboard, the Extended Hardware Mode and the display. For installation and start-up, see the [README](../README.md). For how the extensions are built, see [changes.md](changes.md).

**Conventions.** Features that exist in the original MARIE.js are marked _(original)_; features added by this project are marked _(added)_. Addresses and values are hexadecimal unless a table says otherwise. Some control labels added by this project are still in Spanish (for example "Input asíncrono" and "Capturar teclado"); this guide always quotes the label exactly as it appears on screen and gives its meaning.

**Contents**

- [A. The simulator interface](#a-the-simulator-interface)
- [B. Input modes](#b-input-modes)
- [C. Keyboard codes](#c-keyboard-codes)
- [D. Real-time keyboard input](#d-real-time-keyboard-input)
- [E. Assembly programming examples](#e-assembly-programming-examples)
- [F. Extended Hardware Mode](#f-extended-hardware-mode)
- [G. Game development](#g-game-development)
- [H. Performance and troubleshooting](#h-performance-and-troubleshooting)

## A. The simulator interface

### A.1 Main areas

| Area                                                                 | Purpose                                                                                                                                        | Origin   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Top bar: **File**, **Examples**                                      | File: New, Recent files, Upload file, Load from URL, Download code, Get share URL, Download binary memory dump. Examples: ready-made programs. | original |
| Top bar: **Data Path**, **Instruction Set**                          | Show or hide the data-path diagram and the instruction reference.                                                                              | original |
| Top bar: **Display**                                                 | Show or hide the floating display window (see A.7).                                                                                            | added    |
| Editor                                                               | Where you write assembly. Click the gutter to set or remove a breakpoint.                                                                      | original |
| Registers and memory                                                 | Live values of AC, IR, MAR, MBR, PC, IN, OUT and all memory cells. Double-click a value to edit it while the simulator is not halted.          | original |
| Controls bar                                                         | **Assemble**, **Run** / **Pause** / **Continue**, step controls, **Restart**, **Speed**, fast mode.                                            | original |
| Side panels: **Output log**, **RTL log**, **Watch list**, **Inputs** | Output values (with a format selector), register-transfer log, labelled memory cells, input queues.                                            | original |
| Side panel: **Hardware extendido**                                   | Extended Hardware Mode switch, keyboard capture, virtual keyboard, timer period, MMIO summary.                                                 | added    |

### A.2 The assembler editor

Write one instruction per line, optionally preceded by a label and a comma:

```text
Loop, Load Counter     / a comment starts with a slash
      Add One
      Store Counter
      Jump Loop

Counter, DEC 0         / data: DEC, HEX or OCT
One,     DEC 1
```

- Instructions that take an address use a label or a numeric address. A **numeric operand must start with a digit**: write `Store 0EFA`, not `Store EFA` (that would be read as a label). A hexadecimal address has the form `0F00`.
- Data lines are `Label, DEC n`, `HEX n` or `OCT n`. In `HEX` data a leading letter is fine (`HEX F00`).
- `Skipcond` takes 000 (skip next line if AC < 0), 400 (AC = 0), 800 (AC > 0) or 0C00 (AC ≠ 0). Numeric operands are hexadecimal. In this guide the condition is written as three digits (`Skipcond 000`, `Skipcond 400`).
- The full instruction list is in the **Instruction Set** panel.

### A.3 Assemble, run, pause, restart

| Control      | What it does                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Assemble** | Assembles the editor text and loads it into memory. It turns red if there is an error. Assembling again after editing starts from scratch. |
| **Run**      | Runs until Halt, a breakpoint, a pause, or an input error. After the first run the button reads **Continue**.                              |
| **Pause**    | Shown while running. Stops the execution.                                                                                                  |
| **Halted**   | Disabled button shown after a Halt instruction.                                                                                            |
| **Restart**  | Resets registers and the program counter. In this project it also clears the keyboard queues and the timer counter (period is kept).       |

### A.4 Stepping and rewinding

| Control                  | What it does                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| **Step**                 | Executes one instruction.                                                   |
| Left arrow next to Step  | Rewinds to the previous instruction ("Rewind to the previous instruction"). |
| **Micro step**           | Executes one micro-instruction (one register transfer).                     |
| Left arrow next to Micro | Steps back one micro-instruction.                                           |

Rewinding needs the execution log. It is **disabled while the program is running** and when the log is empty, and the log is not recorded in fast mode (A.8). Rewinding also restores the virtual devices (see D.9). The timer does not advance during manual stepping.

### A.5 Registers, memory, watch list

The registers panel and the memory grid show values in the selected radix; hovering a cell shows its value in the other radixes. Memory addresses `EF7`–`EFF` show the live device registers when Extended Hardware Mode is on _(added)_. The **Watch list** shows every label of the assembled program with its address and value in HEX, DEC, OCT and BIN and lets you follow pointers.

### A.6 Inputs panel and Output log

The **Inputs** panel holds the values that `Input` instructions will read (see section B). The **Output log** lists every value written by `Output`; its selector chooses hexadecimal, decimal, octal, binary or Unicode (UTF-16BE) display. The **RTL log** shows the register transfers of each micro-step.

### A.7 Display and floating display window _(added)_

The display is a 16 × 16 grid of pixels backed by memory cells `F00`–`FFF`: pixel (row, column) is cell `F00 + 16 × row + column`. A cell value is a 15-bit colour, `R[14-10] G[9-5] B[4-0]` (5 bits each), for example `7FFF` is white and `0000` is black. The original simulator showed it inside a side panel; here the **Display** button in the top bar opens it as a floating window:

- drag the title bar to move it; drag any edge or corner to resize; the **x** button closes it;
- with the keyboard focus on the title bar or an edge, the arrow keys move or resize in 10-pixel steps;
- the pixels scale to the window, and the window stays inside the browser area. Position and size are remembered while the page stays open.

### A.8 Speed and fast mode

- **Speed** is a slider from 0 to 9 _(original)_. 0 is the slowest (one step per second) and 9 the fastest (as many steps as fit in each 20 ms slice).
- The fast-forward button next to it toggles **fast mode** _(original, rewritten here)_: it runs as fast as possible and **disregards breakpoints, the RTL log and the execution history** (so you cannot step back). It is locked while a program is in progress and unlocked by **Restart** or **Assemble**. In this project fast mode works in slices of at most 8 ms and yields to the browser, so the page stays responsive.

## B. Input modes

Each row in the **Inputs** panel has a format selector. Use **Add additional input** to append a row.

| Selector value         | Kind          | What you type                               | What `Input` returns                                           | Blocks the CPU?           | Origin   |
| ---------------------- | ------------- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------- | -------- |
| **Hexadecimal**        | text queue    | one number per line, base 16                | the number                                                     | yes, until a value exists | original |
| **Decimal**            | text queue    | one number per line, base 10                | the number                                                     | yes                       | original |
| **Octal**              | text queue    | one number per line, base 8                 | the number                                                     | yes                       | original |
| **Binary**             | text queue    | one number per line, base 2                 | the number                                                     | yes                       | original |
| **Unicode (UTF-16BE)** | text queue    | free text                                   | the 16-bit code of the next character; ASCII for plain letters | yes                       | original |
| **Input asíncrono**    | live keyboard | nothing: you press keys in the capture area | next queued key code, or `-1` (`FFFF`) if none                 | **no**                    | added    |

There is no separate "ASCII" mode: ASCII characters are typed in the **Unicode (UTF-16BE)** mode, where `A` gives 65.

### B.1 Traditional (blocking) input

When the program executes `Input`, the simulator takes the first pending value from the text queues, top row first. If every queue is empty, **the program pauses and waits** until you type something and press Run or Continue again. Values you entered manually are consumed one by one; the consumed part is shown above the text box. A line that is not a valid number stops execution with an input error. Rewinding puts consumed values back.

Typing the number `5` in Decimal mode gives the value 5; typing the character `5` in Unicode mode gives 53 (see C.3).

### B.2 Asynchronous input _(added)_

When a row is set to **Input asíncrono**, **every** `Input` in the program reads the live keyboard queue instead of the text queues, and never waits:

- a key is waiting: `Input` returns its code and removes it from the queue;
- no key is waiting: `Input` returns `-1`, which in 16 bits is `FFFF`. `Skipcond 000` (AC < 0) detects it. Note that `0` is a valid key code (NUL), so test "< 0", not "= 0".

The text queues of the other rows are kept, so you can switch back to the traditional mode. The asynchronous setting is saved with the project. The text box of the asynchronous row is replaced by a note.

### B.3 When is Extended Hardware Mode needed?

| You want to…                                                    | Asynchronous input | Extended Hardware Mode |
| --------------------------------------------------------------- | ------------------ | ---------------------- |
| Poll the keyboard with `Input` (never blocks)                   | required           | not needed             |
| Know whether a key is **still held**, or detect its **release** | optional           | **required** (MMIO)    |
| Read the list of physical key events (down / up)                | optional           | **required**           |
| Use the timer (`EF7`, `EFE`)                                    | optional           | **required**           |
| Run classic MARIE programs                                      | off                | off                    |

Both features are independent and can be combined. The keyboard capture area appears when at least one of them is on.

## C. Keyboard codes

Several numbering systems appear in this project. **Do not mix them.**

| System                         | Used by                                               | Range                  | Example for the key D      |
| ------------------------------ | ----------------------------------------------------- | ---------------------- | -------------------------- |
| ASCII / Latin-1 character code | value returned by `Input` for text keys               | 0–255                  | `d` = 100, `D` = 68        |
| Simulator special codes        | value returned by `Input` for non-text keys           | 256–259, 512 and above | Up arrow = 256, F1 = 570   |
| USB HID usage id               | MMIO registers (`EFA`, `EFF`) and the HID table (C.8) | 4–231                  | physical position of D = 7 |
| MMIO register values           | bit masks in `EF8`, `EF9`, `EFB`, `EFC`               | small bit fields       | see section F              |

`Input` never returns a HID id, and the MMIO registers never hold a character code. A key has **two different numbers**: what it types (`Input`) and where it is (HID).

### C.1 No input

| Meaning        | Decimal | Hexadecimal | Encoding                | Description                                               |
| -------------- | ------: | ----------- | ----------------------- | --------------------------------------------------------- |
| No key waiting |      −1 | `FFFF`      | 16-bit two's complement | Returned by asynchronous `Input` when the queue is empty. |
| NUL character  |       0 | `0000`      | ASCII                   | A real value (for example Ctrl+@). Not "no key".          |

### C.2 Control and navigation keys

| Key                 | Decimal | Hexadecimal | Encoding       | Description     |
| ------------------- | ------: | ----------- | -------------- | --------------- |
| Backspace           |       8 | `0008`      | ASCII control  | Backspace       |
| Tab                 |       9 | `0009`      | ASCII control  | Tab             |
| Enter, Numpad Enter |      13 | `000D`      | ASCII control  | Carriage return |
| Escape              |      27 | `001B`      | ASCII control  | Escape          |
| Space               |      32 | `0020`      | ASCII          | Space character |
| Delete              |     127 | `007F`      | ASCII control  | Delete          |
| Up arrow            |     256 | `0100`      | simulator code | Arrow up        |
| Down arrow          |     257 | `0101`      | simulator code | Arrow down      |
| Left arrow          |     258 | `0102`      | simulator code | Arrow left      |
| Right arrow         |     259 | `0103`      | simulator code | Arrow right     |

The arrow values were checked against `logicalCodes` in `src/keyboard.ts`: Up = 256, Down = 257, Left = 258, Right = 259.

### C.3 Characters

Text keys return the character produced by your keyboard layout (the browser's `key` value), as an ASCII or Latin-1 code. Capital and small letters have **different** codes (`A` = 65, `a` = 97, difference 32), so Shift or Caps Lock change the result.

**Why is the key `1` not 1?** `Input` returns the code of the _character_ written on the key. The character "1" is code 49 in ASCII, while the number 1 is the value 1. To convert a digit key to its number subtract 48 (example E.5). The physical position of that key, HID id 30, is yet another number and is only seen through MMIO.

**Digits**

| Key | Decimal | Hexadecimal | Encoding | Description       |
| --- | ------- | ----------- | -------- | ----------------- |
| `0` | 48      | `0030`      | ASCII    | Digit character 0 |
| `1` | 49      | `0031`      | ASCII    | Digit character 1 |
| `2` | 50      | `0032`      | ASCII    | Digit character 2 |
| `3` | 51      | `0033`      | ASCII    | Digit character 3 |
| `4` | 52      | `0034`      | ASCII    | Digit character 4 |
| `5` | 53      | `0035`      | ASCII    | Digit character 5 |
| `6` | 54      | `0036`      | ASCII    | Digit character 6 |
| `7` | 55      | `0037`      | ASCII    | Digit character 7 |
| `8` | 56      | `0038`      | ASCII    | Digit character 8 |
| `9` | 57      | `0039`      | ASCII    | Digit character 9 |

**Upper-case letters**

| Key | Decimal | Hexadecimal | Encoding | Description    |
| --- | ------- | ----------- | -------- | -------------- |
| `A` | 65      | `0041`      | ASCII    | Capital letter |
| `B` | 66      | `0042`      | ASCII    | Capital letter |
| `C` | 67      | `0043`      | ASCII    | Capital letter |
| `D` | 68      | `0044`      | ASCII    | Capital letter |
| `E` | 69      | `0045`      | ASCII    | Capital letter |
| `F` | 70      | `0046`      | ASCII    | Capital letter |
| `G` | 71      | `0047`      | ASCII    | Capital letter |
| `H` | 72      | `0048`      | ASCII    | Capital letter |
| `I` | 73      | `0049`      | ASCII    | Capital letter |
| `J` | 74      | `004A`      | ASCII    | Capital letter |
| `K` | 75      | `004B`      | ASCII    | Capital letter |
| `L` | 76      | `004C`      | ASCII    | Capital letter |
| `M` | 77      | `004D`      | ASCII    | Capital letter |
| `N` | 78      | `004E`      | ASCII    | Capital letter |
| `O` | 79      | `004F`      | ASCII    | Capital letter |
| `P` | 80      | `0050`      | ASCII    | Capital letter |
| `Q` | 81      | `0051`      | ASCII    | Capital letter |
| `R` | 82      | `0052`      | ASCII    | Capital letter |
| `S` | 83      | `0053`      | ASCII    | Capital letter |
| `T` | 84      | `0054`      | ASCII    | Capital letter |
| `U` | 85      | `0055`      | ASCII    | Capital letter |
| `V` | 86      | `0056`      | ASCII    | Capital letter |
| `W` | 87      | `0057`      | ASCII    | Capital letter |
| `X` | 88      | `0058`      | ASCII    | Capital letter |
| `Y` | 89      | `0059`      | ASCII    | Capital letter |
| `Z` | 90      | `005A`      | ASCII    | Capital letter |

**Lower-case letters**

| Key | Decimal | Hexadecimal | Encoding | Description  |
| --- | ------- | ----------- | -------- | ------------ |
| `a` | 97      | `0061`      | ASCII    | Small letter |
| `b` | 98      | `0062`      | ASCII    | Small letter |
| `c` | 99      | `0063`      | ASCII    | Small letter |
| `d` | 100     | `0064`      | ASCII    | Small letter |
| `e` | 101     | `0065`      | ASCII    | Small letter |
| `f` | 102     | `0066`      | ASCII    | Small letter |
| `g` | 103     | `0067`      | ASCII    | Small letter |
| `h` | 104     | `0068`      | ASCII    | Small letter |
| `i` | 105     | `0069`      | ASCII    | Small letter |
| `j` | 106     | `006A`      | ASCII    | Small letter |
| `k` | 107     | `006B`      | ASCII    | Small letter |
| `l` | 108     | `006C`      | ASCII    | Small letter |
| `m` | 109     | `006D`      | ASCII    | Small letter |
| `n` | 110     | `006E`      | ASCII    | Small letter |
| `o` | 111     | `006F`      | ASCII    | Small letter |
| `p` | 112     | `0070`      | ASCII    | Small letter |
| `q` | 113     | `0071`      | ASCII    | Small letter |
| `r` | 114     | `0072`      | ASCII    | Small letter |
| `s` | 115     | `0073`      | ASCII    | Small letter |
| `t` | 116     | `0074`      | ASCII    | Small letter |
| `u` | 117     | `0075`      | ASCII    | Small letter |
| `v` | 118     | `0076`      | ASCII    | Small letter |
| `w` | 119     | `0077`      | ASCII    | Small letter |
| `x` | 120     | `0078`      | ASCII    | Small letter |
| `y` | 121     | `0079`      | ASCII    | Small letter |
| `z` | 122     | `007A`      | ASCII    | Small letter |

**Punctuation and symbols** (the ASCII printable range, space included in C.2)

| Key     | Decimal | Hexadecimal | Encoding | Description       |
| ------- | ------- | ----------- | -------- | ----------------- |
| `!`     | 33      | `0021`      | ASCII    | exclamation mark  |
| `"`     | 34      | `0022`      | ASCII    | double quote      |
| `#`     | 35      | `0023`      | ASCII    | number sign       |
| `$`     | 36      | `0024`      | ASCII    | dollar sign       |
| `%`     | 37      | `0025`      | ASCII    | percent           |
| `&`     | 38      | `0026`      | ASCII    | ampersand         |
| `'`     | 39      | `0027`      | ASCII    | apostrophe        |
| `(`     | 40      | `0028`      | ASCII    | left parenthesis  |
| `)`     | 41      | `0029`      | ASCII    | right parenthesis |
| `*`     | 42      | `002A`      | ASCII    | asterisk          |
| `+`     | 43      | `002B`      | ASCII    | plus              |
| `,`     | 44      | `002C`      | ASCII    | comma             |
| `-`     | 45      | `002D`      | ASCII    | minus / hyphen    |
| `.`     | 46      | `002E`      | ASCII    | period            |
| `/`     | 47      | `002F`      | ASCII    | slash             |
| `:`     | 58      | `003A`      | ASCII    | colon             |
| `;`     | 59      | `003B`      | ASCII    | semicolon         |
| `<`     | 60      | `003C`      | ASCII    | less than         |
| `=`     | 61      | `003D`      | ASCII    | equals            |
| `>`     | 62      | `003E`      | ASCII    | greater than      |
| `?`     | 63      | `003F`      | ASCII    | question mark     |
| `@`     | 64      | `0040`      | ASCII    | at sign           |
| `[`     | 91      | `005B`      | ASCII    | left bracket      |
| `\`     | 92      | `005C`      | ASCII    | backslash         |
| `]`     | 93      | `005D`      | ASCII    | right bracket     |
| `^`     | 94      | `005E`      | ASCII    | caret             |
| `_`     | 95      | `005F`      | ASCII    | underscore        |
| `` ` `` | 96      | `0060`      | ASCII    | backquote         |
| `{`     | 123     | `007B`      | ASCII    | left brace        |
| `\|`    | 124     | `007C`      | ASCII    | vertical bar      |
| `}`     | 125     | `007D`      | ASCII    | right brace       |
| `~`     | 126     | `007E`      | ASCII    | tilde             |

**Latin-1 characters (128–255).** Characters of the browser's `key` with a code up to 255 are delivered unchanged: for example `Ñ` = 209, `ñ` = 241, `á` = 225, `é` = 233, `í` = 237, `ó` = 243, `ú` = 250, `ü` = 252, `¿` = 191, `¡` = 161. Characters above 255 (for example the euro sign), dead keys (`Dead`), IME composition and unidentified keys produce **no** `Input` value (they may still generate physical events). The virtual keyboard offers direct keys for ñ, á, é, í, ó, ú and ü.

**Ctrl combinations.** With Ctrl held (and not Alt), an ASCII character from `@` to `_` (letters are first converted to upper case) is delivered as a control character: Ctrl+A = 1, Ctrl+Z = 26, Ctrl+@ = 0, Ctrl+[ = 27, Ctrl+\\ = 28, Ctrl+] = 29, Ctrl+^ = 30, Ctrl+\_ = 31. AltGr text is kept as text.

### C.4 Function keys, modifiers and other special keys

Named keys that have no character are delivered as **512 + HID id**. This range cannot collide with characters (0–255) or arrows (256–259).

| Key                          |   Decimal | Hexadecimal     | Encoding        | Description                         |
| ---------------------------- | --------: | --------------- | --------------- | ----------------------------------- |
| F1 … F12                     |   570–581 | `023A`–`0245`   | 512 + HID 58–69 | Function keys (F1 = 570, F12 = 581) |
| Caps Lock                    |       569 | `0239`          | 512 + 57        | Caps Lock                           |
| Print Screen                 |       582 | `0246`          | 512 + 70        | Print Screen                        |
| Scroll Lock                  |       583 | `0247`          | 512 + 71        | Scroll Lock                         |
| Pause                        |       584 | `0248`          | 512 + 72        | Pause                               |
| Insert                       |       585 | `0249`          | 512 + 73        | Insert                              |
| Home                         |       586 | `024A`          | 512 + 74        | Home                                |
| Page Up                      |       587 | `024B`          | 512 + 75        | Page Up                             |
| End                          |       589 | `024D`          | 512 + 77        | End                                 |
| Page Down                    |       590 | `024E`          | 512 + 78        | Page Down                           |
| Num Lock                     |       595 | `0253`          | 512 + 83        | Num Lock                            |
| Menu (context menu)          |       613 | `0265`          | 512 + 101       | Context menu key                    |
| Intl Ro / Intl Yen           | 647 / 649 | `0287` / `0289` | 512 + 135 / 137 | Japanese layout keys                |
| Left Ctrl / Right Ctrl       | 736 / 740 | `02E0` / `02E4` | 512 + 224 / 228 | Control                             |
| Left Shift / Right Shift     | 737 / 741 | `02E1` / `02E5` | 512 + 225 / 229 | Shift                               |
| Left Alt / Right Alt (AltGr) | 738 / 742 | `02E2` / `02E6` | 512 + 226 / 230 | Alt, AltGr                          |
| Left Meta / Right Meta       | 739 / 743 | `02E3` / `02E7` | 512 + 227 / 231 | Windows / Command key               |

Modifier keys are queued like any other key. Pressing Shift and then A delivers 737 and then 65. A program should simply ignore codes it does not use. Releasing a key never adds anything to the `Input` queue.

### C.5 The numeric keypad

Keypad digits and operators return the same characters as the main keyboard (keypad `1` = 49, `+` = 43, `/` = 47), with the keypad's own HID ids (C.8). Num Enter returns 13. What the keypad types depends on Num Lock, as reported by the browser.

### C.6 Modifier bits (MMIO)

The status register `EF9` reports the modifiers that are currently held in its high byte. These are **bit flags**, not key codes.

| Bit | Value in `EF9` | Meaning    |
| --: | -------------: | ---------- |
|   8 |   256 (`0100`) | Shift held |
|   9 |   512 (`0200`) | Ctrl held  |
|  10 |  1024 (`0400`) | Alt held   |
|  11 |  2048 (`0800`) | Meta held  |
|  12 |  4096 (`1000`) | AltGr held |

### C.7 Where each system appears

| You read…                              | Value is…                                                      |
| -------------------------------------- | -------------------------------------------------------------- |
| `Input` (asynchronous)                 | ASCII/Latin-1 (0–255), arrows (256–259), special (512+), or −1 |
| `EFA` (key select), `EFF` (event code) | USB HID id (4–231)                                             |
| `EFB`, `EFC`, `EFD`, `EF9`             | bit fields and counters                                        |

### C.8 USB HID ids of the physical keys

The id identifies the **position** of a key, independent of layout or Shift (the browser's `KeyboardEvent.code` names are shown in the first column). The third column shows what `Input` returns for that key **without modifiers**; "character" means the character of your layout (for example `a`), and a number is fixed.

| `KeyboardEvent.code` | HID id | `Input` without modifiers |
| -------------------- | ------ | ------------------------- |
| KeyA                 | 4      | character                 |
| KeyB                 | 5      | character                 |
| KeyC                 | 6      | character                 |
| KeyD                 | 7      | character                 |
| KeyE                 | 8      | character                 |
| KeyF                 | 9      | character                 |
| KeyG                 | 10     | character                 |
| KeyH                 | 11     | character                 |
| KeyI                 | 12     | character                 |
| KeyJ                 | 13     | character                 |
| KeyK                 | 14     | character                 |
| KeyL                 | 15     | character                 |
| KeyM                 | 16     | character                 |
| KeyN                 | 17     | character                 |
| KeyO                 | 18     | character                 |
| KeyP                 | 19     | character                 |
| KeyQ                 | 20     | character                 |
| KeyR                 | 21     | character                 |
| KeyS                 | 22     | character                 |
| KeyT                 | 23     | character                 |
| KeyU                 | 24     | character                 |
| KeyV                 | 25     | character                 |
| KeyW                 | 26     | character                 |
| KeyX                 | 27     | character                 |
| KeyY                 | 28     | character                 |
| KeyZ                 | 29     | character                 |
| Digit1               | 30     | character                 |
| Digit2               | 31     | character                 |
| Digit3               | 32     | character                 |
| Digit4               | 33     | character                 |
| Digit5               | 34     | character                 |
| Digit6               | 35     | character                 |
| Digit7               | 36     | character                 |
| Digit8               | 37     | character                 |
| Digit9               | 38     | character                 |
| Digit0               | 39     | character                 |
| F1                   | 58     | 570                       |
| F2                   | 59     | 571                       |
| F3                   | 60     | 572                       |
| F4                   | 61     | 573                       |
| F5                   | 62     | 574                       |
| F6                   | 63     | 575                       |
| F7                   | 64     | 576                       |
| F8                   | 65     | 577                       |
| F9                   | 66     | 578                       |
| F10                  | 67     | 579                       |
| F11                  | 68     | 580                       |
| F12                  | 69     | 581                       |
| Numpad1              | 89     | character                 |
| Numpad2              | 90     | character                 |
| Numpad3              | 91     | character                 |
| Numpad4              | 92     | character                 |
| Numpad5              | 93     | character                 |
| Numpad6              | 94     | character                 |
| Numpad7              | 95     | character                 |
| Numpad8              | 96     | character                 |
| Numpad9              | 97     | character                 |
| Enter                | 40     | 13                        |
| Escape               | 41     | 27                        |
| Backspace            | 42     | 8                         |
| Tab                  | 43     | 9                         |
| Space                | 44     | 32                        |
| Minus                | 45     | character                 |
| Equal                | 46     | character                 |
| BracketLeft          | 47     | character                 |
| BracketRight         | 48     | character                 |
| Backslash            | 49     | character                 |
| Semicolon            | 51     | character                 |
| Quote                | 52     | character                 |
| Backquote            | 53     | character                 |
| Comma                | 54     | character                 |
| Period               | 55     | character                 |
| Slash                | 56     | character                 |
| CapsLock             | 57     | 569                       |
| PrintScreen          | 70     | 582                       |
| ScrollLock           | 71     | 583                       |
| Pause                | 72     | 584                       |
| Insert               | 73     | 585                       |
| Home                 | 74     | 586                       |
| PageUp               | 75     | 587                       |
| Delete               | 76     | 127                       |
| End                  | 77     | 589                       |
| PageDown             | 78     | 590                       |
| ArrowRight           | 79     | 259                       |
| ArrowLeft            | 80     | 258                       |
| ArrowDown            | 81     | 257                       |
| ArrowUp              | 82     | 256                       |
| NumLock              | 83     | 595                       |
| NumpadDivide         | 84     | character                 |
| NumpadMultiply       | 85     | character                 |
| NumpadSubtract       | 86     | character                 |
| NumpadAdd            | 87     | character                 |
| NumpadEnter          | 88     | 13                        |
| Numpad0              | 98     | character                 |
| NumpadDecimal        | 99     | character                 |
| IntlBackslash        | 100    | character                 |
| ContextMenu          | 101    | 613                       |
| NumpadEqual          | 103    | character                 |
| IntlRo               | 135    | 647                       |
| IntlYen              | 137    | 649                       |
| ControlLeft          | 224    | 736                       |
| ShiftLeft            | 225    | 737                       |
| AltLeft              | 226    | 738                       |
| MetaLeft             | 227    | 739                       |
| ControlRight         | 228    | 740                       |
| ShiftRight           | 229    | 741                       |
| AltRight             | 230    | 742                       |
| MetaRight            | 231    | 743                       |

Keys not in this table are ignored. The browser or the operating system may reserve some combinations (Alt+Tab, Ctrl+W, media keys, some F-keys), so they may never reach the simulator.

## D. Real-time keyboard input

### D.1 Set up

1. In the **Inputs** panel choose **Input asíncrono** in the format selector of a row (use **Add additional input** if you need a new row). This turns asynchronous mode on for the whole program.
2. Optionally switch on **Extended Hardware Mode** in the **Hardware extendido** panel (needed only for the features in B.3).
3. Write your program, press **Assemble**, then **Run**.
4. In **Hardware extendido** click the wide **Capturar teclado** button. It turns blue and reads **Teclado capturando — haz clic fuera para salir**: the keyboard is now connected to the simulator.

### D.2 Keeping the focus

Physical keys reach the simulator **only while the capture button has the keyboard focus**. This prevents interference with the editor and other fields. Clicking anywhere else, switching to another window or tab, or hiding the page ends the capture: all keys are released and both queues are emptied, without generating artificial key-up events. Click the capture button again to continue. Pressing Run, Pause or any other button also moves the focus, so press them before you start playing.

Focusing the capture button also starts with clean queues, so keys pressed before the capture started are not kept: press the keys while the program runs.

### D.3 The two queues

Every key press feeds two independent first-in-first-out queues, each with **capacity 64**:

| Queue                                    | Contains                                                     | Consumed by                              |
| ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Character queue ("INPUT pendientes")     | One entry per key press that has a code (C.2–C.4)            | `Input` (asynchronous)                   |
| Physical event queue ("Eventos físicos") | Key-down (type 1) and key-up (type 2) events with the HID id | `ACK` register `EF8` (extended hardware) |

Reading one queue never consumes the other. The panel shows the number of pending entries, the list of pressed keys ("Presionadas"), the next physical event ("Siguiente") and the modifier bits.

### D.4 Empty queue, consecutive presses

`Input` returns `-1` when the character queue is empty. Fast consecutive presses are queued in order and consumed one per `Input`, so a program that polls slower than you type will see every key, as long as the queue (64) does not fill up.

### D.5 Overflow

When a queue is full the **new** entry is discarded; earlier entries keep their order, and a sticky overflow flag is set (character queue: bit 2 = 4 of `EF9`; physical queue: bit 3 = 8). The panel shows "Overflow: Sí (se descartó el nuevo)". The held/released state still updates. The flags are cleared by writing 2 to `EF8` (and by Restart or clearing the keyboard).

### D.6 Held keys, release and auto-repeat

- The simulator keeps the **held state** of every key. While a key is held, only the first key-down is accepted: **operating-system auto-repeat is ignored**, so holding a key does not flood the queue.
- Releasing a key records a key-up event and sets a **release latch** for that key. Releasing never adds a character.
- To know whether a key is still held, or to see releases, use the MMIO registers (section F and examples E.10–E.11). With `Input` alone you only learn about presses.

### D.7 Physical keyboard

Only keys listed in C.8 are recognised. The key's position decides its HID id; the character comes from your layout. Combinations reserved by the browser or system may not arrive.

### D.8 Virtual keyboard

The **Teclado virtual** section (a collapsible list) shows every key as a button. Pressing a button with the mouse sends the same events as a physical key: hold the button to hold the key. The checkbox **Enclavar teclas (clic mantiene / clic libera)** latches keys: one click holds, the next click releases, so you can hold two keys (for example D and Space) with a mouse. Shift, Ctrl and Alt buttons change the characters of the other buttons (US layout symbols). Accented letters are extra buttons that use the physical position of their base letter.

### D.9 Resetting inputs

- **Limpiar teclado y colas** releases all keys and empties both queues and the latches. The key selected by the program (`EFA`) is kept.
- **Restart**, **Assemble**, loading another project and changing the hardware mode reset the keyboard (including the selector) and the timer counter.
- Pressed keys and events are session state: they are **not** saved in the project.

### D.10 Reversible execution

The history stores a snapshot of the devices whenever an instruction reads or writes an MMIO register or consumes an asynchronous `Input`. Stepping back restores the **queues, the key selector, the release latch, the overflow flags, the timer period/counter/phase** to what they were.

- **Held keys and AltGr are not restored**: they describe your fingers now, not the program's past. (Earlier builds restored them, which could resurrect keys you had already released; this was fixed in commit `081f05f`.)
- While you are stepping back, the timer is **frozen** and the capture **rejects new key events**; the panel shows "Historial congelado. Continúa o avanza un paso para aceptar eventos nuevos." Time resumes from the restored value without adding the time you spent paused.
- The history cannot replay keystrokes that the program never received, and it does not exist in fast mode.
- Clicking a button outside the hardware panel ends the capture and releases all keys.

## E. Assembly programming examples

The examples build on each other. Every listing was **assembled with the project's assembler and executed on the simulator engine** (`MarieSim`) by an automated check that injected the key presses described under "Expected behavior" and compared the output or display cells. They were **not** clicked through in the browser interface, and the timer examples (E.12, E.14) depended on real elapsed time. The check is not part of the repository; the listings are copied from the verified files.

For every example, "Setup" lists what to switch on, then paste the code, press **Assemble** and **Run**. For examples that poll the keyboard, click **Capturar teclado** after Run and press the keys (D.1–D.2); stop them with **Pause**.

### E.1 Traditional blocking `Input`

**Goal.** Read two numbers typed in advance and print their sum.
**Setup.** No hardware options. In **Inputs** choose **Decimal** and type `3`, a new line, and `4`.

```mas
/ Traditional blocking INPUT: reads two numbers and prints their sum.
/ Setup: any numeric input format; type two numbers in the Inputs panel first.
Input           / waits until a value is available in the Inputs panel
Store X
Input
Store Y
Load X
Add Y
Output
Halt

X, DEC 0
Y, DEC 0
```

**Walk-through.** `Input` takes the next queued value into AC; `Store` saves it. After two reads, `Load X` / `Add Y` computes the sum and `Output` prints it.
**Expected.** The Output log shows 7. With the queue empty, the program pauses at the first `Input` and waits.
**Common mistakes.** Forgetting to type the numbers; using Hexadecimal and typing `10` (that is 16).

### E.2 Non-blocking `Input`, waiting for a key

**Goal.** Poll until a key arrives, then print its code.
**Setup.** Set a row to **Input asíncrono**.

```mas
/ Asynchronous INPUT: poll until a key arrives, then print its code.
/ Setup: set an input row to "Input asíncrono"; capture the keyboard.
Wait,  Input
       Skipcond 000     / skip the next line if AC < 0 (no key)
       Jump Got
       Jump Wait        / no key: try again, the CPU never blocks
Got,   Output
       Halt
```

**Walk-through.** `Input` never waits. `Skipcond 000` skips the next line only when AC is negative (no key). With a key, `Jump Got` is executed; otherwise the program reaches `Jump Wait` and polls again.
**Expected.** Press `a` in the capture area: Output shows 97 (hex 61), then the program halts.
**Common mistakes.** Using `Skipcond 400` (tests "= 0", which is the NUL character); forgetting the capture focus.

### E.3 Detecting an empty input

**Goal.** Show that the program keeps running without keys: count the polls that found nothing.
**Setup.** **Input asíncrono**. Press **Run**, then capture the keyboard and press a key.

```mas
/ Detect an empty input without waiting: counts how many polls found no key,
/ then prints that number when a key finally arrives.
/ Setup: "Input asíncrono". Press Run first, then capture the keyboard and press a key.
Poll,   Input
        Skipcond 000     / AC < 0 means "no key"
        Jump HasKey
        Load Empty       / empty branch: count it and poll again
        Add One
        Store Empty
        Jump Poll
HasKey, Load Empty
        Output
        Halt

Empty,  DEC 0
One,    DEC 1
```

**Walk-through.** When `Input` returns −1 the `Skipcond 000` skips `Jump HasKey`, so the empty branch increments `Empty` and polls again. A key makes AC non-negative and the program prints the counter.
**Expected.** One number: how many empty polls happened before the key (it grows the longer you wait).
**Common mistakes.** Testing for 0 instead of "< 0".

### E.4 Detecting a letter

**Goal.** Print 1 if the key is a letter (A–Z or a–z), otherwise 0.
**Setup.** **Input asíncrono**.

```mas
/ Is the next key a letter? Prints 1 for A-Z or a-z, otherwise 0.
/ Setup: "Input asíncrono".
Poll,    Input
         Skipcond 000
         Jump Got
         Jump Poll
Got,     Store Key
         Subt UpperA        / Key - 65
         Skipcond 000       / skip if Key < 65
         Jump UpperEnd
         Jump CheckLow
UpperEnd, Load Key
         Subt AfterZ        / Key - 91
         Skipcond 000       / skip if Key <= 90
         Jump CheckLow
         Jump IsLetter
CheckLow, Load Key
         Subt LowerA        / Key - 97
         Skipcond 000       / skip if Key < 97
         Jump LowEnd
         Jump NotLetter
LowEnd,  Load Key
         Subt Afterz        / Key - 123
         Skipcond 000       / skip if Key <= 122
         Jump NotLetter
IsLetter, Load One
         Output
         Halt
NotLetter, Load Zero
         Output
         Halt

Key,     DEC 0
UpperA,  DEC 65
AfterZ,  DEC 91
LowerA,  DEC 97
Afterz,  DEC 123
Zero,    DEC 0
One,     DEC 1
```

**Walk-through.** The code subtracts range limits and uses `Skipcond 000` ("below the limit"). Letters are the ranges 65–90 and 97–122, so the checks use 65, 91, 97 and 123.
**Expected.** `a`, `Z` → 1; `5`, `[`, space → 0.
**Common mistakes.** Forgetting that capital and small letters are different codes; off-by-one limits (90 vs 91).

### E.5 Detecting a number

**Goal.** Print the numeric value of a digit key, or 10 if the key is not a digit.
**Setup.** **Input asíncrono**.

```mas
/ Is the next key a digit? Prints its value 0-9, or 10 for "not a digit".
/ Setup: "Input asíncrono". The key 1 arrives as ASCII 49, so we subtract 48.
Poll,    Input
         Skipcond 000
         Jump Got
         Jump Poll
Got,     Subt Char0         / AC = key - 48
         Store Value
         Skipcond 000       / skip if negative (below the digit 0)
         Jump Upper
         Jump Bad
Upper,   Load Value
         Subt Ten           / Value - 10
         Skipcond 000       / skip if Value <= 9
         Jump Bad
         Load Value
         Output
         Halt
Bad,     Load Ten
         Output
         Halt

Value,   DEC 0
Char0,   DEC 48
Ten,     DEC 10
```

**Walk-through.** The key `7` arrives as 55; subtracting 48 gives 7. Negative results are below the digit `0`; results of 10 or more are above `9`.
**Expected.** `7` → 7; `a` → 10.
**Common mistakes.** Treating the key code as the number (`7` ≠ 7).

### E.6 Detecting the arrow keys

**Goal.** Print 1, 2, 3 or 4 for up, down, left, right, and keep polling.
**Setup.** **Input asíncrono**.

```mas
/ Arrow keys: prints 1 = up, 2 = down, 3 = left, 4 = right, then keeps polling.
/ Setup: "Input asíncrono". Arrow codes are 256, 257, 258, 259.
Poll,    Input
         Skipcond 000
         Jump Got
         Jump Poll
Got,     Store Key
         Subt Up
         Skipcond 400       / skip if Key = 256
         Jump TestDown
         Load One
         Jump Show
TestDown, Load Key
         Subt Down
         Skipcond 400
         Jump TestLeft
         Load Two
         Jump Show
TestLeft, Load Key
         Subt Left
         Skipcond 400
         Jump TestRight
         Load Three
         Jump Show
TestRight, Load Key
         Subt Right
         Skipcond 400
         Jump Poll          / some other key: ignore
         Load Four
Show,    Output
         Jump Poll

Key,     DEC 0
Up,      DEC 256
Down,    DEC 257
Left,    DEC 258
Right,   DEC 259
One,     DEC 1
Two,     DEC 2
Three,   DEC 3
Four,    DEC 4
```

**Walk-through.** The arrows are 256–259 (C.2). Each test subtracts a constant and `Skipcond 400` skips when the result is zero (a match).
**Expected.** Up → 1, Down → 2, Left → 3, Right → 4. Other keys are ignored.
**Common mistakes.** Using ASCII values for arrows; assuming a 8-bit value (256 does not fit in a byte).

### E.7 WASD controls

**Goal.** Same as E.6 for W, A, S and D.
**Setup.** **Input asíncrono**.

```mas
/ WASD: prints 1 = W, 2 = A, 3 = S, 4 = D (lower case), then keeps polling.
/ Setup: "Input asíncrono". ASCII: w = 119, a = 97, s = 115, d = 100.
Poll,    Input
         Skipcond 000
         Jump Got
         Jump Poll
Got,     Store Key
         Subt KeyW
         Skipcond 400
         Jump TestA
         Load One
         Jump Show
TestA,   Load Key
         Subt KeyA
         Skipcond 400
         Jump TestS
         Load Two
         Jump Show
TestS,   Load Key
         Subt KeyS
         Skipcond 400
         Jump TestD
         Load Three
         Jump Show
TestD,   Load Key
         Subt KeyD
         Skipcond 400
         Jump Poll
         Load Four
Show,    Output
         Jump Poll

Key,     DEC 0
KeyW,    DEC 119
KeyA,    DEC 97
KeyS,    DEC 115
KeyD,    DEC 100
One,     DEC 1
Two,     DEC 2
Three,   DEC 3
Four,    DEC 4
```

**Walk-through.** Letters are layout-dependent characters: small `w` = 119, `a` = 97, `s` = 115, `d` = 100. Capital letters (Shift or Caps Lock) are different codes and are not matched here.
**Expected.** `w` → 1, `a` → 2, `s` → 3, `d` → 4; `W` is ignored.
**Common mistakes.** Caps Lock on; a non-QWERTY layout (the character, not the position, is matched). Use the HID registers (E.10) for position-based controls.

### E.8 Different actions for different keys

**Goal.** `w` adds 1 to a counter, `s` subtracts 1, Space prints it, `q` halts.
**Setup.** **Input asíncrono**.

```mas
/ Different actions for different keys.
/   w = counter + 1,  s = counter - 1,  Space = print counter,  q = halt.
/ Setup: "Input asíncrono".
Poll,    Input
         Skipcond 000
         Jump Got
         Jump Poll
Got,     Store Key
         Subt KeyW
         Skipcond 400
         Jump TestS
         Load Counter
         Add One
         Store Counter
         Jump Poll
TestS,   Load Key
         Subt KeyS
         Skipcond 400
         Jump TestSpace
         Load Counter
         Subt One
         Store Counter
         Jump Poll
TestSpace, Load Key
         Subt Space
         Skipcond 400
         Jump TestQ
         Load Counter
         Output
         Jump Poll
TestQ,   Load Key
         Subt KeyQ
         Skipcond 400
         Jump Poll
         Halt

Key,     DEC 0
Counter, DEC 0
One,     DEC 1
KeyW,    DEC 119
KeyS,    DEC 115
Space,   DEC 32
KeyQ,    DEC 113
```

**Walk-through.** A chain of tests; every branch jumps back to `Poll` except `q`, which reaches `Halt`.
**Expected.** `w`, `w`, `s`, Space → Output shows 1; `q` halts.
**Common mistakes.** Forgetting `Jump Poll` at the end of a branch, so execution falls into the next test.

### E.9 A continuous interactive loop

**Goal.** A program that keeps running when no key is pressed: it repaints a pixel every pass and reacts to `x`.
**Setup.** **Input asíncrono**. Open the **Display** window.

```mas
/ Continuous interactive loop: the program keeps running with or without keys.
/ Every pass changes the colour of the first display pixel; x (120) halts.
/ Setup: "Input asíncrono".
Loop,    Load Frame
         Add One
         Store Frame
         Store 0F00         / first display pixel changes colour each pass
         Input
         Skipcond 000       / no key: skip to "Jump Loop"
         Jump Key
         Jump Loop
Key,     Subt KeyX
         Skipcond 400       / only x stops the program
         Jump Loop
         Halt

Frame,   DEC 0
One,     DEC 1
KeyX,    DEC 120
```

**Walk-through.** The loop increments `Frame`, stores it into the first display pixel, polls the keyboard once and goes back to the start. Only `x` (120) leads to `Halt`.
**Expected.** The top-left pixel changes colour continuously; pressing `x` stops it.
**Common mistakes.** Writing a loop that waits for a key: it would freeze the animation.

### E.10 Detecting a held key with MMIO

**Goal.** Light the first pixel while D is held.
**Setup.** **Extended Hardware Mode** on (asynchronous input not needed). **Display** open. Press Run, click **Capturar teclado**, then hold D.

```mas
/ Held key via MMIO: the first display pixel is white while D is held, black otherwise.
/ Setup: enable "Extended Hardware Mode". HID id of D = 7.
/ Never place your own data in EF7-EFF while the mode is on.
        Load KeyD
        Store 0EFA          / EFA: select the key to observe
Loop,   Load 0EFB           / EFB: bit 0 = held, bit 1 = released latch
        Store State
        Subt Two
        Skipcond 000        / skip if State < 2
        Store State         / State >= 2: keep only bit 0 (State - 2)
        Load State
        Skipcond 400        / skip if State = 0 (not held)
        Jump Held
        Load Black
        Store 0F00
        Jump Loop
Held,   Load White
        Store 0F00
        Jump Loop

State,  DEC 0
Two,    DEC 2
KeyD,   DEC 7
White,  HEX 7FFF
Black,  DEC 0
```

**Walk-through.** Register `EFA` selects the key by its **HID id** (D = 7, not 100). `EFB` returns a 2-bit state: bit 0 held, bit 1 released-since-acknowledged. Because bit 1 can be set together with bit 0, the code subtracts 2 when the value is 2 or more, keeping only bit 0.
**Expected.** White pixel while D is held; black otherwise.
**Common mistakes.** Using 100 (the character) as selector; leaving the capture area; placing data in `EF7`–`EFF`.

### E.11 Detecting a key release with MMIO

**Goal.** Print 1 every time D is released.
**Setup.** **Extended Hardware Mode** on; press Run, then capture and tap D.

```mas
/ Key release via MMIO: prints 1 each time D goes up (latched until acknowledged).
/ Setup: enable "Extended Hardware Mode".
        Load KeyD
        Store 0EFA          / select D
Loop,   Load 0EFB
        Subt Two
        Skipcond 000        / skip if state < 2 (no release latched)
        Jump Released
        Jump Loop
Released, Load One
        Output
        Load Four
        Store 0EF8          / EF8 value 4: clear the release latch of the selected key
        Jump Loop

Two,    DEC 2
Four,   DEC 4
One,    DEC 1
KeyD,   DEC 7
```

**Walk-through.** The release is **latched**: bit 1 of `EFB` stays set until acknowledged, even if the key is pressed again. Writing 4 to `EF8` clears the latch for the selected key.
**Expected.** One "1" per release. Without the acknowledge it would print forever.
**Common mistakes.** Forgetting `Store 0EF8`.

### E.12 Using the hardware timer

**Goal.** Print the tick counter every 500 ms.
**Setup.** **Extended Hardware Mode** on, then **Run** (the clock only runs while the program runs).

```mas
/ Hardware timer: sets a 500 ms period and prints the tick counter at every tick.
/ Setup: enable "Extended Hardware Mode", then Run (the timer only runs while running).
        Load Period
        Store 0EF7          / EF7: period in milliseconds
Loop,   Load 0EFE           / EFE: tick counter (wraps at 65536)
        Subt Last
        Skipcond 400        / skip if no new tick (difference = 0)
        Jump Tick
        Jump Loop
Tick,   Load 0EFE
        Store Last
        Output
        Jump Loop

Period, DEC 500
Last,   DEC 0
```

**Walk-through.** `EF7` sets the period in milliseconds. `EFE` counts ticks. The program remembers the last value and prints only when it changes.
**Expected.** 1, 2, 3 … one per half second; paused during Pause, Halt and stepping.
**Common mistakes.** Waiting for the timer while single-stepping (time does not pass); comparing `>` instead of `≠` when the counter wraps at 65536.

### E.13 Writing to the display

**Goal.** Light pixel (row 2, column 3).
**Setup.** None; open the **Display** window.

```mas
/ Display: lights pixel (row 2, column 3) using indirect addressing.
/ Setup: none (works in every mode). Pixel address = F00 + 16 * row + column.
        Load Base
        Add Offset          / F00 + 35
        Store Ptr
        Load White
        StoreI Ptr          / M[M[Ptr]] gets White
        Halt

Base,   HEX F00
Offset, DEC 35              / 16 * 2 + 3
Ptr,    DEC 0
White,  HEX 7FFF
```

**Walk-through.** `Store` needs a fixed address, so the pixel address is computed (`F00 + 35`) and stored in `Ptr`; `StoreI Ptr` writes to the address held in `Ptr`.
**Expected.** One white pixel on row 2, column 3 (the third row, fourth column).
**Common mistakes.** Writing outside `F00`–`FFF`; using decimal 3840 as `HEX F00`.

### E.14 Putting it together: a moving pixel

**Goal.** A game-loop skeleton: W/A/S/D choose a direction, and the pixel moves one cell per timer tick.
**Setup.** **Input asíncrono** and **Extended Hardware Mode** on. **Display** open.

```mas
/ Game-loop skeleton: move a white pixel with W/A/S/D, one step per timer tick.
/   read input -> update state -> update display -> repeat
/ Setup: "Input asíncrono" + "Extended Hardware Mode". No wall checks (see the guide).
        Load Period
        Store 0EF7          / 200 ms per tick
        Load Start
        Store Pos
        Jump Draw
Loop,   Input               / 1. read input (never blocks)
        Skipcond 000
        Jump Key
        Jump Tick
Key,    Store KeyV
        Subt KeyW
        Skipcond 400
        Jump TestA
        Load MinusRow
        Store Dir
        Jump Tick
TestA,  Load KeyV
        Subt KeyA
        Skipcond 400
        Jump TestS
        Load MinusOne
        Store Dir
        Jump Tick
TestS,  Load KeyV
        Subt KeyS
        Skipcond 400
        Jump TestD
        Load Row
        Store Dir
        Jump Tick
TestD,  Load KeyV
        Subt KeyD
        Skipcond 400
        Jump Tick
        Load One
        Store Dir
Tick,   Load 0EFE           / 2. update state only when the timer advanced
        Subt Last
        Skipcond 400
        Jump Update
        Jump Loop
Update, Load 0EFE
        Store Last
        Load Pos            / erase the old pixel
        Add Base
        Store Ptr
        Load Black
        StoreI Ptr
        Load Pos            / move
        Add Dir
        Store Pos
Draw,   Load Pos            / 3. draw the pixel at its (new) place
        Add Base
        Store Ptr
        Load White
        StoreI Ptr
        Jump Loop

Pos,      DEC 0
Dir,      DEC 0
Last,     DEC 0
KeyV,     DEC 0
Ptr,      DEC 0
Start,    DEC 120           / row 7, column 8
Period,   DEC 200
Base,     HEX F00
White,    HEX 7FFF
Black,    DEC 0
One,      DEC 1
MinusOne, DEC -1
Row,      DEC 16
MinusRow, DEC -16
KeyW,     DEC 119
KeyA,     DEC 97
KeyS,     DEC 115
KeyD,     DEC 100
```

**Walk-through.** Each pass reads input (never blocks) and updates the direction; the state is updated only when the timer advanced; then the display is updated: erase the old pixel, add `Dir` to `Pos`, draw the new one. The direction is kept, so the pixel keeps moving.
**Expected.** Starts at row 7, column 8 and moves every 200 ms in the last direction chosen.
**Common mistakes.** There are **no wall checks**: leaving the 256-cell range writes outside the display, possibly over data or code. A real game must check the position first.

## F. Extended Hardware Mode

### F.1 What it is

Extended Hardware Mode _(added)_ connects virtual peripherals to the MARIE memory so that a program can use them with ordinary `Load` and `Store` instructions. **No new instructions were added.** It was developed because plain `Input` can neither tell whether a key is held or released, nor measure time, which interactive programs need.

### F.2 Switching it on and off

Tick or untick **Extended Hardware Mode** in the **Hardware extendido** panel. The setting is saved with the project. Changing it **discards the execution history** (it is a new execution), and resets the devices. Projects saved by the original MARIE open with the mode off.

### F.3 Memory-mapped I/O

With **Memory-Mapped I/O** the registers of a device share the address space of memory: reading or writing `EFE` does not touch RAM but asks the timer device. The original display already worked this way (`F00`–`FFF`).

- **Mode on:** the nine words `EF7`–`EFF` are device registers. Everything else, including the display, is unchanged. Do not place your own code, data or pointers in `EF7`–`EFF`. The memory view shows live register values there.
- **Mode off:** `EF7`–`EFF` are ordinary RAM, exactly as in the original MARIE.js.
- Direct (`Load 0EFE`), indirect (`LoadI`, `StoreI`) and debugger accesses all reach the devices. A numeric operand must start with a digit (`0EFE`); for indirect access keep the address in a data word, for example `TimerPtr, HEX EFE` and `LoadI TimerPtr`.

### F.4 Register map

R = read, W = write. Reading never consumes anything. Values are 16 bits; written values are masked to 16 bits.

| Address     | Register (code name)                   | Access      | Description                                                                                                                                                                                                                                                       | Accepted values                                                                                          | Example                            |
| ----------- | -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `EF7`       | `TIMER_PERIOD` (`MMIO.PERIOD`)         | R/W         | Timer period in milliseconds. Default 300.                                                                                                                                                                                                                        | 1–65535. A write is clamped: 0 becomes 1; 65536 (low 16 bits = 0) becomes 1; 70000 (= 4464) becomes 4464 | `Store 0EF7`                       |
| `EF8`       | `KEY_ACK` (`MMIO.ACK`)                 | W (reads 0) | Acknowledge mask for the keyboard. Bit 0 (value 1): remove the oldest physical event. Bit 1 (value 2): clear both overflow flags. Bit 2 (value 4): clear the release latch of the selected key. Bits can be added: 5 = 1 + 4. It never empties the `Input` queue. | any mask 0–7                                                                                             | `Load Four` / `Store 0EF8`         |
| `EF9`       | `KEY_STATUS` (`MMIO.STATUS`)           | R           | Low byte: bit 0 (1) characters pending, bit 1 (2) physical events pending, bit 2 (4) character-queue overflow, bit 3 (8) physical-queue overflow. High byte: modifiers (C.6).                                                                                     | bit fields                                                                                               | `Load 0EF9`                        |
| `EFA`       | `KEY_SELECT` (`MMIO.SELECT`)           | R/W         | HID id of the key observed through `EFB`. Unknown ids simply give state 0. Kept when the capture is cleared.                                                                                                                                                      | 0–65535 (valid keys: C.8)                                                                                | `Load KeyD` / `Store 0EFA` (D = 7) |
| `EFB`       | `KEY_STATE` (`MMIO.SELECTED_STATE`)    | R           | State of the selected key: bit 0 (1) held now; bit 1 (2) released since the last `EF8` write with bit 2. Values 0–3; **3** means held again after a release not yet acknowledged.                                                                                 | 0, 1, 2, 3                                                                                               | `Load 0EFB`                        |
| `EFC`       | `KEY_EVENT_TYPE` (`MMIO.EVENT_TYPE`)   | R           | Type of the oldest physical event: 1 key down, 2 key up, 0 none.                                                                                                                                                                                                  | 0, 1, 2                                                                                                  | `Load 0EFC`                        |
| `EFD`       | `KEY_EVENT_COUNT` (`MMIO.EVENT_COUNT`) | R           | Number of pending physical events.                                                                                                                                                                                                                                | 0–64                                                                                                     | `Load 0EFD`                        |
| `EFE`       | `TIMER_COUNT` (`MMIO.COUNT`)           | R/W         | Timer ticks, modulo 65536. Writing sets the counter and restarts the current period.                                                                                                                                                                              | 0–65535                                                                                                  | `Load 0EFE`                        |
| `EFF`       | `KEY_EVENT_CODE` (`MMIO.EVENT_CODE`)   | R           | HID id of the oldest physical event, 0 if none.                                                                                                                                                                                                                   | 0, 4–231                                                                                                 | `Load 0EFF`                        |
| `F00`–`FFF` | Display                                | R/W         | 256 pixels (unchanged from the original).                                                                                                                                                                                                                         | 15-bit colour                                                                                            | `Store 0F00`                       |

### F.5 Using the registers

**Timer.** `EF7` sets the tick length; `EFE` counts ticks while the program runs. The time comes from the real clock (`performance.now()`), **not** from the number of instructions, so the speed of the game does not depend on the CPU speed slider. The timer runs only during **Run/Continue**; it is frozen by Pause, Halt, manual stepping and rewinding, and the paused time is not accumulated. Writing `EF7` first settles the ticks already elapsed and then restarts the period. Restart sets the counter to 0 and keeps the period. Because the counter wraps from 65535 to 0, measure intervals with the subtraction `current − previous` (modulo 65536), not with `>`. With a 300 ms period the counter wraps after about 5.5 hours.

**Limits of the timer.** Period 1 ms is accepted but the CPU may not be able to read every tick: if several ticks pass between two reads, your program sees only the final count and must decide how to catch up. The period field of the panel ("Periodo (ms)") accepts 1–65535 and writes `EF7` through a reversible access.

**Keyboard status.** `EF9` tells whether characters or events are waiting, whether a queue overflowed, and which modifiers are held. **Selected key and held keys.** Write the HID id to `EFA` and read `EFB` (E.10). **Releases.** Read bit 1 of `EFB` and acknowledge with `EF8` = 4 (E.11). **Events.** `EFC`, `EFF` and `EFD` describe the oldest event; write `EF8` = 1 to remove it and move to the next. **Overflow.** Check `EF9` bits 2 and 3, then write `EF8` = 2.

**Other peripherals.** The keyboard, the timer and the existing display are the only devices implemented.

### F.6 Side effects

| Access                                    | Effect                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Reading any register                      | None on the device (a read of `EFE` first accounts for elapsed time).   |
| Writing `EF7`                             | Clamps the period, settles elapsed ticks, restarts the period fraction. |
| Writing `EF8`                             | Applies the acknowledge mask to the keyboard.                           |
| Writing `EFA`                             | Changes the observed key.                                               |
| Writing `EFE`                             | Sets the counter, restarts the period fraction.                         |
| Writing `EF9`, `EFB`, `EFC`, `EFD`, `EFF` | Ignored: nothing changes and the RAM below is not modified.             |
| Any of the above while the history is on  | A snapshot of the devices is stored so stepping back can undo it.       |

## G. Game development

### G.1 The loop

A real-time program is a loop that never waits for the user:

```text
Read input  →  Update game state  →  Update display  →  Repeat
```

- **Read input.** Call `Input` once per pass (asynchronous mode). If it returns −1, carry on with the rest of the loop. Never loop on `Input` waiting for a key (as E.2 does): the whole game would freeze.
- **Update state.** Keep direction, positions and score in your own memory cells. Compare the timer (`EFE`) with the value you saw last time and update the world only when it changed, so the speed does not depend on how fast the CPU runs.
- **Update display.** Write the colour of changed pixels to `F00 + position`. Erase the old pixel before drawing the new one.
- **Repeat.** `Jump` to the top.

Example E.14 follows exactly this structure.

### G.2 Movement with arrows and WASD

Compare the value from `Input` with 256–259 (arrows) and 119, 97, 115, 100 (`w`, `a`, `s`, `d`). Convert the key into a **direction** stored in a variable, and let the timer step apply it. Support both sets by letting two tests set the same direction. With `Input` alone, a direction is set when the key is **pressed**. Remember that capital letters and different layouts give different codes.

### G.3 Consuming a press versus asking "is it held?"

| Question                                 | Tool                    | Behavior                                                                                      |
| ---------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| "Was a key pressed since I last looked?" | `Input`                 | Each press is consumed once, in order. Holding a key adds one entry (auto-repeat is ignored). |
| "Is D down right now?"                   | `EFA` / `EFB`           | Reports the current state; does not consume anything; no queue involved.                      |
| "Was D released?"                        | `EFB` bit 1 + `EF8` = 4 | Latched until you acknowledge it.                                                             |
| "What happened, in order?"               | `EFC`/`EFF` + `EF8` = 1 | Physical events with up/down, consumed one by one.                                            |

Use presses for menus and single actions; use held-state for continuous movement. The channels are independent, so you may combine them.

### G.4 Display and timer

The display has 256 pixels; a pixel's address is `F00 + 16 × row + column`. Use `StoreI` with an address computed in a variable (E.13). Choose a period that your program can serve between ticks: 100–300 ms is easy; very small values leave little time for the assembly code to run, especially at low CPU speed. Test first with stepping and a slow CPU, then raise the speed (and use fast mode only if you do not need to rewind).

### G.5 Checklist

1. Keep your variables and code out of `EF7`–`EFF` when the mode is on.
2. Do not stop the loop when `Input` returns −1.
3. Handle pause, loss of focus and restart: key state is cleared on every focus loss.
4. Check positions before moving, to stay inside `F00`–`FFF`.
5. If the program must be stepped backwards, do not use fast mode.

## H. Performance and troubleshooting

### H.1 Normal and fast execution

|                               | Normal                               | Fast mode                                                                   |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| Speed                         | set by the **Speed** slider (0–9)    | as fast as possible, in slices of at most 8 ms                              |
| Breakpoints                   | respected                            | ignored                                                                     |
| RTL log                       | recorded                             | not recorded                                                                |
| Execution history / step back | recorded                             | **not recorded**; turning fast mode on or off discards the previous history |
| Memory use                    | grows with every executed micro-step | does not grow                                                               |

In normal mode the history is **unbounded**. As a rough orientation measured in the project's audit (one Windows machine, Edge), a log entry retains about 99 bytes, so around one million micro-steps hold around 100 MB. A long program at maximum speed with history on keeps consuming memory and may slow or crash the tab. For long runs, games and demonstrations use fast mode; use normal mode for debugging and for stepping back.

### H.2 Troubleshooting

| Symptom                                         | Likely cause and fix                                                                                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No capture area ("Capturar teclado") is visible | Neither **Input asíncrono** nor **Extended Hardware Mode** is on.                                                                                                                      |
| Keys do nothing                                 | The capture button is not focused (click it; the label must read "Teclado capturando…"), or the program was not running, or the focus was lost (clicking elsewhere, switching window). |
| `Input` returns 65535 or −1                     | That is "no key". Test with `Skipcond 000`.                                                                                                                                            |
| Wrong code for a key                            | Check whether you want the character (`Input`, section C) or the position (HID id, MMIO). Capital versus small letters differ by 32. Check Caps Lock and your layout.                  |
| An arrow key does not match                     | Arrows are 256–259, not ASCII.                                                                                                                                                         |
| Shift appears before the letter                 | Modifiers are queued as codes 736–743; ignore them in your program.                                                                                                                    |
| A key seems stuck                               | Click **Limpiar teclado y colas**; the capture clears itself when focus is lost.                                                                                                       |
| Overflow flag is on                             | Your program is slower than your typing; poll faster or acknowledge with `EF8` = 2.                                                                                                    |
| The program is too slow for the timer           | Use a larger period (`EF7`), raise **Speed**, simplify the loop.                                                                                                                       |
| MMIO values are always 0 or unchanged           | **Extended Hardware Mode** is off (then `EF7`–`EFF` are plain RAM), or the timer is frozen (Pause, Halt, stepping, rewinding).                                                         |
| `Load EFE` loads a label                        | Use `Load 0EFE` (operands must start with a digit).                                                                                                                                    |
| Writing a register has no effect                | The register is read-only (`EF9`, `EFB`, `EFC`, `EFD`, `EFF`).                                                                                                                         |
| Cannot step back                                | The program is running, the history is empty, or fast mode was used.                                                                                                                   |
| Memory keeps growing                            | Normal-mode history is unbounded (H.1). Use fast mode or restart.                                                                                                                      |
| Browser shortcuts take the key                  | Alt+Tab, Ctrl+W and some function keys never reach the page; use the virtual keyboard.                                                                                                 |

## Further reading

- [changes.md](changes.md): what this project changed and how it is implemented.
- `public/diagnostics/`: four small programs (`async-input.mas`, `keyboard-mmio.mas`, `timer-display.mas`, `display-pixel.mas`) used by the automated tests. Load them with **File → Upload file**.
- [README.upstream.md](../README.upstream.md): the original MARIE.js README.
