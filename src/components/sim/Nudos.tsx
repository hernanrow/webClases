import { useState } from 'preact/hooks';
import { resolverPorNudos, esValido } from '../../lib/circuito-base';
import { ingenieril, numero } from '../../lib/formato';
import CircuitoBaseSvg from './CircuitoBaseSvg';
import {
  ControlesCircuito,
  TablaDeRamas,
  Matriz,
  leerCircuito,
  TEXTO_INICIAL,
  avisoCircuitoInvalido,
} from './comun';

/**
 * Método de nudos: matriz de conductancias y tensiones de nudo (CLAUDE.md §6).
 *
 * El brief pide dejar elegir cuál nudo es referencia. En este circuito el riel
 * de abajo es un solo nudo eléctrico, así que las opciones reales son ese riel
 * o uno de los dos nudos de arriba. Se ofrecen los tres, porque comprobar que
 * las **tensiones cambian pero las corrientes no** es el punto de la elección.
 */

type Referencia = 'riel' | 'A' | 'B';

const NOMBRES: Record<Referencia, string> = {
  riel: 'el riel de abajo',
  A: 'el nudo A',
  B: 'el nudo B',
};

export default function Nudos() {
  const [texto, setTexto] = useState(TEXTO_INICIAL);
  const [referencia, setReferencia] = useState<Referencia>('riel');
  const circuito = leerCircuito(texto);

  if (!circuito || !esValido(circuito)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Método de nudos</p>
        <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />
        {avisoCircuitoInvalido()}
      </div>
    );
  }

  const { matriz, terminos, tensiones, corrientes } = resolverPorNudos(circuito);
  const [va, vb] = [tensiones[0]!.valor, tensiones[1]!.valor];

  // Cambiar la referencia solo corre el cero: todas las tensiones se desplazan
  // por igual y las diferencias —y por lo tanto las corrientes— no se mueven.
  const corrimiento = referencia === 'riel' ? 0 : referencia === 'A' ? va : vb;
  const potenciales = [
    { nudo: 'A', valor: va - corrimiento },
    { nudo: 'B', valor: vb - corrimiento },
    { nudo: 'riel de abajo', valor: 0 - corrimiento },
    { nudo: 'borne + de V1', valor: circuito.v1 - corrimiento },
    { nudo: 'borne + de V2', valor: circuito.v2 - corrimiento },
  ];

  return (
    <div class="sim">
      <p class="sim__rotulo">Método de nudos</p>

      <CircuitoBaseSvg circuito={circuito} mostrarNudos />

      <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />

      <h4 class="sim__subtitulo">El sistema</h4>
      <p class="sim__aviso" style="margin-top:0">
        La diagonal es la suma de las conductancias que llegan a cada nudo. Fuera de la
        diagonal va la conductancia que une los dos nudos, cambiada de signo. Los términos
        de la derecha son las corrientes que inyectan las fuentes.
      </p>

      <div class="sistema">
        <Matriz filas={matriz} formato={(x) => numero(Number(x) * 1000, 4)} />
        <Matriz filas={[['vA'], ['vB']]} />
        <span class="matriz__signo">=</span>
        <Matriz filas={terminos.map((t) => [t])} formato={(x) => numero(Number(x) * 1000, 4)} />
      </div>
      <p class="sim__aviso" style="margin-top:0">
        Conductancias en mS y corrientes en mA, para no arrastrar ceros.
      </p>

      <div class="sim__resultado" style="margin-top:1.3rem">
        <em>Tensión del nudo A</em>
        <span class="sim__valor">{ingenieril(va, 'V')}</span>
        <span class="sim__secundario">vB = {ingenieril(vb, 'V')}</span>
      </div>

      <h4 class="sim__subtitulo">Elegí la referencia</h4>
      <div class="sim__acciones">
        {(['riel', 'A', 'B'] as Referencia[]).map((r) => (
          <button
            type="button"
            key={r}
            class={`boton${referencia === r ? ' boton--activo' : ''}`}
            aria-pressed={referencia === r}
            onClick={() => setReferencia(r)}
          >
            {NOMBRES[r]}
          </button>
        ))}
      </div>

      <table class="ramas">
        <caption class="sim__rotulo" style="text-align:left;margin-bottom:0.5rem">
          Potenciales tomando como cero {NOMBRES[referencia]}
        </caption>
        <thead>
          <tr>
            <th scope="col">Punto</th>
            <th scope="col" class="num">
              Potencial
            </th>
          </tr>
        </thead>
        <tbody>
          {potenciales.map((p) => (
            <tr key={p.nudo}>
              <th scope="row" style="text-transform:none;letter-spacing:0">
                {p.nudo}
              </th>
              <td class="num">{ingenieril(p.valor, 'V')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p class="sim__aviso">
        Cambiá la referencia y mirá la tabla de abajo: <strong>las corrientes no se
        mueven</strong>. Elegir la referencia es elegir desde dónde medís, no cambiar el
        circuito. Por eso conviene elegir el nudo donde se junten más ramas: no cambia el
        resultado, pero deja menos cuentas.
      </p>

      <TablaDeRamas corrientes={corrientes} />
    </div>
  );
}
