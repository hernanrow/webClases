import { useState } from 'preact/hooks';
import { verificarKirchhoff, resolverSistema } from '../../lib/circuitos';
import { ingenieril, leerNumero } from '../../lib/formato';

/**
 * Circuito de dos mallas con valores editables. El alumno propone las corrientes
 * de rama y el componente marca cada nudo (ΣI = 0) y cada malla (ΣV = 0),
 * señalando **cuál** ecuación no cierra (CLAUDE.md §6).
 *
 * No corrige con un simple "mal": muestra por cuánto no cierra cada ecuación,
 * que es la información con la que el alumno puede encontrar su error.
 *
 * El circuito:
 *
 *     ┌──R1──┬──R2──┐
 *     │      │      │
 *    (V1)   R3     (V2)
 *     │      │      │
 *     └──────┴──────┘
 *
 * I1 entra al nudo por R1, I2 entra por R2, I3 sale por R3.
 */

const DATOS_INICIALES = { v1: '12', v2: '6', r1: '100', r2: '220', r3: '330' };

export default function VerificadorKirchhoff() {
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [propuesta, setPropuesta] = useState({ i1: '', i2: '', i3: '' });
  const [mostrarSolucion, setMostrarSolucion] = useState(false);

  const n = {
    v1: leerNumero(datos.v1),
    v2: leerNumero(datos.v2),
    r1: leerNumero(datos.r1),
    r2: leerNumero(datos.r2),
    r3: leerNumero(datos.r3),
  };
  const circuitoValido =
    n.v1 !== null && n.v2 !== null && n.r1 !== null && n.r2 !== null && n.r3 !== null &&
    n.r1 > 0 && n.r2 > 0 && n.r3 > 0;

  // Solución exacta por corrientes de rama:
  //   nudo:    I1 + I2 − I3 = 0
  //   malla 1: R1·I1 + R3·I3 = V1
  //   malla 2: R2·I2 + R3·I3 = V2
  let exacta: { i1: number; i2: number; i3: number } | null = null;
  if (circuitoValido) {
    const [i1, i2, i3] = resolverSistema(
      [
        [1, 1, -1],
        [n.r1!, 0, n.r3!],
        [0, n.r2!, n.r3!],
      ],
      [0, n.v1!, n.v2!],
    );
    exacta = { i1: i1!, i2: i2!, i3: i3! };
  }

  // Lo que propuso el alumno, en amperes (los campos están en mA).
  const p = {
    i1: leerNumero(propuesta.i1),
    i2: leerNumero(propuesta.i2),
    i3: leerNumero(propuesta.i3),
  };
  const propuestaCompleta = p.i1 !== null && p.i2 !== null && p.i3 !== null;

  let verificacion: ReturnType<typeof verificarKirchhoff> | null = null;
  if (circuitoValido && propuestaCompleta) {
    const i1 = p.i1! * 1e-3;
    const i2 = p.i2! * 1e-3;
    const i3 = p.i3! * 1e-3;

    verificacion = verificarKirchhoff(
      [
        {
          nombre: 'Nudo A',
          corrientes: [
            { rama: 'I1', valor: i1 },
            { rama: 'I2', valor: i2 },
            { rama: 'I3', valor: -i3 },
          ],
        },
      ],
      [
        {
          nombre: 'Malla 1 (V1, R1, R3)',
          tensiones: [
            { elemento: 'V1', valor: n.v1! },
            { elemento: 'R1', valor: -n.r1! * i1 },
            { elemento: 'R3', valor: -n.r3! * i3 },
          ],
        },
        {
          nombre: 'Malla 2 (V2, R2, R3)',
          tensiones: [
            { elemento: 'V2', valor: n.v2! },
            { elemento: 'R2', valor: -n.r2! * i2 },
            { elemento: 'R3', valor: -n.r3! * i3 },
          ],
        },
      ],
      // Dos tolerancias distintas porque son magnitudes distintas: medio
      // miliampere en los nudos, 50 mV en las mallas. El alumno redondea, y
      // marcar en rojo una respuesta bien redondeada es peor que dejar pasar
      // medio miliampere.
      { corriente: 5e-4, tension: 0.05 },
    );
  }

  const todo = verificacion?.todoCierra ?? false;

  return (
    <div class="sim">
      <p class="sim__rotulo">Verificador de Kirchhoff</p>

      <Circuito />

      <div class="sim__campos">
        {(
          [
            ['v1', 'V1', 'V'],
            ['v2', 'V2', 'V'],
            ['r1', 'R1', 'Ω'],
            ['r2', 'R2', 'Ω'],
            ['r3', 'R3', 'Ω'],
          ] as const
        ).map(([clave, rotulo, unidad]) => (
          <label class="campo campo--chico" key={clave}>
            <span class="campo__rotulo">{rotulo}</span>
            <span class="campo__fila">
              <input
                type="text"
                inputMode="decimal"
                value={datos[clave]}
                aria-label={`${rotulo} en ${unidad === 'Ω' ? 'ohm' : 'volt'}`}
                onInput={(e) => setDatos({ ...datos, [clave]: (e.target as HTMLInputElement).value })}
              />
              <span class="campo__unidad">{unidad}</span>
            </span>
          </label>
        ))}
      </div>

      <p class="sim__aviso">
        Resolvé el circuito en la carpeta y escribí acá las tres corrientes de rama, en
        miliamperes. El componente te dice qué ecuación no cierra y por cuánto.
      </p>

      <div class="sim__campos">
        {(['i1', 'i2', 'i3'] as const).map((clave) => (
          <label class="campo campo--chico" key={clave}>
            <span class="campo__rotulo">{clave.toUpperCase()}</span>
            <span class="campo__fila">
              <input
                type="text"
                inputMode="decimal"
                value={propuesta[clave]}
                placeholder="?"
                aria-label={`Corriente ${clave.toUpperCase()} en miliamperes`}
                onInput={(e) =>
                  setPropuesta({ ...propuesta, [clave]: (e.target as HTMLInputElement).value })
                }
              />
              <span class="campo__unidad">mA</span>
            </span>
          </label>
        ))}
      </div>

      {!circuitoValido && (
        <p class="sim__error">
          Completá las dos fuentes y las tres resistencias con valores válidos.
        </p>
      )}

      {verificacion && (
        <>
          <ul class="ecuaciones">
            {[...verificacion.nudos, ...verificacion.mallas].map((r) => (
              <li key={r.nombre} class={r.cierra ? 'ecuacion ecuacion--bien' : 'ecuacion ecuacion--mal'}>
                <span class="ecuacion__marca" aria-hidden="true">
                  {r.cierra ? '✓' : '✗'}
                </span>
                <span class="ecuacion__cuerpo">
                  <span class="ecuacion__nombre">{r.nombre}</span>
                  <span class="ecuacion__resto">
                    {r.cierra
                      ? 'cierra'
                      : `no cierra por ${ingenieril(
                          Math.abs(r.suma),
                          r.nombre.startsWith('Nudo') ? 'A' : 'V',
                        )}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {todo && (
            <div class="sim__resultado" style="margin-top:1.2rem">
              <em>Resultado</em>
              <span class="sim__valor">Cierra todo</span>
            </div>
          )}
        </>
      )}

      <div class="sim__acciones">
        <button type="button" class="boton" onClick={() => setMostrarSolucion(!mostrarSolucion)}>
          {mostrarSolucion ? 'Ocultar solución' : 'Ver solución'}
        </button>
        <button
          type="button"
          class="boton"
          onClick={() => {
            setPropuesta({ i1: '', i2: '', i3: '' });
            setMostrarSolucion(false);
          }}
        >
          Limpiar
        </button>
      </div>

      {mostrarSolucion && exacta && (
        <ol class="pasos">
          <li>
            <span class="pasos__que">Nudo A</span>
            <span class="pasos__cuenta">I1 + I2 − I3 = 0</span>
          </li>
          <li>
            <span class="pasos__que">Malla 1</span>
            <span class="pasos__cuenta">
              R1·I1 + R3·I3 = V1 → {n.r1}·I1 + {n.r3}·I3 = {n.v1}
            </span>
          </li>
          <li>
            <span class="pasos__que">Malla 2</span>
            <span class="pasos__cuenta">
              R2·I2 + R3·I3 = V2 → {n.r2}·I2 + {n.r3}·I3 = {n.v2}
            </span>
          </li>
          <li>
            <span class="pasos__que">Resolviendo el sistema</span>
            <span class="pasos__cuenta">
              I1 = {ingenieril(exacta.i1, 'A')} · I2 = {ingenieril(exacta.i2, 'A')} · I3 ={' '}
              {ingenieril(exacta.i3, 'A')}
            </span>
          </li>
        </ol>
      )}
    </div>
  );
}

/** El circuito de dos mallas, en simbología IRAM/IEC. */
function Circuito() {
  return (
    <svg
      class="esquema__svg esquema__svg--ancho"
      viewBox="0 0 300 180"
      role="img"
      aria-label="Circuito de dos mallas: fuente V1 con R1 a la izquierda, fuente V2 con R2 a la derecha, y R3 en la rama central"
    >
      <g class="hilo">
        <line x1="30" y1="40" x2="115" y2="40" />
        <line x1="185" y1="40" x2="270" y2="40" />
        <line x1="150" y1="40" x2="150" y2="65" />
        <line x1="150" y1="105" x2="150" y2="150" />
        <line x1="30" y1="150" x2="270" y2="150" />
        <line x1="30" y1="40" x2="30" y2="62" />
        <line x1="30" y1="98" x2="30" y2="150" />
        <line x1="270" y1="40" x2="270" y2="62" />
        <line x1="270" y1="98" x2="270" y2="150" />
        <line x1="115" y1="40" x2="150" y2="40" />
        <line x1="150" y1="40" x2="185" y2="40" />
      </g>

      <rect class="resistencia-simbolo" x="88" y="30" width="34" height="20" />
      <rect class="resistencia-simbolo" x="178" y="30" width="34" height="20" />
      <rect class="resistencia-simbolo" x="140" y="65" width="20" height="40" />

      <g class="fuente">
        <line x1="16" y1="62" x2="44" y2="62" class="fuente__larga" />
        <line x1="24" y1="70" x2="36" y2="70" class="fuente__corta" />
        <line x1="16" y1="78" x2="44" y2="78" class="fuente__larga" />
        <line x1="24" y1="86" x2="36" y2="86" class="fuente__corta" />
        <line x1="256" y1="62" x2="284" y2="62" class="fuente__larga" />
        <line x1="264" y1="70" x2="276" y2="70" class="fuente__corta" />
        <line x1="256" y1="78" x2="284" y2="78" class="fuente__larga" />
        <line x1="264" y1="86" x2="276" y2="86" class="fuente__corta" />
      </g>

      <circle class="nudo" cx="150" cy="40" r="3.5" />
      <circle class="nudo" cx="150" cy="150" r="3.5" />

      <text class="rotulo-r" x="95" y="24">R1</text>
      <text class="rotulo-r" x="185" y="24">R2</text>
      <text class="rotulo-r" x="166" y="90">R3</text>
      <text class="rotulo-r" x="52" y="78">V1</text>
      <text class="rotulo-r" x="222" y="78">V2</text>
      <text class="borne" x="158" y="34">A</text>
      <text class="rotulo-r" x="118" y="58">I1 →</text>
      <text class="rotulo-r" x="192" y="58">← I2</text>
      <text class="rotulo-r" x="166" y="126">↓ I3</text>
    </svg>
  );
}
