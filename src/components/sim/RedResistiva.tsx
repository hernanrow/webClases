import { useState } from 'preact/hooks';
import { reducirRed, type Red } from '../../lib/circuitos';
import { ingenieril, leerNumero, numero } from '../../lib/formato';

/**
 * El alumno arma la red agregando resistencias y eligiendo la conexión. Devuelve
 * la equivalente **con el desarrollo paso a paso**, no solo el número
 * (CLAUDE.md §6).
 *
 * Modelo: una red es un grupo (serie o paralelo) de bloques. Cada bloque es una
 * resistencia suelta o, a su vez, otro grupo. Con eso se arman todas las mixtas
 * que se ven en la unidad 1 sin necesidad de un editor de esquemas.
 */

interface Bloque {
  id: number;
  /** Resistencias del bloque. Si son varias, van conectadas entre sí por `conexion`. */
  valores: string[];
  conexion: 'serie' | 'paralelo';
}

let proximoId = 1;

const INICIAL: Bloque[] = [
  { id: proximoId++, valores: ['100'], conexion: 'serie' },
  { id: proximoId++, valores: ['220', '330'], conexion: 'paralelo' },
];

export default function RedResistiva() {
  const [bloques, setBloques] = useState<Bloque[]>(INICIAL);
  const [conexionGeneral, setConexionGeneral] = useState<'serie' | 'paralelo'>('serie');

  // Se numeran las resistencias de corrido (R1, R2, R3...) como en el pizarrón.
  let contador = 0;
  const rotulos = bloques.map((b) => b.valores.map(() => `R_${++contador}`));

  const red = construir(bloques, rotulos, conexionGeneral);
  const resultado = red ? reducirRed(red) : null;

  function editarValor(iBloque: number, iValor: number, valor: string) {
    setBloques(
      bloques.map((b, i) =>
        i === iBloque ? { ...b, valores: b.valores.map((v, j) => (j === iValor ? valor : v)) } : b,
      ),
    );
  }

  function agregarResistencia(iBloque: number) {
    setBloques(
      bloques.map((b, i) => (i === iBloque ? { ...b, valores: [...b.valores, '1000'] } : b)),
    );
  }

  function quitarResistencia(iBloque: number, iValor: number) {
    setBloques(
      bloques
        .map((b, i) =>
          i === iBloque ? { ...b, valores: b.valores.filter((_, j) => j !== iValor) } : b,
        )
        .filter((b) => b.valores.length > 0),
    );
  }

  function cambiarConexion(iBloque: number, conexion: 'serie' | 'paralelo') {
    setBloques(bloques.map((b, i) => (i === iBloque ? { ...b, conexion } : b)));
  }

  function agregarBloque() {
    setBloques([...bloques, { id: proximoId++, valores: ['470'], conexion: 'paralelo' }]);
  }

  function reiniciar() {
    setBloques(INICIAL.map((b) => ({ ...b, id: proximoId++, valores: [...b.valores] })));
    setConexionGeneral('serie');
  }

  return (
    <div class="sim">
      <p class="sim__rotulo">Red de resistencias</p>

      <p class="sim__aviso" style="margin-top:0">
        Cada bloque agrupa resistencias entre sí. Después los bloques se conectan entre
        ellos según lo que elijas abajo de todo.
      </p>

      <div class="bloques">
        {bloques.map((bloque, i) => (
          <div class="bloque" key={bloque.id}>
            <div class="bloque__cabecera">
              <span class="campo__rotulo">Bloque {i + 1}</span>
              {bloque.valores.length > 1 && (
                <span class="conmutador" role="group" aria-label={`Conexión del bloque ${i + 1}`}>
                  {(['serie', 'paralelo'] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      class={`boton boton--chico${bloque.conexion === c ? ' boton--activo' : ''}`}
                      aria-pressed={bloque.conexion === c}
                      onClick={() => cambiarConexion(i, c)}
                    >
                      {c}
                    </button>
                  ))}
                </span>
              )}
            </div>

            <div class="bloque__resistencias">
              {bloque.valores.map((valor, j) => (
                <label class="campo campo--chico" key={j}>
                  <span class="campo__rotulo">R{rotulos[i]![j]!.replace('R_', '')}</span>
                  <span class="campo__fila">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valor}
                      aria-label={`Resistencia ${rotulos[i]![j]!.replace('R_', '')} en ohm`}
                      onInput={(e) => editarValor(i, j, (e.target as HTMLInputElement).value)}
                    />
                    <span class="campo__unidad">Ω</span>
                    <button
                      type="button"
                      class="quitar"
                      aria-label={`Quitar R${rotulos[i]![j]!.replace('R_', '')}`}
                      onClick={() => quitarResistencia(i, j)}
                    >
                      ×
                    </button>
                  </span>
                </label>
              ))}
              <button type="button" class="boton boton--chico" onClick={() => agregarResistencia(i)}>
                + resistencia
              </button>
            </div>
          </div>
        ))}
      </div>

      {bloques.length > 1 && (
        <div class="bloque__cabecera" style="margin-top:1.1rem">
          <span class="campo__rotulo">Los bloques entre sí</span>
          <span class="conmutador" role="group" aria-label="Conexión entre bloques">
            {(['serie', 'paralelo'] as const).map((c) => (
              <button
                type="button"
                key={c}
                class={`boton boton--chico${conexionGeneral === c ? ' boton--activo' : ''}`}
                aria-pressed={conexionGeneral === c}
                onClick={() => setConexionGeneral(c)}
              >
                {c}
              </button>
            ))}
          </span>
        </div>
      )}

      <div class="sim__acciones">
        <button type="button" class="boton" onClick={agregarBloque}>
          + bloque
        </button>
        <button type="button" class="boton" onClick={reiniciar}>
          Reiniciar
        </button>
      </div>

      {resultado ? (
        <>
          <div class="sim__resultado" style="margin-top:1.5rem">
            <em>Equivalente</em>
            <span class="sim__valor">{ingenieril(resultado.equivalente, 'Ω')}</span>
          </div>

          {resultado.pasos.length > 0 && (
            <ol class="pasos">
              {resultado.pasos.map((paso, i) => (
                <li key={i}>
                  <span class="pasos__que">{legible(paso.descripcion)}</span>
                  <span class="pasos__cuenta">{legible(paso.desarrollo)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <p class="sim__error">
          Completá todas las resistencias con un valor mayor que cero para ver la
          equivalente.
        </p>
      )}
    </div>
  );
}

/** Arma el árbol que entiende `reducirRed` a partir de los bloques del formulario. */
function construir(
  bloques: Bloque[],
  rotulos: string[][],
  conexionGeneral: 'serie' | 'paralelo',
): Red | null {
  const hijos: Red[] = [];

  for (let i = 0; i < bloques.length; i++) {
    const bloque = bloques[i]!;
    const resistencias: Red[] = [];

    for (let j = 0; j < bloque.valores.length; j++) {
      const v = leerNumero(bloque.valores[j]!);
      if (v === null || v <= 0) return null;
      resistencias.push({ tipo: 'resistencia', rotulo: rotulos[i]![j]!, valor: v });
    }

    if (resistencias.length === 0) return null;
    hijos.push(
      resistencias.length === 1
        ? resistencias[0]!
        : { tipo: bloque.conexion, hijos: resistencias },
    );
  }

  if (hijos.length === 0) return null;
  return hijos.length === 1 ? hijos[0]! : { tipo: conexionGeneral, hijos };
}

/**
 * El desarrollo viene en LaTeX porque lo comparte con la versión imprimible.
 * Acá se pasa a texto plano: cargar KaTeX en el navegador serían 280 kB.
 */
function legible(latex: string): string {
  return latex
    .replace(/\\frac\{1\}\{([^}]+)\}/g, '1/$1')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Omega/g, 'Ω')
    .replace(/R_\{eq(\d+)\}/g, 'Req$1')
    .replace(/R_(\d+)/g, 'R$1')
    .replace(/\\ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { numero };
