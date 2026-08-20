import type { CircuitoBase } from '../../lib/circuito-base';
import { ingenieril } from '../../lib/formato';

/**
 * El esquema del circuito base, compartido por los cinco métodos de la Unidad 2.
 * Que los cinco muestren **el mismo dibujo** es parte del objetivo didáctico: el
 * alumno tiene que ver que está resolviendo siempre lo mismo.
 *
 * Simbología IRAM/IEC: trazo de 2 px, sin relleno, sin esquinas redondeadas.
 *
 *      ┌──R1──A──R3──B──R5──┐
 *      │      │      │      │
 *     (V1)   R2     R4     (V2)
 *      │      │      │      │
 *      └──────┴──────┴──────┘
 */

interface Props {
  circuito: CircuitoBase;
  /** Rama marcada como carga, si el método lo usa (Thévenin y Norton). */
  carga?: 'r2' | 'r4';
  /** Fuentes apagadas, para superposición. Una fuente de tensión apagada es un cortocircuito. */
  apagadas?: ('v1' | 'v2')[];
  /** Corrientes de malla a dibujar, para el método de mallas. */
  mostrarMallas?: boolean;
  /** Rótulos de los nudos, para el método de nudos. */
  mostrarNudos?: boolean;
}

const X_IZQ = 34;
const X_A = 150;
const X_B = 250;
const X_DER = 366;
const Y_SUP = 40;
const Y_INF = 168;

