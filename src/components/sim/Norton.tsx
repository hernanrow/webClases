import { useState } from 'preact/hooks';
import { norton, thevenin, resolverPorNudos, esValido, type RamaCarga } from '../../lib/circuito-base';
import { ingenieril, numero } from '../../lib/formato';
import CircuitoBaseSvg from './CircuitoBaseSvg';
import { ControlesCircuito, leerCircuito, TEXTO_INICIAL, avisoCircuitoInvalido } from './comun';

/**
 * Norton sobre el mismo motor que Thévenin. Muestra I_N = V_Th / R_Th y la
 * conversión entre los dos equivalentes (CLAUDE.md §6).
 */
export default function Norton() {
  const [texto, setTexto] = useState(TEXTO_INICIAL);
  const [rama, setRama] = useState<RamaCarga>('r2');
  const circuito = leerCircuito(texto);

  if (!circuito || !esValido(circuito)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Equivalente de Norton</p>
        <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />
        {avisoCircuitoInvalido()}
      </div>
    );
  }

  const { inorton, rn, vth } = norton(circuito, rama);
  const { rth } = thevenin(circuito, rama);
  const rCarga = rama === 'r2' ? circuito.r2 : circuito.r4;

  // Divisor de corriente: la carga se lleva la parte proporcional a R_N.
  const corrienteCarga = (inorton * rn) / (rn + rCarga);
  const corrienteReal = resolverPorNudos(circuito).corrientes[rama === 'r2' ? 'i2' : 'i4'];

  return (
    <div class="sim">
      <p class="sim__rotulo">Equivalente de Norton</p>

      <div class="sim__acciones" style="margin-top:0" role="group" aria-label="Rama de carga">
        <span class="campo__rotulo" style="align-self:center">
          Carga en:
        </span>
        {(['r2', 'r4'] as RamaCarga[]).map((r) => (
          <button
            type="button"
            key={r}
            class={`boton${rama === r ? ' boton--activo' : ''}`}
            aria-pressed={rama === r}
            onClick={() => setRama(r)}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      <div class="dos-esquemas" style="margin-top:1.2rem">
        <div class="esquema esquema--activo">
          <h4 class="esquema__titulo">El circuito, con la carga marcada</h4>
          <CircuitoBaseSvg circuito={circuito} carga={rama} />
        </div>
        <div class="esquema esquema--activo">
          <h4 class="esquema__titulo">Su equivalente de Norton</h4>
          <EquivalenteNorton inorton={inorton} rn={rn} rCarga={rCarga} nombre={rama.toUpperCase()} />
        </div>
      </div>

      <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />

      <h4 class="sim__subtitulo">De Thévenin a Norton</h4>
      <p class="sim__aviso" style="margin-top:0">
        Son el mismo equivalente escrito de dos maneras. La resistencia es la misma; lo que
        cambia es si la fuente se expresa como tensión o como corriente.
      </p>

      <ol class="pasos">
        <li>
          <span class="pasos__que">La resistencia no cambia</span>
          <span class="pasos__cuenta">
            R_N = R_Th = {ingenieril(rn, 'Ω')}
          </span>
        </li>
        <li>
          <span class="pasos__que">
            La corriente de Norton es la de cortocircuito entre esos bornes
          </span>
          <span class="pasos__cuenta">
            I_N = V_Th / R_Th = {numero(vth, 4)} / {numero(rth, 4)} = {ingenieril(inorton, 'A')}
          </span>
        </li>
        <li>
          <span class="pasos__que">Y para volver</span>
          <span class="pasos__cuenta">
            V_Th = I_N · R_N = {ingenieril(inorton, 'A')} · {ingenieril(rn, 'Ω')} ={' '}
            {ingenieril(vth, 'V')}
          </span>
        </li>
        <li>
          <span class="pasos__que">
            Con la carga puesta, la corriente sale de un divisor de corriente
          </span>
          <span class="pasos__cuenta">
            I = I_N · R_N / (R_N + {rama.toUpperCase()}) = {ingenieril(corrienteCarga, 'A')}
          </span>
        </li>
      </ol>

      <div class="sim__resultado">
        <em>Corriente por {rama.toUpperCase()}</em>
        <span class="sim__valor">{ingenieril(corrienteCarga, 'A')}</span>
      </div>

      <p class="sim__aviso">
        Igual que con Thévenin, resolver el circuito entero por nudos da{' '}
        <strong class="coincide">{ingenieril(corrienteReal, 'A')}</strong> en esa misma
        rama.
      </p>

      <p class="sim__aviso">
        <strong>Cuándo conviene cada uno.</strong> Si vas a poner cargas en serie con el
        equivalente, Thévenin es más cómodo. Si vas a ponerlas en paralelo, Norton. Para
        una sola carga da exactamente lo mismo, así que usá el que te salga más rápido.
      </p>
    </div>
  );
}

/** Fuente de corriente en paralelo con R_N, alimentando la carga. */
function EquivalenteNorton({
  inorton,
  rn,
  rCarga,
  nombre,
}: {
  inorton: number;
  rn: number;
  rCarga: number;
  nombre: string;
}) {
  return (
    <svg
      class="esquema__svg"
      viewBox="0 0 200 170"
      role="img"
      aria-label={`Equivalente de Norton: fuente de corriente de ${ingenieril(inorton, 'A')} en paralelo con ${ingenieril(rn, 'Ω')}, alimentando la carga`}
    >
      <g class="hilo">
        <line x1="40" y1="34" x2="150" y2="34" />
        <line x1="40" y1="140" x2="150" y2="140" />
        <line x1="40" y1="34" x2="40" y2="62" />
        <line x1="40" y1="102" x2="40" y2="140" />
        <line x1="95" y1="34" x2="95" y2="62" />
        <line x1="95" y1="108" x2="95" y2="140" />
        <line x1="150" y1="34" x2="150" y2="62" />
        <line x1="150" y1="108" x2="150" y2="140" />
      </g>

      {/* Fuente de corriente: círculo con flecha, simbología IEC. */}
      <circle class="fuente-corriente" cx="40" cy="82" r="20" />
      <line class="fuente-corriente__flecha" x1="40" y1="94" x2="40" y2="70" />
      <path class="fuente-corriente__punta" d="M 40 66 l -4 8 l 8 0 z" />

      <rect class="resistencia-simbolo" x="85" y="62" width="20" height="46" />
      <rect class="resistencia-simbolo resistencia-simbolo--carga" x="140" y="62" width="20" height="46" />

      <text class="rotulo-r" x="0" y="118">
        I_N
      </text>
      <text class="rotulo-r" x="0" y="130">
        {ingenieril(inorton, 'A', 3)}
      </text>
      <text class="rotulo-r" x="110" y="82">
        R_N
      </text>
      <text class="rotulo-r" x="110" y="94">
        {ingenieril(rn, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x="164" y="82">
        {nombre}
      </text>
      <text class="rotulo-r" x="164" y="94">
        {ingenieril(rCarga, 'Ω', 3)}
      </text>
    </svg>
  );
}
