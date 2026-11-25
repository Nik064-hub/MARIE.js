# Contrato del teclado extendido

El controlador central es `src/keyboard.ts`. No contiene lógica de juegos. Una pulsación alimenta dos canales independientes: la cola lógica que consume `INPUT` y la cola de eventos físicos que consume `KEY_ACK`. Leer una cola no consume la otra. Ambas tienen capacidad de 64 elementos; al llenarse se descarta el evento nuevo, se conserva el orden previo y se activa un indicador de desbordamiento hasta confirmarlo. El estado de teclas mantenidas y liberadas sigue actualizándose incluso si una cola está llena.

## Canal lógico de INPUT

- Sin pulsaciones: -1, representado en un registro MARIE como FFFF. El valor 0 sigue siendo ASCII NUL.
- Caracteres ASCII y Latin-1: código del carácter lógico, 0–255. Se respeta el `key` proporcionado por la distribución del teclado: A=65, a=97, Ñ=209, ñ=241, á=225, é=233, í=237, ó=243, ú=250, ü=252, ¿=191, ¡=161.
- Backspace=8, Tab=9, Enter=13, Escape=27, espacio=32, Delete=127.
- Flechas: arriba=256, abajo=257, izquierda=258, derecha=259.
- Las demás teclas nombradas de la tabla usan 512 + su identificador físico. Por ejemplo F1=570, F12=581, Shift izquierdo=737, Ctrl izquierdo=736, Alt derecho/AltGr=742. Es un rango reservado distinto de los caracteres Latin-1 y de las flechas.
- Ctrl con un carácter ASCII entre @ y _ (incluyendo letras convertidas a mayúsculas) genera el carácter de control correspondiente: Ctrl+A=1, Ctrl+Z=26, Ctrl+@=0, Ctrl+[=27, Ctrl+\\=28, Ctrl+]=29, Ctrl+^=30, Ctrl+_=31. AltGr conserva el carácter lógico en vez de convertirlo a control.
- Se encolan los modificadores como teclas especiales y las teclas de texto como caracteres. Por tanto Shift seguido de A entrega primero el código de Shift y luego 65; el programa puede ignorar los códigos especiales que no utiliza.
- `keyup` no añade caracteres a INPUT. Los `keydown` con `repeat=true` y las bajadas duplicadas de una tecla ya mantenida se ignoran.

## Estado físico y eventos MMIO

`KeyboardEvent.code` identifica una posición física; `KeyboardEvent.key` identifica su resultado lógico. La tabla inferior asigna posiciones a identificadores estables de la página de usos USB HID Keyboard/Keypad. No se deben comparar los identificadores físicos con los códigos de carácter de INPUT. Por ejemplo la posición KeyD tiene identificador 7; el carácter d vale 100.

- Evento tipo 1: tecla presionada; tipo 2: tecla liberada. Cada evento guarda identificador y tipo en orden FIFO.
- `select`: identificador consultado. `selectedState` bit 0=tecla mantenida, bit 1=se ha liberado desde la última confirmación. La liberación queda latente hasta confirmarla, incluso después de otra pulsación.
- `modifiers`: bit 0 Shift, bit 1 Ctrl, bit 2 Alt, bit 3 Meta, bit 4 AltGr. Los cuatro primeros se derivan de las teclas físicas izquierda/derecha mantenidas. AltGr se activa al recibir AltRight con `key=AltGraph` o `getModifierState('AltGraph')` verdadero.
- `status`: bit 0 hay INPUT pendiente; bit 1 hay evento físico pendiente; bit 2 desbordó INPUT; bit 3 desbordó la cola física. La integración MMIO puede combinar estos cuatro bits con los modificadores en bits superiores, tal como describe el mapa de memoria.
- `acknowledge(value)`: bit 0 consume un evento físico; bit 1 limpia los dos indicadores de desbordamiento; bit 2 limpia el indicador de liberación de la tecla seleccionada. Los bits se pueden combinar. Confirmar una cola vacía no hace nada.
- `clear()`: libera todas las teclas y descarta ambas colas, desbordamientos, selección y liberaciones latentes. La interfaz lo usa al perder el foco, reiniciar o cambiar de modo/proyecto para evitar teclas atascadas. No genera eventos de liberación al limpiar: es un límite explícito de sesión de captura.
- `snapshot()/restore()`: copias por valor de ambos canales, selección, teclas, liberaciones y desbordamientos; permiten restaurar consumos reversibles durante la depuración. Restaurar no reproduce físicamente una pulsación y no promete viajar atrás en el teclado del usuario.

## Límites del navegador

La captura ocurre únicamente en la zona enfocada o mediante el teclado virtual. El editor conserva sus teclas. El navegador o el sistema pueden reservar combinaciones como Alt+Tab, Ctrl+W, Ctrl+L, teclas multimedia y algunas F1–F12 antes de que lleguen a la aplicación; no se garantiza capturarlas. La tabla indica las teclas admitidas si se reciben sus eventos, no una promesa de acceso exclusivo al teclado.

El periférico lógico admite Latin-1, no todo Unicode. Caracteres fuera de Latin-1, eventos de composición `Dead`, `Process` e `Unidentified` no producen un carácter en INPUT, aunque una posición conocida sí produce eventos físicos. Las teclas muertas y métodos de composición IME pueden necesitar el teclado virtual o una tecla directa para generar el carácter final. Una posición `code` desconocida se ignora. El teclado numérico utiliza el resultado lógico de NumLock que proporcione el navegador; sus identificadores físicos permanecen iguales. El teclado virtual ofrece eventos equivalentes, pero no implementa todos los mapas nacionales del sistema operativo.

## Tabla completa de posiciones admitidas

