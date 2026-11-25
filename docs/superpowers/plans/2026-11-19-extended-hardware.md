# Extended Hardware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Habilitar juegos en ensamblador mediante teclado, INPUT no bloqueante, MMIO y tiempo virtual.

**Architecture:** Controlador de teclado independiente alimenta INPUT y eventos físicos. Periférico con reloj inyectable se conecta a los accesos centrales del motor; panel Svelte ofrece captura y teclado virtual.

**Tech Stack:** TypeScript, Svelte 5, Vitest, Vite; sin nuevas dependencias.

**Spec:** ../specs/2026-11-19-async-input-design.md y solicitud ampliada aprobada por el usuario.

## Global Constraints

- No nuevos opcodes; clásico conserva RAM EF7–EFF y display F00–FFF.
- FIFO independientes de 64, descartar nuevo con overflow sticky, vacío INPUT=-1.
- Flechas arriba=256 abajo=257 izquierda=258 derecha=259; físicos USB HID.
- Timer ms monotónico congelado en pausa y pasos, contador módulo 65536.
- Mantener depuración, proyectos, entradas tradicionales y créditos MIT; no videojuegos.
- Ejecución autónoma, agentes y commits locales autorizados; origin oficial no es destino para push.

## Review Focus

- Proyecto/modo cambia con tecla mantenida: limpiar sin contaminar proyecto nuevo.
- MMIO indirecto y escritura RO: semántica idéntica a accesos directos.
- Blur con tecla/puntero activo: no quedan teclas atascadas.
- Rebobinado de ACK/INPUT: restaurar canal correcto sin consumir el otro.
- Pausa larga y overflow del reloj: no acumular ticks durante pausa.

## EXT-01 Auditoría y diseño

- [x] Mapear motor, callbacks y ciclo de ejecución; actualizar diseño y plan.
- [x] Baseline original: `npm run test -- --run src/marie.test.ts`, 28/28.
- [x] Commit docs en rama feat/extended-hardware.

## EXT-02/03/04 Teclado y canales

Files: src/keyboard.ts, src/keyboard.test.ts, docs/keyboard-codes.md.
Interface: KeyboardController.keyDown/keyUp(KeySignal):boolean; readInput():number; events, pressed, modifiers, status, select, selectedState; acknowledge(number), clear(), snapshot()/restore(); keyDefinitions para UI.

- [x] RED: FIFO/vacío -1, flechas, ASCII/Latin1, HID, control/modificadores, simultáneas, release, repeat, overflow y clear.
- [x] Implementar dos colas independientes, estados físicos y snapshots.
- [x] Suite completa: `node ../.tools/package/bin/npm-cli.js run test -- --run`, cero fallos.
- [x] Commit `feat(keyboard): add universal keyboard and independent input channels`.

## EXT-05/06 MMIO y timer

Files: src/peripherals.ts, src/peripherals.test.ts, src/marie.ts.
Interface: sim.hardware ExtendedHardware; configure(enabled,asyncInput), input(), read(address), write(address,value), period, count, running, rewinding, setRunning(boolean), reset(), snapshot()/restore().

- [x] RED: clásico RAM, directo/indirecto, RO, ACK, INPUT vacío, timer inyectado pausa/wrap y rollback.
- [x] Implementar registros del diseño, proyección en state sin consumos y snapshots privados de operaciones relevantes.
- [x] Suite y check cero errores; commit `feat(hardware): integrate reversible MMIO keyboard and virtual timer`.

## EXT-07/08 UI y teclado virtual

Files: src/lib/HardwarePanel.svelte, src/lib/InputsPanel.svelte, src/App.svelte, src/project.ts, src/lib/Simulator.svelte.

- [x] Agregar async exclusivamente a entrada y hardware opcional guardado; panel modular con captura enfocada, keydown/up, pointerdown/up/cancel y enclavamiento.
- [x] Indicadores de eventos, teclas, tiempo y mapa. Prueba foco/editor independiente y virtual simultáneo.
- [x] Run/Continue inicia reloj; pause/halt/break/steps congela; reset/proyecto/mode limpia y establece historial seguro.
- [x] Verificar UI en navegador, suite/check/build; commit `feat(ui): add extended hardware panel and interactive keyboard`.

## EXT-09 Ejecución

- [x] Medir bloqueo actual: 214ms, timeout atendido a 216ms (Jump000, log off).
- [x] Reducir rápido a bloques de 8ms, atender pause/halt por microoperación, eliminar arrays masivos; comparar latencia y preservar normal/debug.
- [x] Commit `perf: yield fast execution to keyboard and display updates`.

## EXT-10 Integración y documentación

Files: README.md, docs/extended-hardware.md, public/diagnostics/*.mas, tests/browser-hardware.mjs.

- [x] Arquitectura, códigos, timer, historial, límites, instalación y guía de juegos.
- [x] Diagnósticos de INPUT/MMIO/timer/display, probados con motor y navegador.
- [x] Suite completa, check, build, navegador y revisión independiente; corregir hallazgos importantes con regresión.
- [x] Commits finales, evidencias y hashes. No push al remoto oficial.

## Execution ledger

Decisión: rama local en la copia instalada; lanzadores y dependencias siguen apuntando al proyecto. La solicitud ampliada autoriza ejecución autónoma, sin nueva aprobación de arquitectura.

EXT-01 baseline: 28/28 originales. Primer run global encontró pruebas RED nuevas en construcción; se verificó baseline por archivo separado.

EXT-02/03/04: 788d2bb; teclado universal con pruebas RED→GREEN, FIFO de 64 independientes y documentación HID.

EXT-05/06: ab8a058; MMIO/timer y snapshots. Regresiones adicionales CPU Store/undo/redo, RO/RAM, HALT, modo y canales: 02624f1.

EXT-07/08/09: 606bd11. Decisión: integrar UI y presupuesto de ejecución en un mismo commit porque el panel depende de los hooks de pausa y tiempo. La medición inicial justificó el cambio antes de implementarlo: bloque 214ms, timeout216ms; navegador final máximo entre frames81.6ms durante modo rápido. Este valor incluye renderizado, no promete un frame completo de8ms.

Revisión independiente: corrigió selector MMIO alterado al enfocar captura y logs anteriores al modo rápido. Regresiones navegador/CPU fallaron antes del arreglo y pasaron después. Otras regresiones RED→GREEN: breakpoint lento, foco hacia campo de periodo y control de retroceso tras editar periodo. Shift virtual probado con símbolos y Ctrl/Latin1.

EXT-10 validado: 80/80 pruebas en6 archivos; svelte-check cero errores y cero avisos; build correcto (aviso Vite de chunk >500kB). Edge/Playwright pasó recorrido de captura física simulada, simultáneas, repetición, blur/editor, pointer hold y enclavamiento, INPUT clásico, selector MMIO, CPU periodo/retroceso, pausa/breakpoint, rápido y display256píxeles. Captura visual revisada en tests/hardware-browser.png (artefacto ignorado por Git).

Límites explícitos: atajos del SO, IME y dispositivos táctiles reales no se validaron físicamente; no hay replay del teclado humano. Sin dependencias nuevas. Origin sigue siendo el repositorio oficial y no es un destino autorizado para publicar esta rama.
