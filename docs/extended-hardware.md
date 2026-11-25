# MARIE.js: periféricos y juegos en tiempo real

## Iniciar y elegir modo

Abre `iniciar-marie.cmd` (Windows), `iniciar-marie.command` (macOS) o ejecuta `./iniciar-marie.sh` (Linux/macOS) y visita http://127.0.0.1:5173. Mantén abierta la consola; Ctrl+C detiene el servidor. Los archivos del simulador están en `src/`.

O bien, desde la carpeta del repositorio:

```bash
npm ci
npm run dev -- --host 127.0.0.1
npm run test -- --run
npm run check
npm run build
```

`ci` es necesario para instalar o reinstalar las dependencias; no hace falta repetirlo al iniciar. Los lanzadores usan el Node.js y npm instalados en el sistema (Node.js 20.19+, 22.12+ o 24+). Instalación completa: consulta el README principal. Se necesita el servidor de desarrollo o un servidor de archivos para `dist`, no abrir `index.html` con `file://`.

Hay dos opciones independientes:

1. **Input asíncrono**, en el selector de formato del panel Inputs: reemplaza las lecturas de INPUT por la cola del teclado. Una fila en ese modo activa el comportamiento para todo el programa; las colas de texto se conservan para volver al modo tradicional.
2. **Extended Hardware Mode**: activa los registros MMIO de teclado y temporizador. Puede utilizarse con INPUT tradicional o asíncrono. No es necesario para usar solamente INPUT asíncrono.

En modo clásico, EF7–EFF siguen siendo RAM convencional y INPUT espera una entrada válida como en MARIE.js original. El modo extendido reserva únicamente nueve palabras de RAM para periféricos; no reserva una tabla de 256 palabras ni cambia el display.

## Ventana Display

El botón **Display**, junto a **Data Path** e **Instruction Set**, muestra u oculta una ventana flotante independiente de Inputs. Arrastra su barra superior para moverla y cualquiera de sus bordes o esquinas para cambiar su tamaño. El botón de cierre también la oculta. La posición y el tamaño se conservan al ocultarla durante la sesión; al recargar se usa la posición inicial. Los píxeles se ajustan al espacio disponible conservando el display original de 16 × 16.

La ventana no bloquea el resto de la aplicación ni detiene el simulador. Se mantiene dentro de la pantalla al cambiar el tamaño del navegador. Con foco en la barra o en un borde, las flechas permiten mover o redimensionar en pasos de 10 píxeles. La prueba `node tests/browser-display.mjs` comprueba estos controles mediante puntero, la independencia de Inputs largos y las actualizaciones de memoria en pantalla.

## Capturar teclado y usar el teclado virtual

Tras ensamblar, selecciona el modo y pulsa la zona **Capturar teclado** del panel de hardware. El teclado físico se captura únicamente mientras esa zona tiene el foco, evitando interferir con el editor y otros campos. Pulsa Run antes de enfocar la captura si necesitas conservar pulsaciones durante la ejecución. Una captura nueva comienza con teclas y colas limpias.

El teclado virtual envía las mismas pulsaciones al controlador central. Mantén el botón pulsado para mantener una tecla, o activa **Enclavar teclas** para que un clic mantenga y otro libere. Así puedes mantener D y espacio simultáneamente incluso con un ratón. Los indicadores muestran las posiciones mantenidas. Shift/Ctrl/Alt y los caracteres directos Latin-1 permiten probar combinaciones. Los símbolos virtuales usan un mapa US; los acentos directos usan la posición física de su letra base, por lo que no son teclas físicas independientes de esa letra.

Al salir de la zona de hardware, cambiar de ventana o esconder la pestaña se liberan las teclas y se vacían ambas colas sin generar eventos artificiales de liberación. También se limpian al reiniciar, ensamblar o cambiar de proyecto/modo. Esta política evita teclas atascadas cuando el navegador no entrega `keyup`. Los eventos ya borrados por pérdida de foco no se pueden recuperar como eventos físicos reales.

Los atajos reservados por el navegador o el sistema no están garantizados. Consulta el [contrato completo del teclado](keyboard-codes.md), incluido el alcance Latin-1, teclas muertas y USB HID.

## Arquitectura

