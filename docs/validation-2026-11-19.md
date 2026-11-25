# Validación de hardware extendido — 19 de noviembre de 2026

Rama: `feat/extended-hardware`. Base original: `a22d884`.

## Resultado

| Comprobación | Resultado observado |
|---|---|
| `npm run test -- --run` | 80 pruebas aprobadas, 6 archivos |
| `npm run check` | 0 errores, 0 avisos |
| `npm run build` | Compilación exitosa; aviso de tamaño de chunk de Vite |
| `node tests/browser-hardware.mjs` | PASS en Edge headless |
| `git diff --check` | Sin errores de espacios |

En esta instalación los comandos npm se ejecutaron mediante `node ../.tools/package/bin/npm-cli.js`. No se añadieron dependencias al proyecto.

## Alcance comprobado

- Suite original de ensamblador/CPU y programas de diagnóstico reales incluidos.
- INPUT tradicional que espera un valor; asíncrono sin espera, vacío FFFF y FIFO independiente de eventos.
- ASCII/Latin1, códigos especiales, HID, modificadores, simultaneidad, teclas mantenidas/liberadas, overflow y snapshots.
- RAM clásica en EF7–EFF; MMIO directo/indirecto y debugger; registros RO; display F00–FFF intacto.
- Temporizador con reloj inyectado: periodo, pausa y fracción temporal, desbordamiento, reset y snapshots; HALT detiene reloj.
- Undo/redo de INPUT, ACK, selector, periodo y contador; frontera de configuración y de ejecución sin log.
- Navegador: selector async, entrada clásica42, bucle continuo sin pausa, D+Space, flechas, repetición filtrada, foco al editor/campo del panel, blur, virtual por puntero/enclavamiento, selector CPU preservado al capturar, periodo visible tras Store/retroceso, breakpoint lento y display de256píxeles.
- Revisión visual de la captura de navegador generada (artefacto `tests/hardware-browser.png`, no versionado).

## Rendimiento

El bucle rápido original ocupó 214ms por bloque y un timeout se atendió a216ms. El nuevo comprueba un presupuesto de8ms por microoperación y cede al navegador. En la validación final, el máximo entre callbacks de frame fue81.6ms, incluida la representación de memoria e interfaz. Es una medición local bajo carga, no una garantía de tiempo real duro ni una promesa de60fps.

## Revisión y correcciones verificadas

Una revisión independiente encontró que la captura borraba KEY_SELECT y que podían sobrevivir logs anteriores a ejecutar sin registro. Se reprodujeron con pruebas que fallaron, se corrigieron y se verificaron nuevamente. También se comprobaron el reloj en breakpoint lento, Shift virtual y la actualización del periodo activo, y se reprodujeron/corrigieron la pérdida de foco hacia campos internos y el botón de retroceso tras editar el periodo.

## Límites

No se validaron físicamente todos los atajos del sistema, distribuciones nacionales, IME ni pantallas táctiles. El navegador puede reservar eventos. Los snapshots restauran estado virtual observado en accesos, no el teclado real ni cada instante entre instrucciones. El modo rápido descarta historial previo y no registra su ejecución. El historial normal puede crecer durante sesiones largas; se recomienda rápido para jugar.

No se implementaron videojuegos, ni se publicaron cambios en el remoto oficial.
