# Brief del proyecto — Sitio de apuntes y simuladores

**Escuela de Educación Secundaria Técnica N° 2073 "San Pablo"**
Materia piloto: Circuitos y Redes I — 4to año, división A (técnico electrónico)

> Este archivo se guarda como `CLAUDE.md` en la raíz del repositorio. Claude Code lo lee
> automáticamente al iniciar y lo usa como contexto permanente del proyecto.

---

## 1. Objetivo

Sitio web público donde los alumnos consultan apuntes, ejercitación y **simuladores
interactivos** de la materia. El diferencial frente a un PDF no es el texto: son los
componentes donde el alumno mueve un valor y ve qué le pasa al circuito.

El sitio arranca con una sola materia. La estructura debe permitir sumar otras
(Física 3ro, Diseño Eléctrico-Electrónico 3ro, Educación Tecnológica 2do,
Proyecto Final 6to) sin rehacer nada.

## 2. Restricciones duras

- **Sin login, sin cuentas, sin base de datos.** Sitio 100% estático.
- **Sin datos de alumnos.** No se guarda ni se envía nada de quien usa el sitio.
  Los ejercicios se corrigen en el navegador y no persisten en ningún lado.
- **Costo cero.** Hosting, dominio y herramientas gratuitos, sin tarjeta de crédito.
- **Mobile primero.** Los alumnos entran desde el celular, muchas veces con datos
  móviles y en un aula con señal mala. Los simuladores tienen que ser usables con el
  pulgar en una pantalla de 360 px, y el sitio tiene que pesar poco.
- **El docente carga contenido escribiendo texto, no código.** Un apunte nuevo es un
  archivo Markdown en una carpeta; nada más.

## 3. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | **Astro** con content collections | Genera HTML estático; el JS solo se carga en los componentes que lo necesitan |
| Contenido | **MDX** (Markdown + componentes embebidos) | Permite insertar `<LeyDeOhm />` en medio de un apunte |
| Interactividad | **Preact** como island (`client:visible`) | Mucho más liviano que React, misma API |
| Fórmulas | `remark-math` + `rehype-katex` | Notación matemática en el apunte, renderizada en build |
| Estilos | CSS propio con custom properties | Sin dependencias; ver sección de diseño |
| Gráficos | **SVG generado a mano** en los componentes | Nada de librerías de charts: los esquemas de circuito y los fasores son dibujos específicos |
| PDF | **Playwright** en el build | Imprime las páginas ya generadas; una sola fuente de contenido |
| Repositorio | GitHub (repo público) | Gratis, y sirve de respaldo del material |
| Hosting | **Cloudflare Pages** (alternativa: GitHub Pages) | Build automático en cada push, dominio `*.pages.dev` gratis, sin límite práctico de tráfico |

Sin analytics, sin fuentes externas bloqueantes, sin cookies. El sitio no necesita
banner de consentimiento porque no recolecta nada.

Las tipografías se autohospedan: los `.woff2` vienen de los paquetes `@fontsource`, pero
los `@font-face` se declaran a mano en `src/styles/tipografia.css` con el subset latino
solamente. El CSS que traen esos paquetes registra las familias como *"IBM Plex Sans
Variable"* y *"Archivo Variable"* y arrastra cirílico, griego y vietnamita: 68 archivos
para un sitio en castellano.

## 4. Estructura de carpetas

```
/
├── CLAUDE.md                      ← este archivo
├── astro.config.mjs
├── src/
│   ├── content.config.ts          ← esquema de las colecciones (Zod)
│   ├── content/
│   │   └── circuitos-redes-i/
│   │       ├── materia.json       ← nombre, curso y nombres de las unidades
│   │       ├── 01-ley-de-ohm.mdx
│   │       ├── 02-serie-paralelo.mdx
│   │       └── ...
│   ├── components/
│   │   ├── layout/                ← header, nav de unidades, breadcrumb
│   │   └── sim/                   ← los simuladores (ver sección 6)
│   ├── lib/
│   │   ├── circuitos.ts           ← motor de cálculo compartido
│   │   ├── complejos.ts           ← aritmética de números complejos
│   │   ├── formato.ts             ← notación ingenieril (kΩ, mA, µF, °)
│   │   ├── unidades.ts            ← color de cada unidad (código de colores)
│   │   └── ejercicios/            ← generadores por tema
│   ├── layouts/
│   ├── pages/
│   │   ├── index.astro            ← índice de materias
│   │   └── [materia]/
│   │       ├── index.astro        ← índice de unidades de la materia
│   │       └── [tema].astro       ← el apunte
│   └── styles/
└── public/
    └── descargas/                 ← PDFs, guías de TP, planos
```