- `keyboard.ts`: controlador central; estado simultáneo, latches de liberación y dos FIFO independientes.
- `peripherals.ts`: registros MMIO y temporizador monotónico. No conoce juegos ni modifica el display.
- `marie.ts`: arbitra RAM/MMIO de forma centralizada y guarda el estado reversible de accesos de periféricos en el historial de microacciones. Load, Store, LoadI y StoreI utilizan los accesos originales del procesador.
- `HardwarePanel.svelte` y `virtual-keyboard.ts`: captura física, teclado virtual y observación de periféricos.
- `Simulator.svelte`: pausa/reanudación del tiempo virtual y bloques acotados de ejecución para compartir el hilo con el navegador.
- `App.svelte`, `InputsPanel.svelte`, `project.ts`: selección de modos, compatibilidad con colas originales y persistencia de configuración.

La configuración se guarda con el proyecto. Los proyectos antiguos sin esos campos abren en modo clásico. Las pulsaciones y eventos externos no se guardan en el proyecto; son estado de la sesión. Abrir un programa de hardware en MARIE.js original no le proporciona estos periféricos.

La limpieza de una sesión de captura conserva KEY_SELECT: enfocar o desenfocar el teclado no altera la tecla que seleccionó el programa. El reinicio completo sí reinicia el selector. La edición del periodo desde el panel es una escritura MMIO registrada y puede deshacerse. El campo muestra el periodo activo, incluidas las escrituras de la CPU y el retroceso; el proyecto conserva el último periodo configurado desde el panel.

## INPUT asíncrono

Cada INPUT consume una pulsación lógica pendiente, sin esperar al usuario. Si la cola está vacía devuelve **−1**, representado como **FFFF** en el registro de 16 bits. `Skipcond 000` permite detectar ese valor negativo; los caracteres de esta interfaz son positivos o cero.

ASCII y Latin-1 usan 0–255, incluido NUL=0. Flechas: ↑=256, ↓=257, ←=258, →=259. Otros nombres especiales usan 512 + identificador físico USB HID; no comparten rango con caracteres. Los modificadores se entregan también como teclas especiales; el programa filtra las que le interesan. `keyup` actualiza el canal físico, pero no añade caracteres a INPUT. Se ignoran las repeticiones automáticas y las bajadas duplicadas de una tecla ya mantenida.

La cola lógica y la cola física tienen **64** elementos cada una. Si se llena una cola, se descarta su elemento nuevo y se activa su bit de desbordamiento; los elementos anteriores conservan su orden. El estado mantenido/liberado se actualiza aunque no quepan más eventos. Consumir INPUT no quita eventos físicos; confirmar eventos físicos no consume INPUT. El programa debe vaciar las colas a tiempo o usar el estado simultáneo para controles mantenidos.

Ejemplo de consulta que continúa aunque no haya tecla:

```text
Loop, Input
Skipcond 000
Jump HasKey
Jump Loop
HasKey, Output
Jump Loop
```

Es un diagnóstico, no un juego. En un juego, la rama sin tecla debe continuar también con la temporización, actualización y dibujo; no quedarse exclusivamente esperando teclado.

## Mapa MMIO

Direcciones hexadecimales; valores de palabras de 16 bits. R=lectura, W=escritura, RW=ambas. Escribir un registro de solo lectura no cambia el periférico ni su RAM subyacente. Leer no consume eventos.

| Dirección | Registro        | Acceso | Contrato                                                                                       |
| --------- | --------------- | ------ | ---------------------------------------------------------------------------------------------- |
| EF7       | TIMER_PERIOD    | RW     | Periodo en ms, 1–65535; escribir 0 selecciona 1 ms. Predeterminado 300 ms.                     |
| EF8       | KEY_ACK         | W      | Máscara de confirmaciones; leer devuelve 0.                                                    |
| EF9       | KEY_STATUS      | R      | Bits de colas/desbordamientos y modificadores.                                                 |
| EFA       | KEY_SELECT      | RW     | Identificador físico USB HID consultado; desconocido devuelve estado 0.                        |
| EFB       | KEY_STATE       | R      | Estado de la tecla seleccionada: bit 0 mantenida, bit 1 liberación latente.                    |
| EFC       | KEY_EVENT_TYPE  | R      | Primer evento físico: 0 ninguno, 1 pulsación, 2 liberación.                                    |
| EFD       | KEY_EVENT_COUNT | R      | Cantidad de eventos físicos, 0–64.                                                             |
| EFE       | TIMER_COUNT     | RW     | Ticks acumulados módulo 65536; escribir cambia el contador y reinicia la fracción del periodo. |
| EFF       | KEY_EVENT_CODE  | R      | Identificador físico del primer evento, 0 si no hay.                                           |
| F00–FFF   | DISPLAY         | RW     | 256 píxeles originales, sin cambios.                                                           |

`KEY_STATUS`:

