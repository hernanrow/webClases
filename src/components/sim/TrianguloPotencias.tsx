import { useState } from 'preact/hooks';
import { impedancia, potenciasDe, capacidadParaCorregir, type Conexion } from '../../lib/ca';
import { modulo } from '../../lib/complejos';
import { ingenieril, coma, leerNumero } from '../../lib/formato';
import { Deslizador } from './animacion-ui';

/**
 * P, Q, S y cos φ sobre el triángulo, alimentado por los mismos valores que el
 * componente de impedancia (CLAUDE.md §6).
 *
 * Se agrega la corrección del factor de potencia porque es la aplicación real
 * del tema: es lo que hace un electricista cuando la fábrica paga penalidad.
 */

const INICIAL = { r: '30', l: '127', c: '0', v: '220', f: '50' };

export default function TrianguloPotencias() {
  const [texto, setTexto] = useState(INICIAL);
  const [conexion] = useState<Conexion>('serie');
  const [objetivo, setObjetivo] = useState(0.95);

  const r = leerNumero(texto.r);
  const lmH = leerNumero(texto.l);
  const cuF = leerNumero(texto.c);
  const v = leerNumero(texto.v);
  const f = leerNumero(texto.f);

  const valido =
    r !== null && lmH !== null && cuF !== null && v !== null && f !== null &&
    r >= 0 && lmH >= 0 && cuF >= 0 && v > 0 && f > 0;

  if (!valido) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Triángulo de potencias</p>
        <Campos texto={texto} setTexto={setTexto} />
        <p class="sim__error">Completá los cinco valores con números mayores que cero.</p>
      </div>
    );
  }

  const { z } = impedancia({ r, l: lmH * 1e-3, c: cuF * 1e-6, f, conexion });
  const m = modulo(z);

  if (!(m > 0) || !Number.isFinite(m)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Triángulo de potencias</p>
        <Campos texto={texto} setTexto={setTexto} />
        <p class="sim__error">
          Con esa combinación la impedancia es nula o infinita y la potencia no está
          definida.
        </p>
      </div>
    );
  }

  const pot = potenciasDe(v, z);
  const corriente = v / m;
  const cCorreccion = capacidadParaCorregir(pot, objetivo, v, f);

  return (
    <div class="sim">
      <p class="sim__rotulo">Triángulo de potencias</p>

      <Campos texto={texto} setTexto={setTexto} />

      <Triangulo p={pot.p} q={pot.q} s={pot.s} />

      <div class="sim__resultado">
        <em>Potencia activa</em>
        <span class="sim__valor">{ingenieril(pot.p, 'W')}</span>
        <span class="sim__secundario">cos φ = {coma(pot.factorDePotencia.toFixed(3))}</span>
      </div>

      <table class="ramas">
        <tbody>
          {(
            [
              ['Corriente', ingenieril(corriente, 'A')],
              ['Potencia aparente S', `${ingenieril(pot.s, 'VA')}`],
              ['Potencia activa P', `${ingenieril(pot.p, 'W')}`],
              ['Potencia reactiva Q', `${ingenieril(pot.q, 'var')}`],
              ['Factor de potencia', coma(pot.factorDePotencia.toFixed(3))],
              ['Desfasaje φ', `${coma(pot.desfasaje.toFixed(1)).replace('-', '−')}°`],
            ] as const
          ).map(([nombre, valor]) => (
            <tr key={nombre}>
              <th scope="row" style="text-transform:none;letter-spacing:0">
                {nombre}
              </th>
              <td class="num">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p class="sim__aviso">
        Comprobación de Pitágoras: √(P² + Q²) ={' '}
        <strong class="coincide">{ingenieril(Math.hypot(pot.p, pot.q), 'VA')}</strong>, que
        es S. El triángulo cierra siempre.
      </p>

      <h4 class="sim__subtitulo">Corrección del factor de potencia</h4>
      <p class="sim__aviso" style="margin-top:0">
        La distribuidora cobra por la aparente pero solo te sirve la activa. Si el cos φ es
        bajo, pagás por energía que no usás. Se corrige poniendo capacitores en paralelo,
        que aportan reactiva de signo contrario a la de las bobinas.
      </p>

      <div class="sim__campos">
        <Deslizador
          rotulo="cos φ objetivo"
          valor={objetivo}
          min={0.5}
          max={1}
          paso={0.01}
          unidad=""
          onCambio={(x) => setObjetivo(Number(x.toFixed(2)))}
        />
      </div>

      {pot.q <= 0 ? (
        <p class="sim__aviso">
          Este circuito no es inductivo, así que no hay reactiva inductiva que compensar.
          Probá subiendo la inductancia.
        </p>
      ) : cCorreccion > 0 ? (
        <div class="sim__resultado">
          <em>Capacitor necesario</em>
          <span class="sim__valor">{ingenieril(cCorreccion, 'F')}</span>
          <span class="sim__secundario">
            en paralelo, para pasar de cos φ {coma(pot.factorDePotencia.toFixed(2))} a{' '}
            {coma(objetivo.toFixed(2))}
          </span>
        </div>
      ) : (
        <p class="sim__aviso coincide">
          El cos φ ya es mejor que el objetivo: no hace falta corregir nada.
        </p>
      )}
    </div>
  );
}

function Campos({
  texto,
  setTexto,
}: {
  texto: Record<string, string>;
  setTexto: (t: Record<string, string>) => void;
}) {
  return (
    <div class="sim__campos">
      {(
        [
          ['v', 'V eficaz', 'V'],
          ['r', 'R', 'Ω'],
          ['l', 'L', 'mH'],
          ['c', 'C', 'µF'],
          ['f', 'f', 'Hz'],
        ] as const
      ).map(([clave, rotulo, unidad]) => (
        <label class="campo campo--chico" key={clave}>
          <span class="campo__rotulo">{rotulo}</span>
          <span class="campo__fila">
            <input
              type="text"
              inputMode="decimal"
              value={texto[clave]}
              aria-label={`${rotulo} en ${unidad}`}
              onInput={(e) => setTexto({ ...texto, [clave]: (e.target as HTMLInputElement).value })}
            />
            <span class="campo__unidad">{unidad}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** P horizontal, Q vertical, S la hipotenusa. Es el mismo triángulo que el de impedancias. */
function Triangulo({ p, q, s }: { p: number; q: number; s: number }) {
  const maximo = Math.max(Math.abs(p), Math.abs(q), 1);
  const escala = 108 / maximo;
  const x0 = 30;
  const y0 = 118;
  const xP = x0 + Math.abs(p) * escala;
  const yQ = y0 - q * escala;

  return (
    <svg
      class="curva"
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Triángulo de potencias: activa ${ingenieril(p, 'W')}, reactiva ${ingenieril(q, 'var')}, aparente ${ingenieril(s, 'VA')}`}
    >
      <line class="fasor__eje" x1="12" y1={y0} x2="190" y2={y0} />
      <line class="fasor__eje" x1={x0} y1="12" x2={x0} y2="190" />

      <line class="triangulo__cateto" x1={x0} y1={y0} x2={xP} y2={y0} />
      <line class="triangulo__cateto" x1={xP} y1={y0} x2={xP} y2={yQ} />
      <line class="triangulo__hipotenusa" x1={x0} y1={y0} x2={xP} y2={yQ} />

      <text class="fasor__rotulo" x={(x0 + xP) / 2 - 20} y={y0 + 14}>
        P {ingenieril(p, 'W', 3)}
      </text>
      <text class="fasor__rotulo" x={xP + 4} y={(y0 + yQ) / 2}>
        Q {ingenieril(Math.abs(q), 'var', 3)}
      </text>
      <text class="fasor__rotulo" x={x0 + 6} y={(y0 + yQ) / 2 - 8}>
        S {ingenieril(s, 'VA', 3)}
      </text>
    </svg>
  );
}
