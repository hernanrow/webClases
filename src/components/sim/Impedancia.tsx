import { useState } from 'preact/hooks';
import { impedancia, type Conexion, type CircuitoCA } from '../../lib/ca';
import { binomica, polar, modulo } from '../../lib/complejos';
import { ingenieril, coma, leerNumero } from '../../lib/formato';

/**
 * Pestañas serie / paralelo. Entradas R, L, C, f. Salidas: Z en binómica y
 * polar, triángulo de impedancias en SVG, diagrama fasorial V-I con el
 * desfasaje marcado, y el cartel de si el circuito es inductivo, capacitivo o
 * resistivo (CLAUDE.md §6).
 */

const INICIAL = { r: '30', l: '100', c: '0', f: '50' };

export default function Impedancia() {
  const [texto, setTexto] = useState(INICIAL);
  const [conexion, setConexion] = useState<Conexion>('serie');

  // L se escribe en mH y C en µF, que es como vienen los componentes.
  const r = leerNumero(texto.r);
  const lmH = leerNumero(texto.l);
  const cuF = leerNumero(texto.c);
  const f = leerNumero(texto.f);

  const valido =
    r !== null && lmH !== null && cuF !== null && f !== null && r >= 0 && lmH >= 0 && cuF >= 0 && f > 0;

  if (!valido) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Impedancia</p>
        <Campos texto={texto} setTexto={setTexto} />
        <p class="sim__error">
          Completá los cuatro valores. La frecuencia tiene que ser mayor que cero; poné
          L o C en cero si ese componente no está.
        </p>
      </div>
    );
  }

  const circuito: CircuitoCA = { r, l: lmH * 1e-3, c: cuF * 1e-6, f, conexion };
  const res = impedancia(circuito);
  const m = modulo(res.z);

  const CARTEL: Record<typeof res.caracter, string> = {
    inductivo: 'La tensión adelanta a la corriente. Predomina la bobina.',
    capacitivo: 'La corriente adelanta a la tensión. Predomina el capacitor.',
    resistivo: 'Tensión y corriente en fase. Las reactancias se cancelan.',
  };

  return (
    <div class="sim">
      <p class="sim__rotulo">Impedancia</p>

      <div class="sim__acciones" style="margin-top:0" role="tablist" aria-label="Conexión">
        {(['serie', 'paralelo'] as Conexion[]).map((c) => (
          <button
            type="button"
            key={c}
            role="tab"
            aria-selected={conexion === c}
            class={`boton${conexion === c ? ' boton--activo' : ''}`}
            onClick={() => setConexion(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <Campos texto={texto} setTexto={setTexto} />

      <div class="sim__resultado">
        <em>Impedancia</em>
        <span class="sim__valor">{Number.isFinite(m) ? ingenieril(m, 'Ω') : '∞ Ω'}</span>
        <span class="sim__secundario">
          ∠ {coma(res.desfasaje.toFixed(1)).replace('-', '−')}°
        </span>
      </div>

      <table class="ramas">
        <tbody>
          <tr>
            <th scope="row" style="text-transform:none;letter-spacing:0">Forma binómica</th>
            <td class="num">{Number.isFinite(m) ? binomica(res.z, 'Ω') : '∞'}</td>
          </tr>
          <tr>
            <th scope="row" style="text-transform:none;letter-spacing:0">Forma polar</th>
            <td class="num">{Number.isFinite(m) ? polar(res.z, 'Ω') : '∞'}</td>
          </tr>
          <tr>
            <th scope="row" style="text-transform:none;letter-spacing:0">Reactancia inductiva</th>
            <td class="num">{lmH > 0 ? ingenieril(res.xl, 'Ω') : '—'}</td>
          </tr>
          <tr>
            <th scope="row" style="text-transform:none;letter-spacing:0">Reactancia capacitiva</th>
            <td class="num">{cuF > 0 ? ingenieril(res.xc, 'Ω') : '—'}</td>
          </tr>
          <tr>
            <th scope="row" style="text-transform:none;letter-spacing:0">Factor de potencia</th>
            <td class="num">{coma(res.factorDePotencia.toFixed(3))}</td>
          </tr>
        </tbody>
      </table>

      <p class={`cartel cartel--${res.caracter}`}>
        <strong>Circuito {res.caracter}.</strong> {CARTEL[res.caracter]}
      </p>

      {conexion === 'serie' && Number.isFinite(m) && (
        <>
          <h4 class="sim__subtitulo">Triángulo de impedancias</h4>
          <p class="sim__aviso" style="margin-top:0">
            R en el eje horizontal, la reactancia neta en el vertical, y Z es la
            hipotenusa. Por eso el módulo sale de Pitágoras y el ángulo de la tangente.
          </p>
          <TrianguloImpedancias r={res.z.re} x={res.z.im} />
        </>
      )}

      <h4 class="sim__subtitulo">Diagrama fasorial de tensión y corriente</h4>
      <DiagramaVI desfasaje={res.desfasaje} caracter={res.caracter} />
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

/** R horizontal, X vertical, Z la hipotenusa. */
function TrianguloImpedancias({ r, x }: { r: number; x: number }) {
  const maximo = Math.max(Math.abs(r), Math.abs(x), 1);
  const escala = 96 / maximo;
  const x0 = 26;
  const y0 = 108;
  const xR = x0 + Math.abs(r) * escala;
  // Inductivo va para arriba, capacitivo para abajo, como en el pizarrón.
  const yX = y0 - x * escala;

  return (
    <svg class="curva" viewBox="0 0 180 190" role="img" aria-label={`Triángulo de impedancias: resistencia ${ingenieril(r, 'Ω')}, reactancia ${ingenieril(x, 'Ω')}`}>
      <line class="fasor__eje" x1="10" y1={y0} x2="170" y2={y0} />
      <line class="fasor__eje" x1={x0} y1="14" x2={x0} y2="180" />

      <line class="triangulo__cateto" x1={x0} y1={y0} x2={xR} y2={y0} />
      <line class="triangulo__cateto" x1={xR} y1={y0} x2={xR} y2={yX} />
      <line class="triangulo__hipotenusa" x1={x0} y1={y0} x2={xR} y2={yX} />

      <text class="fasor__rotulo" x={(x0 + xR) / 2 - 8} y={y0 + 14}>
        R
      </text>
      <text class="fasor__rotulo" x={xR + 4} y={(y0 + yX) / 2}>
        X
      </text>
      <text class="fasor__rotulo" x={(x0 + xR) / 2 - 20} y={(y0 + yX) / 2 - 4}>
        Z
      </text>
    </svg>
  );
}

/** Los fasores de tensión y corriente con el ángulo entre ellos marcado. */
function DiagramaVI({ desfasaje, caracter }: { desfasaje: number; caracter: string }) {
  const cx = 90;
  const cy = 90;
  const largo = 66;
  const rad = (desfasaje * Math.PI) / 180;

  // Se toma la corriente como referencia sobre el eje horizontal, que es la
  // convención cuando el circuito es serie: la corriente es común a todo.
  const vx = cx + largo * Math.cos(rad);
  const vy = cy - largo * Math.sin(rad);

  const arco = Math.abs(desfasaje) > 0.5;
  const rArco = 30;

  return (
    <svg class="curva" viewBox="0 0 180 180" role="img" aria-label={`Diagrama fasorial: la tensión está a ${desfasaje.toFixed(0)} grados de la corriente; circuito ${caracter}`}>
      <line class="fasor__eje" x1="14" y1={cy} x2="166" y2={cy} />
      <line class="fasor__eje" x1={cx} y1="14" x2={cx} y2="166" />

      {arco && (
        <path
          class="fasor__arco"
          d={`M ${cx + rArco} ${cy} A ${rArco} ${rArco} 0 0 ${desfasaje > 0 ? 0 : 1} ${cx + rArco * Math.cos(rad)} ${cy - rArco * Math.sin(rad)}`}
        />
      )}

      <line class="fasor__vector fasor__vector--b" x1={cx} y1={cy} x2={cx + largo} y2={cy} />
      <line class="fasor__vector" x1={cx} y1={cy} x2={vx} y2={vy} />

      <text class="fasor__rotulo" x={cx + largo + 3} y={cy + 12}>
        I
      </text>
      <text class="fasor__rotulo" x={vx + 4} y={vy - 4}>
        V
      </text>
      {arco && (
        <text class="fasor__rotulo" x={cx + rArco + 4} y={cy - (desfasaje > 0 ? 10 : -18)}>
          φ = {coma(desfasaje.toFixed(0)).replace('-', '−')}°
        </text>
      )}
    </svg>
  );
}