| Bit | Valor | Significado                      |
| --- | ----: | -------------------------------- |
| 0   |     1 | Hay caracteres INPUT pendientes. |
| 1   |     2 | Hay eventos físicos pendientes.  |
| 2   |     4 | Desbordó la cola INPUT.          |
| 3   |     8 | Desbordó la cola física.         |
| 8   |   256 | Shift mantenido.                 |
| 9   |   512 | Ctrl mantenido.                  |
| 10  |  1024 | Alt mantenido.                   |
| 11  |  2048 | Meta mantenido.                  |
| 12  |  4096 | AltGr mantenido.                 |

`KEY_ACK` permite combinar bits en una escritura: bit 0/valor 1 consume un evento físico; bit 1/valor 2 limpia los dos avisos de desbordamiento; bit 2/valor 4 limpia la liberación latente de la tecla seleccionada. Por ejemplo 5 consume un evento y confirma la liberación seleccionada. No vacía INPUT.

La liberación latente permanece hasta confirmarla, incluso si la tecla vuelve a presionarse. Por tanto KEY_STATE puede valer 3 (mantenida y liberada previamente). Para consultar D, escribe **7**, su identificador físico USB HID, en EFA y lee EFB. Para consultar espacio usa **44**. No uses el carácter d=100 o espacio=32 como selector físico.

Los operandos numéricos de la sintaxis actual deben comenzar por un dígito: escribe `Load 0EFE`, no `Load EFE`, que se interpreta como etiqueta. Para direccionamiento indirecto usa una palabra como `TimerPtr, HEX EFE` y `LoadI TimerPtr`. Cuando habilites MMIO, no coloques instrucciones, datos o punteros propios en EF7–EFF; en clásico siguen disponibles.

## Temporizador y velocidad del juego

El tiempo procede de `performance.now()`, no del número de instrucciones ejecutadas. Con periodo 300, el contador avanza una vez cada 300 ms de ejecución activa. Cambiar la velocidad de CPU no cambia la duración de un tick. Una CPU muy lenta puede leer después de varios ticks: el temporizador mantiene el tiempo, pero el ensamblador debe decidir si realiza varios pasos para recuperar el retraso o actualiza una sola vez.

El temporizador se congela al pausar, detenerse, alcanzar Halt o depurar por pasos; no acumula el tiempo de pausa. La fracción del periodo ya transcurrida se conserva para continuar. Cambiar el periodo liquida los ticks anteriores y reinicia esa fracción. Reiniciar/ensamblar pone el contador en 0 y conserva el periodo configurado. El campo de periodo de la interfaz escribe EF7 a través del mismo acceso reversible que el procesador.

El contador vuelve de 65535 a 0. Para medir un intervalo utiliza la resta modular de 16 bits `actual - anterior`, no una comparación directa `actual > anterior`. Si entre dos lecturas pasan menos de 32768 ticks, el resultado positivo de 1–32767 es un intervalo válido incluso al cruzar el desbordamiento; guarda el nuevo valor tras procesarlo. Si esperas más de ese margen debes muestrear con mayor frecuencia o gestionar épocas en tu programa. Con 300 ms son aproximadamente 2 h 43 min para el margen de resta con signo, y 5 h 28 min para una vuelta completa. No se puede reconstruir cuántas vueltas ocurrieron si el programa deja de consultar demasiado tiempo.

Para una animación simple puede bastar detectar un cambio de contador. Para movimiento regular, conserva `anterior`, calcula ticks transcurridos, ejecuta las actualizaciones que decidas y dibuja. No uses bucles de espera basados solo en contar instrucciones si quieres una velocidad independiente de la CPU.

## Pausa, historial y reversibilidad

La CPU mantiene pausa, ensamblado, reinicio, pasos, retroceso, memoria, registros y camino de datos. El tiempo no avanza durante pasos manuales. En ejecución normal los registros de periféricos se observan también en la vista de memoria.

Se guardan snapshots de los periféricos en las lecturas/escrituras MMIO y en los consumos INPUT asíncronos que quedan en el historial; contienen ambas colas, teclas mantenidas, liberaciones, periodo, contador y fracción temporal. Retroceder restaura esos efectos junto con la microacción correspondiente. El modo rápido conserva su restricción original: sin log no hay retroceso de esa ejecución.

Al comenzar el retroceso, el tiempo se congela y la captura rechaza nuevos eventos externos. Los snapshots restauran el estado observado en los accesos registrados, no cada instante del mundo real entre instrucciones. Al continuar o avanzar un paso se permiten nuevos eventos; al reanudar el tiempo se parte del contador/fracción restaurados, sin sumar la espera durante la depuración.