Regla: **un archivo `.mdx` = un tema de la planificación**. El nombre empieza con
número para fijar el orden.

**Una sola colección para todas las materias.** `content.config.ts` define `apuntes`
(glob `*/*.mdx`) y `materias` (glob `*/materia.json`). La materia sale de la carpeta,
así que sumar una materia nueva es crear una carpeta con su `materia.json` y sus `.mdx`
— sin tocar nada de `src/`. Esa es la condición que la sección 10 le pone a la Fase 5.
Los nombres de las unidades viven en `materia.json`, no en el código.

## 5. Modelo de contenido

Frontmatter de cada apunte:

```yaml
---
titulo: "Resistencias en serie, paralelo y mixto"
unidad: 1                    # 1..4, ver sección 6
orden: 2
resumen: "Cómo reducir una red de resistencias a una equivalente."
duracion: "2 clases"
requisitos: ["01-ley-de-ohm"]   # slugs de temas previos
pdf: true                       # genera la versión imprimible (ver sección 8)
descargas:                      # opcional
  - titulo: "TP N°2 — Redes mixtas"
    archivo: "/descargas/tp02-redes-mixtas.pdf"
---
```

El esquema se valida con Zod en `src/content.config.ts`, así un error de tipeo en el
frontmatter rompe el build en vez de publicar una página mal armada. Lo mismo con una
`unidad` que no exista en `materia.json` o un `requisito` que apunte a un tema que no
está: el build falla con el nombre del archivo culpable.

## 6. Mapa de contenidos → simuladores

Esta es la parte que justifica el sitio. Cada tema de la planificación tiene su
componente. Todos comparten el motor de `src/lib/` — no duplicar cálculos.

### Unidad 1 — Circuitos en corriente continua

| Tema | Componente | Qué hace |
|---|---|---|
| Ley de Ohm | `<LeyDeOhm />` | Tres campos (V, I, R): se completan dos y calcula el tercero, más la potencia. Muestra la fórmula despejada que usó. |
| Código de colores | `<CodigoColores />` | Resistencia dibujada en SVG, bandas clickeables. Funciona en los dos sentidos: bandas → valor y valor → bandas. 4 y 5 bandas, con tolerancia. |
| Serie, paralelo y mixto | `<RedResistiva />` | El alumno arma la red agregando resistencias y eligiendo la conexión. Devuelve R equivalente **con el desarrollo paso a paso**, no solo el número. |
| Estrella-triángulo | `<EstrellaTriangulo />` | Los dos esquemas lado a lado en SVG. Se edita un lado y el otro se actualiza. Muestra las tres fórmulas aplicadas con los valores reemplazados. |
| Leyes de Kirchhoff | `<VerificadorKirchhoff />` | Circuito de dos mallas con valores editables. El alumno propone las corrientes de rama; el componente marca en verde/rojo cada nudo (ΣI = 0) y cada malla (ΣV = 0), señalando **cuál** ecuación no cierra. |

### Unidad 2 — Métodos de resolución

Todos sobre el mismo circuito base editable (dos fuentes, cinco resistencias), para
que se vea que los cinco métodos dan el mismo resultado. Ese es el objetivo didáctico
de la unidad y el sitio tiene que hacerlo evidente.

