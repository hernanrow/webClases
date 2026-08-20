import type { CircuitoBase, CorrientesDeRama } from '../../lib/circuito-base';
import { ingenieril, leerNumero } from '../../lib/formato';

/**
 * Piezas compartidas por los cinco simuladores de la Unidad 2. Que compartan
 * los controles y la tabla de resultados no es solo ahorro de código: refuerza
 * que los cinco están resolviendo el mismo circuito.
 */

const CAMPOS = [
  ['v1', 'V1', 'V'],
  ['v2', 'V2', 'V'],
  ['r1', 'R1', 'Ω'],
  ['r2', 'R2', 'Ω'],
  ['r3', 'R3', 'Ω'],
  ['r4', 'R4', 'Ω'],
  ['r5', 'R5', 'Ω'],
] as const;

/** Los siete campos del circuito base. */
export function ControlesCircuito({
  texto,
  onCambio,
}: {
  texto: Record<string, string>;
  onCambio: (clave: string, valor: string) => void;
}) {
  return (
    <div class="sim__campos">
      {CAMPOS.map(([clave, rotulo, unidad]) => (
        <label class="campo campo--chico" key={clave}>
          <span class="campo__rotulo">{rotulo}</span>
          <span class="campo__fila">
            <input
              type="text"
              inputMode="decimal"
              value={texto[clave]}
              aria-label={`${rotulo} en ${unidad === 'Ω' ? 'ohm' : 'volt'}`}
              onInput={(e) => onCambio(clave, (e.target as HTMLInputElement).value)}
            />
            <span class="campo__unidad">{unidad}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

/** Pasa los siete campos de texto a números, o devuelve null si alguno no sirve. */
export function leerCircuito(texto: Record<string, string>): CircuitoBase | null {
  const n: Record<string, number> = {};
  for (const [clave] of CAMPOS) {
    const v = leerNumero(texto[clave] ?? '');
    if (v === null) return null;
    if (clave.startsWith('r') && v <= 0) return null;
    n[clave] = v;
  }
  return n as unknown as CircuitoBase;
}

export const TEXTO_INICIAL: Record<string, string> = {
  v1: '12',
  v2: '6',
  r1: '100',
  r2: '220',
  r3: '330',
  r4: '470',
  r5: '150',
};

const RAMAS = [
  ['i1', 'I₁ · R1', 'de V1 hacia A'],
  ['i2', 'I₂ · R2', 'de A a la referencia'],
  ['i3', 'I₃ · R3', 'de A hacia B'],
  ['i4', 'I₄ · R4', 'de B a la referencia'],
  ['i5', 'I₅ · R5', 'de V2 hacia B'],
] as const;

/**
 * Las cinco corrientes de rama. Es la tabla que muestran los cinco métodos, con
 * los mismos números: es la manera de hacer evidente que dan lo mismo.
 */
export function TablaDeRamas({
  corrientes,
  titulo = 'Corrientes de rama',
}: {
  corrientes: CorrientesDeRama;
  titulo?: string;
}) {
  return (
    <table class="ramas">
      <caption class="sim__rotulo" style="text-align:left;margin-bottom:0.5rem">
        {titulo}
      </caption>
      <thead>
        <tr>
          <th scope="col">Rama</th>
          <th scope="col">Sentido positivo</th>
          <th scope="col" class="num">
            Corriente
          </th>
        </tr>
      </thead>
      <tbody>
        {RAMAS.map(([clave, rotulo, sentido]) => (
          <tr key={clave}>
            <th scope="row" style="font-family:var(--mono);text-transform:none;letter-spacing:0">
              {rotulo}
            </th>
            <td>{sentido}</td>
            <td class="num">{ingenieril(corrientes[clave], 'A')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Una matriz con sus llaves, para mostrar el sistema como en la carpeta. */
export function Matriz({
  filas,
  columnas,
  formato = (x) => String(x),
}: {
  /** Números o rótulos: el vector de incógnitas también se dibuja como matriz. */
  filas: (number | string)[][];
  columnas?: number;
  formato?: (x: number | string) => string;
}) {
  const cols = columnas ?? filas[0]?.length ?? 1;
  return (
    <div class="matriz">
      <span class="matriz__llave" aria-hidden="true" />
      <div class="matriz__celdas" style={`grid-template-columns: repeat(${cols}, auto)`}>
        {filas.flatMap((fila, i) =>
          fila.map((x, j) => (
            <span class="matriz__celda" key={`${i}-${j}`}>
              {formato(x)}
            </span>
          )),
        )}
      </div>
      <span class="matriz__llave matriz__llave--der" aria-hidden="true" />
    </div>
  );
}

export function avisoCircuitoInvalido() {
  return (
    <p class="sim__error">
      Completá las dos fuentes y las cinco resistencias. Las resistencias tienen que ser
      mayores que cero.
    </p>
  );
}
