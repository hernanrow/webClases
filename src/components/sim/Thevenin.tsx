import { useState } from 'preact/hooks';
import { thevenin, resolverPorNudos, esValido, type RamaCarga } from '../../lib/circuito-base';
import { ingenieril, numero } from '../../lib/formato';
import CircuitoBaseSvg from './CircuitoBaseSvg';
import {
  ControlesCircuito,
  leerCircuito,
  TEXTO_INICIAL,
  avisoCircuitoInvalido,
} from './comun';

/**
 * Se marca la rama de carga; calcula V_Th y R_Th mostrando los dos pasos
 * (circuito abierto y fuentes pasivadas). Dibuja el equivalente al lado.
 * Slider de R_L que muestra I y P en la carga, y marca el máximo en R_L = R_Th
 * (CLAUDE.md §6).
 */

export default function Thevenin() {
  const [texto, setTexto] = useState(TEXTO_INICIAL);
  const [rama, setRama] = useState<RamaCarga>('r2');
  /** Posición del slider, en escala logarítmica: de 1 Ω a 100 kΩ. */
  const [pos, setPos] = useState(50);
  const circuito = leerCircuito(texto);

  if (!circuito || !esValido(circuito)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Equivalente de Thévenin</p>
        <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />
        {avisoCircuitoInvalido()}
      </div>
    );
  }

  const { vth, rth, corrienteCarga, potenciaCarga, potenciaMaxima } = thevenin(circuito, rama);
  const rOriginal = rama === 'r2' ? circuito.r2 : circuito.r4;
  const corrienteReal = resolverPorNudos(circuito).corrientes[rama === 'r2' ? 'i2' : 'i4'];

  // Escala logarítmica: con lineal, el máximo de potencia queda aplastado
  // contra el margen izquierdo y no se ve la curva.
  const rCarga = 10 ** (pos / 25);
  const iCarga = vth / (rth + rCarga);
  const pCarga = iCarga * iCarga * rCarga;
  const posDeR = (r: number) => Math.max(0, Math.min(100, 25 * Math.log10(r)));

  return (
    <div class="sim">
      <p class="sim__rotulo">Equivalente de Thévenin</p>

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
          <h4 class="esquema__titulo">Su equivalente</h4>
          <EquivalenteThevenin vth={vth} rth={rth} rCarga={rOriginal} nombre={rama.toUpperCase()} />
        </div>
      </div>

      <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />

      <h4 class="sim__subtitulo">Los dos pasos</h4>
      <ol class="pasos">
        <li>
          <span class="pasos__que">
            Paso 1 — se saca {rama.toUpperCase()} y se mide la tensión que queda entre esos
            bornes
          </span>
          <span class="pasos__cuenta">V_Th = {ingenieril(vth, 'V')}</span>
        </li>
        <li>
          <span class="pasos__que">
            Paso 2 — se pasivan las fuentes (las de tensión, en cortocircuito) y se calcula
            la resistencia vista desde esos bornes
          </span>
          <span class="pasos__cuenta">
            R_Th = {rama === 'r2' ? 'R1 ∥ (R3 + R4 ∥ R5)' : 'R5 ∥ (R3 + R1 ∥ R2)'} ={' '}
            {ingenieril(rth, 'Ω')}
          </span>
        </li>
        <li>
          <span class="pasos__que">Se vuelve a poner la carga sobre el equivalente</span>
          <span class="pasos__cuenta">
            I = V_Th / (R_Th + {rama.toUpperCase()}) = {numero(vth, 4)} / ({numero(rth, 4)} +{' '}
            {numero(rOriginal, 4)}) = {ingenieril(corrienteCarga, 'A')}
          </span>
        </li>
      </ol>

      <div class="sim__resultado">
        <em>Corriente por {rama.toUpperCase()}</em>
        <span class="sim__valor">{ingenieril(corrienteCarga, 'A')}</span>
        <span class="sim__secundario">P = {ingenieril(potenciaCarga, 'W')}</span>
      </div>

      <p class="sim__aviso">
        Resolviendo el circuito entero por nudos, esa misma rama da{' '}
        <strong class="coincide">{ingenieril(corrienteReal, 'A')}</strong>. Es el mismo
        número: Thévenin no es una aproximación, es el mismo circuito visto desde dos
        bornes.
      </p>

      <h4 class="sim__subtitulo">Máxima transferencia de potencia</h4>
      <p class="sim__aviso" style="margin-top:0">
        Moviendo la carga, la potencia que recibe es máxima justo cuando vale lo mismo que
        R_Th. Ni más ni menos.
      </p>

      <label class="campo" style="margin-block:0.9rem">
        <span class="campo__rotulo">Resistencia de carga</span>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={pos}
          aria-label="Resistencia de carga"
          onInput={(e) => setPos(Number((e.target as HTMLInputElement).value))}
        />
      </label>

      <CurvaDePotencia vth={vth} rth={rth} posActual={pos} posDeR={posDeR} />

      <div class="sim__resultado">
        <em>R de carga</em>
        <span class="sim__valor">{ingenieril(rCarga, 'Ω')}</span>
        <span class="sim__secundario">
          I = {ingenieril(iCarga, 'A')} · P = {ingenieril(pCarga, 'W')}
        </span>
      </div>

      <p class={Math.abs(rCarga - rth) / rth < 0.05 ? 'sim__aviso coincide' : 'sim__aviso'}>
        {Math.abs(rCarga - rth) / rth < 0.05
          ? `Estás en el máximo: con R_L = R_Th = ${ingenieril(rth, 'Ω')} la carga recibe ${ingenieril(potenciaMaxima, 'W')}.`
          : `El máximo está en R_L = R_Th = ${ingenieril(rth, 'Ω')}, donde la carga recibiría ${ingenieril(potenciaMaxima, 'W')}.`}
      </p>
    </div>
  );
}