| Tema | Componente | Qué hace |
|---|---|---|
| Método de mallas | `<Mallas />` | Arma el sistema de ecuaciones a partir del circuito, muestra la matriz de resistencias y resuelve por Cramer con los determinantes desarrollados. |
| Método de nudos | `<Nudos />` | Ídem con la matriz de conductancias y las tensiones de nudo. Deja elegir cuál nudo es referencia. |
| Thévenin | `<Thevenin />` | Se marca la rama de carga; calcula V_Th y R_Th mostrando los dos pasos (circuito abierto y fuentes pasivadas). Dibuja el equivalente al lado. Slider de R_L que muestra I y P en la carga, y marca el máximo en R_L = R_Th. |
| Norton | `<Norton />` | Mismo motor. Muestra I_N = V_Th / R_Th y la conversión entre ambos equivalentes. |
| Superposición | `<Superposicion />` | Un toggle por fuente. Al apagar una, el esquema **se redibuja** con la fuente de tensión en cortocircuito o la de corriente en circuito abierto. Muestra el aporte parcial de cada una y la suma final. |

### Unidad 3 — Análisis de CA senoidal

| Tema | Componente | Qué hace |
|---|---|---|
| Senoide y fasor | `<SenoidalFasor />` | Sliders de amplitud, frecuencia y fase. A la izquierda el fasor girando, a la derecha v(t) trazándose **en sincronía** con la rotación. Panel de datos: Vp, Vpp, Vef, T, ω, φ. |
| Suma de senoidales | `<SumaFasorial />` | Dos senoides con fase distinta: la suma en el tiempo y la suma vectorial de fasores, en paralelo. |

La animación se pausa sola con `prefers-reduced-motion` y tiene botón de pausa.

### Unidad 4 — Circuitos en CA

| Tema | Componente | Qué hace |
|---|---|---|
| Impedancia | `<Impedancia />` | Pestañas serie / paralelo. Entradas R, L, C, f. Salidas: Z en binómica y polar, triángulo de impedancias en SVG, diagrama fasorial V-I con el desfasaje marcado, y el cartel de si el circuito es inductivo, capacitivo o resistivo. |
| Resonancia RLC | `<Resonancia />` | Barrido de frecuencia con la curva de \|Z\| y la de corriente. Marca f₀ = 1/(2π√(LC)), Q y ancho de banda. Al mover L o C, la curva se redibuja. |
| Potencia en CA | `<TrianguloPotencias />` | P, Q, S y cos φ sobre el triángulo, alimentado por los valores del componente de impedancia. |

## 7. Generador de ejercicios

Cada tema termina con ejercitación autogenerada. Un generador es una **función pura**:

```ts
generarEjercicio(seed: number) → { enunciado, datos, solucion, pasos }
```

- Botón "Otro ejercicio" → nuevo seed → valores distintos. Cada alumno resuelve números
  diferentes, así que copiarse no sirve de mucho.
- El alumno escribe el resultado; se valida con tolerancia de ±1% (los chicos redondean).
- Si erra, se despliega el desarrollo paso a paso, no solo el número correcto.
- Nada se guarda ni se envía. Sin puntajes, sin ranking, sin identificación.

## 8. Versión imprimible (PDF)

**Regla que no se rompe: el HTML es la fuente de verdad y el PDF se genera a partir de
él.** Nunca al revés, y nunca los dos mantenidos a mano. Si el mismo contenido se edita
en dos lugares, en marzo están iguales y en agosto no.

El HTML va primero porque es donde viven los simuladores, se lee en el celular sin zoom
lateral y se corrige empujando un archivo de texto. El PDF hace falta igual: los alumnos
imprimen, fotocopian y estudian subrayando papel.

**Implementación:** un paso más del build. Con `pdf: true` en el frontmatter, Playwright
abre la página ya construida y la imprime a `public/descargas/`. Se genera un PDF por
tema y uno por unidad completa. Hoja de estilos `@media print` que resuelva:

- Cada simulador se reemplaza por **una captura estática representativa** más un pie que
  diga "versión interactiva en el sitio", con QR al tema puntual. El que estudia en papel
  ve de qué se trata y sabe adónde ir.
- Se ocultan navegación, botones y todo control.
- Verificar que las fórmulas de KaTeX salgan bien en print.

Se implementa en la Fase 1, no antes: primero que exista el contenido.

