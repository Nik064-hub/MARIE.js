# MARIE.js

MARIE.js is an implementation of a simulator for a 'Machine Architecture that is Really Intuitive and Easy'
from [The Essentials of Computer Organization and Architecture](https://books.google.com.au/books/about/The_Essentials_of_Computer_Organization.html?id=3kQoAwAAQBAJ&redir_esc=y) (Linda Null, Julia Lobur) in TypeScript.

**[Try the simulator](https://marie.js.org/)**

It is used within the unit [FIT1047 - Introduction to computer systems, networks and security](http://www.monash.edu/pubs/handbooks/units/FIT1047.html) at [Monash University](https://monash.edu).

## Development

First, install dependencies with

```sh
npm ci
```

Then start the development server with

```sh
npm run dev
```

The test suite can be run with

```sh
npm run test
```

THe formatter and linter can be run with

```sh
npm run format
npm run check
```

## Building

To build for production, run

```sh
npm run build
```

## License

MARIE.js is open-source software distributed under the [MIT License](https://opensource.org/license/mit).

See the [LICENSE](LICENSE) file for details.

## Extensión local: juegos y periféricos en tiempo real

Esta copia incorpora **Input asíncrono** y **Extended Hardware Mode**, ambos opcionales. Los programas clásicos conservan su memoria e instrucciones originales. La lógica de los juegos sigue escribiéndose en ensamblador MARIE; la extensión no añade opcodes.

En el panel **Inputs**, selecciona **Input asíncrono** para consultar teclas sin detener la CPU. Activa **Extended Hardware Mode** para utilizar el teclado físico por MMIO y el temporizador. Enfoca la zona de captura para enviar teclas al programa; el teclado virtual permite también mantener varias teclas enclavadas. El display original sigue siendo de 16 × 16.

- [Manual de periféricos, mapa MMIO, temporizador y desarrollo de juegos](docs/extended-hardware.md)
- [Tabla completa de códigos lógicos y posiciones físicas USB HID](docs/keyboard-codes.md)
- [Programas ensamblador de diagnóstico](public/diagnostics/)

Para iniciar el simulador, haz doble clic en `iniciar-marie.cmd` (Windows), `iniciar-marie.command` (macOS) o ejecuta `./iniciar-marie.sh` (Linux/macOS); requieren Node.js compatible con Vite 7 y abren http://127.0.0.1:5173. También puedes usar los comandos npm estándar de la sección Development.

Se mantienen los créditos y la licencia MIT originales. Esta extensión local no es una publicación oficial del proyecto MARIE.js.