/** El equivalente: una fuente, una resistencia en serie y la carga. */
function EquivalenteThevenin({
  vth,
  rth,
  rCarga,
  nombre,
}: {
  vth: number;
  rth: number;
  rCarga: number;
  nombre: string;
}) {
  return (
    <svg
      class="esquema__svg"
      viewBox="0 0 200 170"
      role="img"
      aria-label={`Equivalente de Thévenin: fuente de ${ingenieril(vth, 'V')} en serie con ${ingenieril(rth, 'Ω')}, alimentando la carga`}
    >
      <g class="hilo">
        <line x1="40" y1="34" x2="66" y2="34" />
        <line x1="104" y1="34" x2="150" y2="34" />
        <line x1="150" y1="34" x2="150" y2="62" />
        <line x1="150" y1="108" x2="150" y2="140" />
        <line x1="40" y1="140" x2="150" y2="140" />
        <line x1="40" y1="34" x2="40" y2="66" />
        <line x1="40" y1="102" x2="40" y2="140" />
      </g>
      <rect class="resistencia-simbolo" x="66" y="24" width="38" height="20" />
      <rect class="resistencia-simbolo resistencia-simbolo--carga" x="140" y="62" width="20" height="46" />
      <g class="fuente">
        <line x1="26" y1="66" x2="54" y2="66" class="fuente__larga" />
        <line x1="33" y1="74" x2="47" y2="74" class="fuente__corta" />
        <line x1="26" y1="82" x2="54" y2="82" class="fuente__larga" />
        <line x1="33" y1="90" x2="47" y2="90" class="fuente__corta" />
      </g>
      <text class="rotulo-r" x="62" y="18">
        R_Th {ingenieril(rth, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x="0" y="112">
        V_Th
      </text>
      <text class="rotulo-r" x="0" y="124">
        {ingenieril(vth, 'V', 3)}
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

/** Curva de potencia en la carga contra R_L, con el máximo marcado. */
function CurvaDePotencia({
  vth,
  rth,
  posActual,
  posDeR,
}: {
  vth: number;
  rth: number;
  posActual: number;
  posDeR: (r: number) => number;
}) {
  const pMax = (vth * vth) / (4 * rth);
  if (!(pMax > 0)) return null;

  const puntos: string[] = [];
  for (let p = 0; p <= 100; p += 1) {
    const r = 10 ** (p / 25);
    const pot = ((vth / (rth + r)) ** 2 * r) / pMax;
    puntos.push(`${(p / 100) * 280 + 10},${104 - pot * 86}`);
  }

  const xMax = (posDeR(rth) / 100) * 280 + 10;
  const xActual = (posActual / 100) * 280 + 10;

  return (
    <svg class="curva" viewBox="0 0 300 120" role="img" aria-label="Potencia en la carga en función de la resistencia de carga; el máximo está en R igual a R de Thévenin">
      <line class="curva__eje" x1="10" y1="104" x2="290" y2="104" />
      <line class="curva__marca" x1={xMax} y1="14" x2={xMax} y2="104" />
      <polyline class="curva__trazo" points={puntos.join(' ')} />
      <line class="curva__cursor" x1={xActual} y1="10" x2={xActual} y2="108" />
      <text class="curva__rotulo" x={xMax + 4} y="22">
        R_L = R_Th
      </text>
      <text class="curva__rotulo" x="10" y="118">
        1 Ω
      </text>
      <text class="curva__rotulo" x="252" y="118">
        100 kΩ
      </text>
    </svg>
  );
}