**Apuntes que ya existen:** el material armado en años anteriores (Word, PDF) va tal cual
a `public/descargas/` y se enlaza desde el día uno — así el sitio sirve para algo desde el
principio. Se pasan a MDX solo los temas donde el simulador aporta de verdad (Thévenin,
fasores, resonancia). Los temas más narrativos pueden quedarse en PDF plano bastante
tiempo sin que a nadie le moleste.

## 9. Dirección visual

**Concepto: "pizarra clara".** Aire, tipografía grande y filetes de un pixel. Ninguna
caja, ningún borde grueso, ninguna sombra. El sitio se lee como un apunte bien
compuesto, no como una plataforma con widgets.

Regla que ordena todo lo demás: **el resultado de un cálculo es el elemento más grande
de la pantalla**, porque es a lo que el alumno vino. Todo el resto se subordina.

- **Paleta.** Papel `#FBFCFD`, tinta `#131820`, texto de apoyo `#626D7A`, rótulos
  `#7A8592`, filete `#E6EAEE`. Verde señal `#1D6B45` **exclusivamente** para resultados
  correctos y para el foco de teclado.
- **El sitio es claro siempre**, sin seguir el modo oscuro del sistema. La dirección se
  eligió sobre una muestra clara; servir una variante oscura según la preferencia del
  navegador entregaba un sitio que el docente no había elegido. Si más adelante hace
  falta un modo oscuro, va como interruptor explícito, no como respuesta automática al
  sistema operativo.
- **Color de unidad = código de colores de resistencias.** Unidad 1 marrón (`#7B4B2A`),
  2 rojo (`#B4342B`), 3 naranja (`#D4762A`), 4 amarillo (`#D9A428`). Aparece como un
  punto de 7 px junto al rótulo de la unidad y como filete izquierdo en las citas. El
  punto lleva un aro fino de 1 px: el amarillo de la unidad 4 da 2,2:1 contra el papel y
  no llegaría al mínimo de 3:1, y falsear el color no es opción porque el color **es** lo
  que se enseña.
- **Tipografía.** Libre Franklin para todo el texto, en 400 y 600. IBM Plex Mono para
  **todo valor numérico, unidad y resultado** — sin excepción, para que un número siempre
  se lea como número —, y también para rótulos y metadatos, en versalita espaciada.
  Ambas autohospedadas (ver §3).
- **Los esquemas de circuito se dibujan con simbología IRAM/IEC**, la misma que usan en
  el pizarrón y en las carpetas. Trazo de 2 px, sin sombras, sin gradientes, sin esquinas
  redondeadas. Esto no se moderniza: el alumno tiene que ver en pantalla el mismo símbolo
  que copió del pizarrón.
- Piso de calidad: contraste AA, foco de teclado visible, todo usable a 360 px de ancho.

> Nota de historia: la primera versión de esta sección pedía un "tablero de laboratorio"
> con bordes negros de 2 px, cero radio y cero sombras. Se implementó y se descartó: leía
> como software viejo. La dirección actual la eligió el docente entre tres propuestas.

## 10. Plan de trabajo por fases

Cada fase termina publicada y andando. No pasar a la siguiente sin desplegar la anterior.

**Fase 0 — Esqueleto. HECHA.** Astro + MDX + colección de la materia + layout + índice
de unidades + un apunte de ejemplo (`01-ley-de-ohm`).

- Sitio: https://webclases.hernanatrodriguez.workers.dev
- Repositorio: `github.com/hernanrow/webClases`

Nota sobre el hosting: Cloudflare ya no crea proyectos de **Pages** desde el dashboard;
el flujo nuevo es **Workers con Static Assets**, que da un dominio
`*.<subdominio>.workers.dev` en vez de `*.pages.dev`. Es igual de estático y gratuito,
pero la configuración vive en `wrangler.jsonc` y hay diferencias: la página 404 hay que
declararla con `not_found_handling`, cosa que Pages hacía sola.

**Fase 1 — Unidad 1 completa. HECHA.** `circuitos.ts` (Gauss con pivoteo parcial),
`colores.ts`, los cinco simuladores y los cinco apuntes. 79 tests con Vitest.