Al retroceder se restauran las colas, el selector, el latch de liberación y el desbordamiento, pero no las teclas mantenidas: estas son estado físico actual y se conservan tal como el usuario las mantiene ahora. También existe **Limpiar teclado y colas**. El historial no puede reproducir pulsaciones que el sistema nunca entregó. Cambiar la configuración de modos descarta el historial incompatible de CPU; los archivos de proyecto no son grabaciones de eventos externos. Evita mezclar captura nueva y retroceso si necesitas una repetición experimental idéntica.

Al activar o desactivar el registro de acciones se descarta el historial previo: no se permite aplicar acciones antiguas al estado resultante de una ejecución rápida sin registro. Para sesiones largas de juego se recomienda modo rápido; el historial normal crece con cada microoperación, como en el simulador original.

## Validación en navegador

Además de la suite Vitest, `npm run test:browser` ejecuta `tests/browser-display.mjs` y `tests/browser-hardware.mjs` con un navegador sin ventana contra el servidor local (`npm run dev` en el puerto 5173). Playwright no es una dependencia del proyecto: instálalo (`npm i -D playwright`) o define `PLAYWRIGHT_PACKAGE_JSON` con la ruta de un package.json junto a un node_modules que lo contenga. El navegador por defecto es Edge (`msedge`); cambia el canal con `MARIE_BROWSER_CHANNEL` (por ejemplo `chrome`).

La prueba recorre captura física simulada, foco/editor, estados simultáneos, virtual mantenido/enclavado, entrada clásica, MMIO por CPU y retroceso, pausa/breakpoint, modo rápido y display. Los atajos reales reservados por el sistema, IME y hardware táctil específico requieren comprobación en el dispositivo de destino. El presupuesto de CPU es 8 ms por bloque rápido; la latencia total incluye además el renderizado y la carga del navegador.

## Diagnósticos incluidos

Carga los archivos de `public/diagnostics` desde el menú File de MARIE.js. Las pruebas automatizadas leen esos mismos archivos y los ensamblan/ejecutan con el motor real.

| Archivo             | Modo               | Resultado                                                                                                                                                              |
| ------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async-input.mas`   | Input asíncrono    | Sin tecla, OUTPUT muestra FFFF/−1 y Halt. Si ya hay ↑ pendiente muestra 256.                                                                                           |
| `keyboard-mmio.mas` | Hardware extendido | Mantén D antes de Run; muestra estado, tipo del primer evento, código físico, cantidad y cantidad después de confirmar uno. Si solo hay la bajada de D: 1, 1, 7, 1, 0. |
| `timer-display.mas` | Hardware extendido | Bucle continuo que copia ticks a F00. El color del primer píxel cambia; pausa manualmente.                                                                             |
| `display-pixel.mas` | Cualquier modo     | Pone blanco el primer píxel y termina.                                                                                                                                 |

Si la cola contiene eventos anteriores o se suelta D, el diagnóstico de teclado mostrará los valores reales correspondientes. Usa **Limpiar teclado y colas** antes de una medición; no lo pulses después de introducir el evento que quieres observar.

## Guía breve para autores de juegos

1. Reserva variables de estado y evita EF7–EFF al utilizar hardware. Conserva F00–FFF para el display 16 × 16 original.
2. Decide si necesitas giros/pulsaciones FIFO con INPUT, estados mantenidos simultáneos con KEY_SELECT/KEY_STATE, eventos físicos con ACK, o una combinación. Los canales son independientes.
3. Define tu periodo en EF7 y usa EFE para actualizar el mundo. El juego conserva dirección, posiciones, colisiones y puntuación en ensamblador.
4. No detengas el bucle si INPUT devuelve −1: sigue comprobando temporizador y dibujando. No interpretes una repetición de teclado del sistema como el reloj del juego.
5. Vacía o confirma eventos con frecuencia; observa los bits de overflow si necesitas detectar entradas perdidas. Para controles mantenidos, lee KEY_STATE en vez de esperar pulsaciones repetidas.
6. Prueba primero con CPU lenta y pasos; para jugar aumenta la velocidad. Si la CPU no alcanza a actualizar dentro de un tick, simplifica el ensamblador o aumenta el periodo.
7. Comprueba pausa, pérdida de foco y reinicio. No supongas que una sesión de captura conserva las teclas de la sesión anterior.

No se incluye la lógica de Snake, Pong ni otro juego. Estos periféricos son de propósito general; las decisiones de movimiento y reglas siguen siendo responsabilidad del programa MARIE.
