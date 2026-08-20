import { useState } from 'preact/hooks';
import { leyDeOhm, type MagnitudOhm } from '../../lib/circuitos';
import { ingenieril, leerNumero, coma } from '../../lib/formato';

/**
 * Tres campos: V, I y R. Se completan dos y calcula el tercero más la potencia,
 * mostrando la fórmula despejada que usó (CLAUDE.md §6).
 *
 * Si el alumno escribe en el tercer campo, el que pasa a calcularse es el que
 * hace más tiempo que no toca. Así siempre hay dos datos y una incógnita sin
 * que tenga que borrar nada.
 */

type Clave = 'tension' | 'corriente' | 'resistencia';

interface Unidad {
  rotulo: string;
  /** Factor para pasar a la unidad base. */
  factor: number;
}

const UNIDADES: Record<Clave, Unidad[]> = {
  tension: [
    { rotulo: 'V', factor: 1 },
    { rotulo: 'mV', factor: 1e-3 },
    { rotulo: 'kV', factor: 1e3 },
  ],
  corriente: [
    { rotulo: 'mA', factor: 1e-3 },
    { rotulo: 'A', factor: 1 },
    { rotulo: 'µA', factor: 1e-6 },
  ],
  resistencia: [
    { rotulo: 'Ω', factor: 1 },
    { rotulo: 'kΩ', factor: 1e3 },
    { rotulo: 'MΩ', factor: 1e6 },
  ],
};

const NOMBRE: Record<Clave, string> = {
  tension: 'Tensión',
  corriente: 'Corriente',
  resistencia: 'Resistencia',
};

const SIMBOLO: Record<Clave, string> = {
  tension: 'V',
  corriente: 'I',
  resistencia: 'R',
};

const UNIDAD_BASE: Record<Clave, string> = {
  tension: 'V',
  corriente: 'A',
  resistencia: 'Ω',
};

const CLAVES: Clave[] = ['tension', 'corriente', 'resistencia'];

export default function LeyDeOhm() {
  const [texto, setTexto] = useState<Record<Clave, string>>({
    tension: '9',
    corriente: '',
    resistencia: '220',
  });
  const [unidad, setUnidad] = useState<Record<Clave, number>>({
    tension: 0,
    corriente: 0,
    resistencia: 0,
  });
  // Más reciente primero. La incógnita es la que no está entre las dos primeras.
  const [orden, setOrden] = useState<Clave[]>(['resistencia', 'tension', 'corriente']);

  const incognita = orden[2]!;

  function editar(clave: Clave, valor: string) {
    setTexto({ ...texto, [clave]: valor });
    if (orden[0] !== clave) {
      setOrden([clave, ...orden.filter((c) => c !== clave)]);
    }
  }

  function limpiar() {
    setTexto({ tension: '', corriente: '', resistencia: '' });
    setOrden(['resistencia', 'tension', 'corriente']);
  }

  // Los dos datos, ya pasados a unidades base.
  const datos: Partial<Record<Clave, number>> = {};
  let faltan = false;
  for (const clave of CLAVES) {
    if (clave === incognita) continue;
    const n = leerNumero(texto[clave]);
    if (n === null) {
      faltan = true;
      continue;
    }
    datos[clave] = n * UNIDADES[clave][unidad[clave]]!.factor;
  }

  let resultado: ReturnType<typeof leyDeOhm> | null = null;
  let error: string | null = null;
  if (!faltan) {
    try {
      resultado = leyDeOhm(datos);
    } catch (e) {
      error = e instanceof Error ? e.message : 'No se pudo resolver con esos valores.';
    }
  }

  return (
    <div class="sim">
      <p class="sim__rotulo">Ley de Ohm</p>

      <div class="sim__campos">
        {CLAVES.map((clave) => {
          const esIncognita = clave === incognita;
          const valorMostrado = esIncognita
            ? resultado
              ? formatearCampo(resultado[clave], UNIDADES[clave][unidad[clave]]!.factor)
              : ''
            : texto[clave];

          return (
            <label class={`campo${esIncognita ? ' campo--calculado' : ''}`} key={clave}>
              <span class="campo__rotulo">
                {NOMBRE[clave]} ({SIMBOLO[clave]})
              </span>
              <span class="campo__fila">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorMostrado}
                  placeholder={esIncognita ? '—' : '0'}
                  readOnly={esIncognita}
                  aria-describedby={esIncognita ? 'ohm-calculado' : undefined}
                  onInput={(e) => editar(clave, (e.target as HTMLInputElement).value)}
                />
                <select
                  value={String(unidad[clave])}
                  aria-label={`Unidad de ${NOMBRE[clave].toLowerCase()}`}
                  onChange={(e) =>
                    setUnidad({ ...unidad, [clave]: Number((e.target as HTMLSelectElement).value) })
                  }
                >
                  {UNIDADES[clave].map((u, idx) => (
                    <option value={String(idx)} key={u.rotulo}>
                      {u.rotulo}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          );
        })}
      </div>

      {resultado && (
        <>
          <div class="sim__resultado">
            <em>{NOMBRE[incognita]}</em>
            <span class="sim__valor">
              {ingenieril(resultado[incognita], UNIDAD_BASE[incognita])}
            </span>
            <span class="sim__secundario">P = {ingenieril(resultado.potencia, 'W')}</span>
          </div>

          <p class="formula" id="ohm-calculado">
            <Formula resultado={resultado} />
          </p>
        </>
      )}

      {error && <p class="sim__error">{error}</p>}
      {faltan && !error && (
        <p class="sim__aviso">
          Completá dos de los tres campos y el tercero se calcula solo.
        </p>
      )}

      <div class="sim__acciones">
        <button type="button" class="boton" onClick={limpiar}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

/** Muestra el valor calculado en la misma unidad que eligió el alumno. */
function formatearCampo(valorBase: number, factor: number): string {
  return coma(String(Number((valorBase / factor).toPrecision(4))));
}

/**
 * La fórmula despejada con los valores reemplazados, dibujada con CSS.
 * No se carga KaTeX en el navegador: pesa 280 kB y acá alcanza con dos spans.
 */
function Formula({ resultado }: { resultado: ReturnType<typeof leyDeOhm> }) {
  const v = (x: number, u: string) => ingenieril(x, u, 3);

  if (resultado.despejada === 'corriente') {
    return (
      <>
        <span>I =</span>
        <span class="frac">
          <span>V</span>
          <span>R</span>
        </span>
        <span>=</span>
        <span class="frac">
          <span>{v(resultado.tension, 'V')}</span>
          <span>{v(resultado.resistencia, 'Ω')}</span>
        </span>
      </>
    );
  }

  if (resultado.despejada === 'resistencia') {
    return (
      <>
        <span>R =</span>
        <span class="frac">
          <span>V</span>
          <span>I</span>
        </span>
        <span>=</span>
        <span class="frac">
          <span>{v(resultado.tension, 'V')}</span>
          <span>{v(resultado.corriente, 'A')}</span>
        </span>
      </>
    );
  }

  return (
    <>
      <span>
        V = I · R = {v(resultado.corriente, 'A')} · {v(resultado.resistencia, 'Ω')}
      </span>
    </>
  );
}

export type { MagnitudOhm };