export default function CircuitoBaseSvg({
  circuito: c,
  carga,
  apagadas = [],
  mostrarMallas = false,
  mostrarNudos = false,
}: Props) {
  const v1Apagada = apagadas.includes('v1');
  const v2Apagada = apagadas.includes('v2');

  return (
    <svg
      class="esquema__svg esquema__svg--base"
      viewBox="0 0 400 210"
      role="img"
      aria-label="Circuito base: fuentes V1 y V2 en los extremos, R1, R3 y R5 en la rama superior, R2 y R4 en las ramas verticales del medio"
    >
      <g class="hilo">
        {/* Rama superior */}
        <line x1={X_IZQ} y1={Y_SUP} x2="96" y2={Y_SUP} />
        <line x1="134" y1={Y_SUP} x2={X_B - 34} y2={Y_SUP} />
        <line x1={X_A} y1={Y_SUP} x2="184" y2={Y_SUP} />
        <line x1="216" y1={Y_SUP} x2={X_B} y2={Y_SUP} />
        <line x1={X_B} y1={Y_SUP} x2="284" y2={Y_SUP} />
        <line x1="322" y1={Y_SUP} x2={X_DER} y2={Y_SUP} />
        {/* Riel inferior */}
        <line x1={X_IZQ} y1={Y_INF} x2={X_DER} y2={Y_INF} />
        {/* Ramas verticales del medio */}
        <line x1={X_A} y1={Y_SUP} x2={X_A} y2="82" />
        <line x1={X_A} y1="126" x2={X_A} y2={Y_INF} />
        <line x1={X_B} y1={Y_SUP} x2={X_B} y2="82" />
        <line x1={X_B} y1="126" x2={X_B} y2={Y_INF} />
        {/* Ramas de las fuentes */}
        <line x1={X_IZQ} y1={Y_SUP} x2={X_IZQ} y2="86" />
        <line x1={X_IZQ} y1="122" x2={X_IZQ} y2={Y_INF} />
        <line x1={X_DER} y1={Y_SUP} x2={X_DER} y2="86" />
        <line x1={X_DER} y1="122" x2={X_DER} y2={Y_INF} />
      </g>

      {/* Resistencias de la rama superior */}
      <rect class="resistencia-simbolo" x="96" y={Y_SUP - 10} width="38" height="20" />
      <rect class="resistencia-simbolo" x="184" y={Y_SUP - 10} width="32" height="20" />
      <rect class="resistencia-simbolo" x="284" y={Y_SUP - 10} width="38" height="20" />

      {/* Ramas verticales, resaltadas si son la carga marcada */}
      <rect
        class={`resistencia-simbolo${carga === 'r2' ? ' resistencia-simbolo--carga' : ''}`}
        x={X_A - 10}
        y="82"
        width="20"
        height="44"
      />
      <rect
        class={`resistencia-simbolo${carga === 'r4' ? ' resistencia-simbolo--carga' : ''}`}
        x={X_B - 10}
        y="82"
        width="20"
        height="44"
      />

      {/* Las fuentes. Apagada = cortocircuito, así que se dibuja un cable. */}
      {v1Apagada ? (
        <line class="hilo-corto" x1={X_IZQ} y1="86" x2={X_IZQ} y2="122" />
      ) : (
        <Fuente x={X_IZQ} />
      )}
      {v2Apagada ? (
        <line class="hilo-corto" x1={X_DER} y1="86" x2={X_DER} y2="122" />
      ) : (
        <Fuente x={X_DER} />
      )}

      {/* Nudos */}
      <circle class="nudo" cx={X_A} cy={Y_SUP} r="3.5" />
      <circle class="nudo" cx={X_B} cy={Y_SUP} r="3.5" />
      <circle class="nudo" cx={X_A} cy={Y_INF} r="3.5" />
      <circle class="nudo" cx={X_B} cy={Y_INF} r="3.5" />

      {/* Rótulos con valores */}
      <text class="rotulo-r" x="98" y={Y_SUP - 16}>
        R1 {ingenieril(c.r1, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x="180" y={Y_SUP - 16}>
        R3 {ingenieril(c.r3, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x="284" y={Y_SUP - 16}>
        R5 {ingenieril(c.r5, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x={X_A + 15} y="100">
        R2
      </text>
      <text class="rotulo-r" x={X_A + 15} y="114">
        {ingenieril(c.r2, 'Ω', 3)}
      </text>
      <text class="rotulo-r" x={X_B + 15} y="100">
        R4
      </text>
      <text class="rotulo-r" x={X_B + 15} y="114">
        {ingenieril(c.r4, 'Ω', 3)}
      </text>

      {!v1Apagada && (
        <>
          <text class="rotulo-r" x="4" y="100">
            V1
          </text>
          <text class="rotulo-r" x="0" y="114">
            {ingenieril(c.v1, 'V', 3)}
          </text>
        </>
      )}
      {!v2Apagada && (
        <>
          <text class="rotulo-r" x={X_DER + 8} y="100">
            V2
          </text>
          <text class="rotulo-r" x={X_DER + 4} y="114">
            {ingenieril(c.v2, 'V', 3)}
          </text>
        </>
      )}
      {(v1Apagada || v2Apagada) && (
        <text class="rotulo-apagada" x={v1Apagada ? 2 : X_DER + 2} y="145">
          en corto
        </text>
      )}

      {mostrarNudos && (
        <>
          <text class="borne" x={X_A - 16} y={Y_SUP - 6}>
            A
          </text>
          <text class="borne" x={X_B + 6} y={Y_SUP - 6}>
            B
          </text>
          <g class="referencia">
            <line x1="192" y1={Y_INF} x2="192" y2="184" />
            <line x1="180" y1="184" x2="204" y2="184" />
            <line x1="185" y1="190" x2="199" y2="190" />
            <line x1="190" y1="196" x2="194" y2="196" />
          </g>
          <text class="rotulo-r" x="208" y="190">
            referencia
          </text>
        </>
      )}

      {mostrarMallas && (
        <g class="malla">
          <CorrienteDeMalla x={(X_IZQ + X_A) / 2} etiqueta="I₁" />
          <CorrienteDeMalla x={(X_A + X_B) / 2} etiqueta="I₂" />
          <CorrienteDeMalla x={(X_B + X_DER) / 2} etiqueta="I₃" />
        </g>
      )}
    </svg>
  );
}

/** Fuente de tensión continua: dos rayas largas y dos cortas, alternadas. */
function Fuente({ x }: { x: number }) {
  return (
    <g class="fuente">
      <line x1={x - 14} y1="86" x2={x + 14} y2="86" class="fuente__larga" />
      <line x1={x - 7} y1="94" x2={x + 7} y2="94" class="fuente__corta" />
      <line x1={x - 14} y1="102" x2={x + 14} y2="102" class="fuente__larga" />
      <line x1={x - 7} y1="110" x2={x + 7} y2="110" class="fuente__corta" />
    </g>
  );
}

/** La flecha circular que marca el sentido horario de una corriente de malla. */
function CorrienteDeMalla({ x, etiqueta }: { x: number; etiqueta: string }) {
  const y = 104;
  return (
    <>
      <path d={`M ${x - 13} ${y - 6} A 15 15 0 1 1 ${x - 9} ${y + 11}`} class="malla__arco" />
      <path d={`M ${x - 13} ${y + 14} l 5 -5 l 1 6 z`} class="malla__punta" />
      <text class="malla__rotulo" x={x - 5} y={y + 4}>
        {etiqueta}
      </text>
    </>
  );
}
