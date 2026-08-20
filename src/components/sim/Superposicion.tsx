import { useState } from 'preact/hooks';
import {
  superposicion,
  resolverPorNudos,
  esValido,
  type CorrientesDeRama,
} from '../../lib/circuito-base';
import { ingenieril } from '../../lib/formato';
import CircuitoBaseSvg from './CircuitoBaseSvg';
import {
  ControlesCircuito,
  TablaDeRamas,
  leerCircuito,
  TEXTO_INICIAL,
  avisoCircuitoInvalido,
} from './comun';

/**
 * Un toggle por fuente. Al apagar una, el esquema **se redibuja** con la fuente
 * de tensión en cortocircuito. Muestra el aporte parcial de cada una y la suma
 * final (CLAUDE.md §6).
 */

const RAMAS = ['i1', 'i2', 'i3', 'i4', 'i5'] as const;

export default function Superposicion() {
  const [texto, setTexto] = useState(TEXTO_INICIAL);
  const [encendidas, setEncendidas] = useState({ v1: true, v2: true });
  const circuito = leerCircuito(texto);

  if (!circuito || !esValido(circuito)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Superposición</p>
        <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />
        {avisoCircuitoInvalido()}
      </div>
    );
  }

  const { aportes, total } = superposicion(circuito);
  const soloV1 = aportes[0]!.corrientes;
  const soloV2 = aportes[1]!.corrientes;

  // Lo que está mostrando el esquema ahora mismo, según los toggles.
  const apagadas = [
    ...(encendidas.v1 ? [] : (['v1'] as const)),
    ...(encendidas.v2 ? [] : (['v2'] as const)),
  ];
  const circuitoMostrado = {
    ...circuito,
    v1: encendidas.v1 ? circuito.v1 : 0,
    v2: encendidas.v2 ? circuito.v2 : 0,
  };
  const corrientesMostradas = resolverPorNudos(circuitoMostrado).corrientes;

  const cuantas = Number(encendidas.v1) + Number(encendidas.v2);
  const rotulo =
    cuantas === 2
      ? 'Las dos fuentes'
      : cuantas === 0
        ? 'Ninguna fuente'
        : encendidas.v1
          ? 'Solo V1'
          : 'Solo V2';

  return (
    <div class="sim">
      <p class="sim__rotulo">Superposición</p>

      <CircuitoBaseSvg circuito={circuitoMostrado} apagadas={[...apagadas]} />

      <div class="sim__acciones" style="margin-top:0" role="group" aria-label="Fuentes encendidas">
        {(['v1', 'v2'] as const).map((f) => (
          <button
            type="button"
            key={f}
            class={`boton${encendidas[f] ? ' boton--activo' : ''}`}
            aria-pressed={encendidas[f]}
            onClick={() => setEncendidas({ ...encendidas, [f]: !encendidas[f] })}
          >
            {f.toUpperCase()} {encendidas[f] ? 'encendida' : 'en corto'}
          </button>
        ))}
      </div>

      <p class="sim__aviso">
        Apagar una fuente de tensión es <strong>ponerla en cortocircuito</strong>, no
        sacarla del circuito. El camino sigue existiendo: si la sacaras, esa rama quedaría
        abierta y el circuito sería otro. Mirá el esquema de arriba, que se redibuja.
      </p>

      <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />

      <TablaDeRamas corrientes={corrientesMostradas} titulo={`${rotulo} — corrientes de rama`} />

      <h4 class="sim__subtitulo">Los aportes y la suma</h4>
      <p class="sim__aviso" style="margin-top:0">
        Cada fuente aporta lo suyo con la otra pasivada. La suma de los aportes es la
        solución del circuito completo. Fijate que hay aportes que se restan, porque van
        en sentidos contrarios.
      </p>

      <table class="ramas">
        <thead>
          <tr>
            <th scope="col">Rama</th>
            <th scope="col" class="num">
              Solo V1
            </th>
            <th scope="col" class="num">
              Solo V2
            </th>
            <th scope="col" class="num">
              Suma
            </th>
          </tr>
        </thead>
        <tbody>
          {RAMAS.map((k, i) => (
            <tr key={k}>
              <th scope="row" style="font-family:var(--mono);text-transform:none;letter-spacing:0">
                I{'₁₂₃₄₅'[i]}
              </th>
              <td class="num">{ingenieril(soloV1[k], 'A')}</td>
              <td class="num">{ingenieril(soloV2[k], 'A')}</td>
              <td class="num coincide">{ingenieril(total[k], 'A')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Comprobacion total={total} directo={resolverPorNudos(circuito).corrientes} />

      <p class="sim__aviso">
        <strong>Ojo con las potencias.</strong> Las corrientes se suman, pero las potencias
        no. La potencia va con el cuadrado de la corriente, y el cuadrado de una suma no es
        la suma de los cuadrados. Para calcular una potencia, primero sumá las corrientes y
        recién después elevá al cuadrado.
      </p>
    </div>
  );
}

/** El control que hace evidente que la suma cierra. */
function Comprobacion({ total, directo }: { total: CorrientesDeRama; directo: CorrientesDeRama }) {
  const maxError = Math.max(...RAMAS.map((k) => Math.abs(total[k] - directo[k])));
  return (
    <p class="sim__aviso">
      Resolviendo el circuito completo de una sola vez, las cinco corrientes dan lo mismo
      que esa columna de sumas
      {maxError < 1e-9 ? (
        <strong class="coincide"> al último decimal</strong>
      ) : (
        <> con una diferencia de {ingenieril(maxError, 'A')}</>
      )}
      . Eso no es casualidad: es que el circuito es lineal, que es la condición para poder
      aplicar superposición.
    </p>
  );
}
