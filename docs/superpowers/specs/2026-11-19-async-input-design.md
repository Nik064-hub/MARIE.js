# Hardware extendido de MARIE.js — arquitectura aprobada

La solicitud del 19-11-2026 aprueba esta arquitectura híbrida y su ejecución autónoma. Sustituye la propuesta inicial. No se implementan videojuegos; sí diagnósticos de periféricos en ensamblador.

## Auditoría EXT-01

MARIE tiene 4096 palabras de 16 bits, direcciones de 12 bits. F00–FFF alimenta directamente el display 16×16. EF7–EFF está libre de dispositivos, pero puede contener programas clásicos: solo se intercepta con hardware habilitado. Todas las instrucciones, incluidas indirectas, usan readMemory/writeMemory; allí se centralizan los accesos. App.getInput pausa al recibir null. El callback del motor admite números, por lo que -1 permite INPUT no bloqueante sin nuevos opcodes. state(), el proxy de memoria y el historial requieren integración explícita.

Auditoría experimental: el bloque rápido actual (Jump 000, log deshabilitado) ocupó 214 ms y el navegador atendió un timeout a los 216 ms. Se justifica reducir a bloques de 8 ms con comprobación por microoperación. El modo normal ya cede al navegador. No se cambian display, instrucciones, formatos de salida ni dependencias.

## Arquitectura y alternativas

KeyboardController (keyboard.ts) traduce key lógico y code físico USB HID, mantiene teclas simultáneas, latches de liberación y dos FIFO independientes de capacidad 64. Al llenarse descarta el evento nuevo y conserva indicador sticky; la transición física siempre actualiza el estado. Repeticiones y down duplicados se ignoran. INPUT usa ASCII/Latin-1 0–255, flechas 256–259, especiales desde 512, vacío -1. Los modificadores tienen identificadores físicos independientes de caracteres. Frente a consultar solo la tecla mantenida, la arquitectura híbrida permite tanto estados como pulsaciones ordenadas.

ExtendedHardware (peripherals.ts) contiene teclado y temporizador monotónico inyectable, deshabilitado inicialmente. La selección Input asíncrono habilita lectura FIFO sin exigir MMIO; Extended Hardware Mode activa MMIO y teclado. Al cambiar configuración se establece una frontera de historial. Configuración se guarda en proyectos; eventos físicos no se guardan.

## Contrato MMIO

| Dirección | Registro | Acceso |
|---|---|---|
| EF7 | TIMER_PERIOD (ms, 1–65535, inicial 300) | RW |
| EF8 | KEY_ACK: bit0 consume evento, bit1 limpia overflow, bit2 limpia latch seleccionado | W, lee 0 |
| EF9 | KEY_STATUS bits 0 INPUT pendiente, 1 evento pendiente, 2 overflow INPUT, 3 overflow eventos; modificadores en byte alto | R |
| EFA | KEY_SELECT, id físico USB HID | RW |
| EFB | KEY_STATE bit0 presionada, bit1 liberada desde último ACK | R |
| EFC | KEY_EVENT_TYPE: 0 ninguno, 1 down, 2 up | R |
| EFD | KEY_EVENT_COUNT | R |
| EFE | TIMER_COUNT módulo 65536 | RW |
| EFF | KEY_EVENT_CODE, 0 si vacío | R |

Modificadores: Shift=1, Ctrl=2, Alt=4, Meta=8, AltGr=16. Escrituras a RO no cambian hardware ni RAM subyacente. En clásico todas estas posiciones siguen siendo RAM. El display permanece intacto.

## Tiempo, foco e historial

El temporizador usa performance.now(), acumula ticks exclusivamente durante Run/Continue y congela en pausa, halt, pasos y retroceso. Cambiar periodo conserva ticks y reinicia fase. Escribir contador fija el valor y reinicia fase. Reiniciar limpia estado y conserva configuración. Calcular diferencias modulares; para comparaciones con signo usar intervalos menores que 32768 ticks.

Las operaciones reversibles del hardware guardan snapshots privados en el historial del motor. Retroceder congela el tiempo y restaura consumos INPUT, ACK, selección, periodo y contador asociados a la acción. Los eventos humanos no se pueden deshacer en el mundo real: el estado restaurado es virtual, las nuevas entradas se aceptan al reanudar avance; pérdida de foco limpia teclas y colas conservando KEY_SELECT, que pertenece a la CPU. Cambios de modo desde UI establecen una frontera de historial; editar el periodo usa una escritura MMIO reversible. Fast Mode descarta el historial anterior y no permite retroceso de su ejecución sin registro.

Captura solo en zona enfocable y teclado virtual: no interceptar editor ni campos. Blur/visibilitychange limpia teclas y colas para evitar teclas atascadas. Atajos reservados del SO/navegador no se garantizan. Virtual: pointerdown/up/cancel y modo de enclavamiento para simultaneidad con un mouse.

## Validación y respaldo

TDD de FIFO, ASCII/Latin1, modificadores, HID, overflow y foco; pruebas del motor con instrucciones originales y MMIO directo/indirecto, tiempo inyectado, pausa y rollback. Suite original, svelte-check, build y pruebas en navegador con teclado físico simulado y virtual. Commits locales por bloque validado, sin publicar al origin oficial del proyecto. Revertir commits restaura modo clásico; no hay migraciones destructivas.