Los identificadores y códigos siguientes son decimales. Para una tecla que genera texto, la columna INPUT indica que depende de `key`; con modificadores o NumLock puede cambiar. Para las flechas y controles conserva los valores fijos anteriores.

| code           | ID físico USB HID | INPUT sin modificadores |
| -------------- | ----------------: | ----------------------- |
| KeyA           |                 4 | Carácter (key)          |
| KeyB           |                 5 | Carácter (key)          |
| KeyC           |                 6 | Carácter (key)          |
| KeyD           |                 7 | Carácter (key)          |
| KeyE           |                 8 | Carácter (key)          |
| KeyF           |                 9 | Carácter (key)          |
| KeyG           |                10 | Carácter (key)          |
| KeyH           |                11 | Carácter (key)          |
| KeyI           |                12 | Carácter (key)          |
| KeyJ           |                13 | Carácter (key)          |
| KeyK           |                14 | Carácter (key)          |
| KeyL           |                15 | Carácter (key)          |
| KeyM           |                16 | Carácter (key)          |
| KeyN           |                17 | Carácter (key)          |
| KeyO           |                18 | Carácter (key)          |
| KeyP           |                19 | Carácter (key)          |
| KeyQ           |                20 | Carácter (key)          |
| KeyR           |                21 | Carácter (key)          |
| KeyS           |                22 | Carácter (key)          |
| KeyT           |                23 | Carácter (key)          |
| KeyU           |                24 | Carácter (key)          |
| KeyV           |                25 | Carácter (key)          |
| KeyW           |                26 | Carácter (key)          |
| KeyX           |                27 | Carácter (key)          |
| KeyY           |                28 | Carácter (key)          |
| KeyZ           |                29 | Carácter (key)          |
| Digit1         |                30 | Carácter (key)          |
| Digit2         |                31 | Carácter (key)          |
| Digit3         |                32 | Carácter (key)          |
| Digit4         |                33 | Carácter (key)          |
| Digit5         |                34 | Carácter (key)          |
| Digit6         |                35 | Carácter (key)          |
| Digit7         |                36 | Carácter (key)          |
| Digit8         |                37 | Carácter (key)          |
| Digit9         |                38 | Carácter (key)          |
| Digit0         |                39 | Carácter (key)          |
| Enter          |                40 | 13                      |
| Escape         |                41 | 27                      |
| Backspace      |                42 | 8                       |
| Tab            |                43 | 9                       |
| Space          |                44 | Carácter (key)          |
| Minus          |                45 | Carácter (key)          |
| Equal          |                46 | Carácter (key)          |
| BracketLeft    |                47 | Carácter (key)          |
| BracketRight   |                48 | Carácter (key)          |
| Backslash      |                49 | Carácter (key)          |
| Semicolon      |                51 | Carácter (key)          |
| Quote          |                52 | Carácter (key)          |
| Backquote      |                53 | Carácter (key)          |
| Comma          |                54 | Carácter (key)          |
| Period         |                55 | Carácter (key)          |
| Slash          |                56 | Carácter (key)          |
| CapsLock       |                57 | 569                     |
| F1             |                58 | 570                     |
| F2             |                59 | 571                     |
| F3             |                60 | 572                     |
| F4             |                61 | 573                     |
| F5             |                62 | 574                     |
| F6             |                63 | 575                     |
| F7             |                64 | 576                     |
| F8             |                65 | 577                     |
| F9             |                66 | 578                     |
| F10            |                67 | 579                     |
| F11            |                68 | 580                     |
| F12            |                69 | 581                     |
| PrintScreen    |                70 | 582                     |
| ScrollLock     |                71 | 583                     |
| Pause          |                72 | 584                     |
| Insert         |                73 | 585                     |
| Home           |                74 | 586                     |
| PageUp         |                75 | 587                     |
| Delete         |                76 | 127                     |
| End            |                77 | 589                     |
| PageDown       |                78 | 590                     |
| ArrowRight     |                79 | 259                     |
| ArrowLeft      |                80 | 258                     |
| ArrowDown      |                81 | 257                     |
| ArrowUp        |                82 | 256                     |
| NumLock        |                83 | 595                     |
| NumpadDivide   |                84 | Carácter (key)          |
| NumpadMultiply |                85 | Carácter (key)          |
| NumpadSubtract |                86 | Carácter (key)          |
| NumpadAdd      |                87 | Carácter (key)          |
| NumpadEnter    |                88 | 13                      |
| Numpad1        |                89 | Carácter (key)          |
| Numpad2        |                90 | Carácter (key)          |
| Numpad3        |                91 | Carácter (key)          |
| Numpad4        |                92 | Carácter (key)          |
| Numpad5        |                93 | Carácter (key)          |
| Numpad6        |                94 | Carácter (key)          |
| Numpad7        |                95 | Carácter (key)          |
| Numpad8        |                96 | Carácter (key)          |
| Numpad9        |                97 | Carácter (key)          |
| Numpad0        |                98 | Carácter (key)          |
| NumpadDecimal  |                99 | Carácter (key)          |
| IntlBackslash  |               100 | Carácter (key)          |
| ContextMenu    |               101 | 613                     |
| NumpadEqual    |               103 | Carácter (key)          |
| IntlRo         |               135 | 647                     |
| IntlYen        |               137 | 649                     |
| ControlLeft    |               224 | 736                     |
| ShiftLeft      |               225 | 737                     |
| AltLeft        |               226 | 738                     |
| MetaLeft       |               227 | 739                     |
| ControlRight   |               228 | 740                     |
| ShiftRight     |               229 | 741                     |
| AltRight       |               230 | 742                     |
| MetaRight      |               231 | 743                     |