La versión imprimible **no corre en el build de Cloudflare** sino en un GitHub Action
aparte (`.github/workflows/pdf.yml`), que se dispara solo cuando cambia el contenido.
Playwright descarga Chromium (>100 MB): hacerlo en cada push convertiría un deploy de
5 segundos en varios minutos. El Action commitea los PDF y las capturas, y Cloudflare
los publica como archivos estáticos. Se respeta la regla de la §8 —el HTML es la fuente
de verdad— porque el script abre las páginas ya construidas y las imprime.

Dos restricciones tipográficas que se descubrieron generando los PDF y conviene no
volver a pisar:

- **Las fuentes van en pesos estáticos, no variables.** El motor de PDF de Chromium no
  embebe fuentes variables: las sustituye por la del sistema, y el cuerpo salía impreso
  en DejaVu Sans.
- **El símbolo del ohm (Ω, U+03A9) cae en la fuente de reserva del sistema.** Es un
  carácter griego y ningún subset de @fontsource lo trae para Libre Franklin ni para
  IBM Plex Mono. Se ve en pantalla como una Ω de otra tipografía al lado de números en
  Plex Mono. Arreglarlo requiere generar un subset propio a partir del IBM Plex
  completo; queda pendiente y no bloquea nada.

**Fase 2 — Unidad 2. HECHA.** Circuito base compartido (`src/lib/circuito-base.ts`) y
los cinco métodos sobre él, con sus cinco apuntes.

Que los cinco den el mismo resultado no queda como intención: `circuito-base.test.ts`
compara los métodos entre sí sobre cinco circuitos distintos —incluidos uno con fuente
negativa y uno con una fuente en cero— y el build falla si alguno se desvía. Los cinco
componentes comparten el esquema (`CircuitoBaseSvg`) y la tabla de corrientes de rama
(`comun.tsx`), que es lo que hace evidente en pantalla que resuelven lo mismo.

**Fase 3 — Unidades 3 y 4. HECHA.** `complejos.ts`, `ca.ts` y los cinco componentes
de corriente alterna, con sus cinco apuntes.

La animación vive en `usarAnimacion.ts`, no repartida por los componentes: ahí están las
tres reglas —pausa automática con `prefers-reduced-motion`, botón de pausa siempre
disponible, y freno con la pestaña oculta para no gastar batería— más el recorte del
salto de tiempo al volver de segundo plano.

Nota para verificar animaciones: en un navegador controlado por herramientas,
`document.hidden` suele dar `true` y `requestAnimationFrame` no dispara. El movimiento no
se puede comprobar así. Lo que sí se verifica —y es lo que importa— es la
**correspondencia geométrica**: la altura de la punta del fasor tiene que ser igual a la
del cursor de la curva, para cualquier fase y amplitud.

**Fase 4 — Ejercitación.** Generadores por tema, buscador del sitio, modo offline
(service worker) para que el material siga disponible sin señal en el aula.

**Fase 5 — Segunda materia.** Se agrega una colección nueva; si hace falta tocar algo
fuera de `src/content/`, la estructura de la fase 0 estaba mal.

## 11. Cargar un apunte nuevo

1. Crear `src/content/circuitos-redes-i/05-tema-nuevo.mdx`.
2. Copiar el frontmatter de otro apunte y cambiar los datos.
3. Escribir en Markdown. Para insertar un simulador: `<Impedancia />`.
4. `git push` — Cloudflare Pages reconstruye y publica solo.

## 12. Convenciones de código

- TypeScript en modo estricto en todo `src/lib/`.
- El motor de cálculo no importa nada de Preact: son funciones puras, testeables y
  reutilizables entre componentes.
- Tests con Vitest para `circuitos.ts` y `complejos.ts` contra ejercicios resueltos a
  mano. **Un simulador que da mal un resultado es peor que no tenerlo**: el alumno
  estudia con eso.
- Todo valor mostrado pasa por `formato.ts`: notación ingenieril, unidad correcta y
  cantidad de cifras significativas coherente con los datos de entrada.
- Comentarios y nombres de variables en español, alineados con el vocabulario de la
  materia (`tensión`, `corriente`, `impedancia`, `nudo`, `malla`).
