import { useState } from 'preact/hooks';
import {
  pulsacion,
  periodo,
  eficaz,
  picoAPico,
  valorInstantaneo,
  type Senoide,
} from '../../lib/ca';
import { ingenieril, coma } from '../../lib/formato';
import { usarAnimacion } from './usarAnimacion';
import { ControlesAnimacion, Deslizador } from './animacion-ui';

/**
 * A la izquierda el fasor girando, a la derecha v(t) trazándose **en sincronía**
 * con la rotación (CLAUDE.md §6).
 *
 * La sincronía es todo el punto del componente: el alumno tiene que ver que la
 * altura del extremo del fasor **es** el valor instantáneo. Por eso hay una
 * línea horizontal que une la punta del fasor con el punto que se está
 * dibujando en la curva: no son dos animaciones que casualmente van juntas, es
 * la misma cosa mirada de dos maneras.
 */

// Un giro del fasor cada 4 segundos: lento como para seguirlo con la vista.
const SEGUNDOS_POR_VUELTA = 4;

export default function SenoidalFasor() {
  const [amplitud, setAmplitud] = useState(10);
  const [frecuencia, setFrecuencia] = useState(50);
  const [fase, setFase] = useState(0);

  const anim = usarAnimacion(1 / SEGUNDOS_POR_VUELTA);
  const senoide: Senoide = { amplitud, frecuencia, fase };

  // El ángulo que muestra el dibujo. No es ωt real —a 50 Hz serían 50 vueltas
  // por segundo y no se vería nada—, es el mismo recorrido a velocidad humana.
  const vueltas = anim.t;
  const anguloMostrado = vueltas * 2 * Math.PI + (fase * Math.PI) / 180;

  // El instante real equivalente, para que el panel de datos diga la verdad.
  const tReal = (vueltas % 1) * periodo(frecuencia);
  const vAhora = amplitud * Math.sin(anguloMostrado);

  return (
    <div class="sim">
      <p class="sim__rotulo">Senoide y fasor</p>

      <div class="fasor-y-curva">
        <FasorGirando angulo={anguloMostrado} amplitud={amplitud} />
        <CurvaEnElTiempo
          senoide={senoide}
          anguloActual={anguloMostrado}
          faseRad={(fase * Math.PI) / 180}
        />
      </div>

      <ControlesAnimacion anim={anim} />

      <div class="sim__campos">
        <Deslizador
          rotulo="Amplitud"
          valor={amplitud}
          min={1}
          max={100}
          paso={1}
          unidad="V"
          onCambio={setAmplitud}
        />
        <Deslizador
          rotulo="Frecuencia"
          valor={frecuencia}
          min={1}
          max={1000}
          paso={1}
          unidad="Hz"
          onCambio={setFrecuencia}
        />
        <Deslizador
          rotulo="Fase inicial"
          valor={fase}
          min={-180}
          max={180}
          paso={5}
          unidad="°"
          onCambio={setFase}
        />
      </div>

      <div class="sim__resultado">
        <em>v(t) ahora</em>
        <span class="sim__valor">{ingenieril(vAhora, 'V')}</span>
        <span class="sim__secundario">
          t = {ingenieril(tReal, 's')} · ωt + φ = {coma(((anguloMostrado * 180) / Math.PI % 360).toFixed(0))}°
        </span>
      </div>

      <table class="ramas">
        <caption class="sim__rotulo" style="text-align:left;margin-bottom:0.5rem">
          Los datos de la senoide
        </caption>
        <tbody>
          {(
            [
              ['Valor de pico', 'Vp', ingenieril(amplitud, 'V')],
              ['Pico a pico', 'Vpp', ingenieril(picoAPico(amplitud), 'V')],
              ['Valor eficaz', 'Vef', ingenieril(eficaz(amplitud), 'V')],
              ['Período', 'T', ingenieril(periodo(frecuencia), 's')],
              ['Pulsación', 'ω', `${coma(pulsacion(frecuencia).toPrecision(4))} rad/s`],
              ['Fase inicial', 'φ', `${coma(fase.toFixed(0))}°`],
            ] as const
          ).map(([nombre, simbolo, valor]) => (
            <tr key={simbolo}>
              <th scope="row" style="text-transform:none;letter-spacing:0">
                {nombre}
              </th>
              <td style="font-family:var(--mono)">{simbolo}</td>
              <td class="num">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p class="sim__aviso">
        El fasor da una vuelta cada {SEGUNDOS_POR_VUELTA} segundos para que se pueda
        seguir con la vista. A {frecuencia} Hz daría {coma(frecuencia.toFixed(0))} vueltas
        por segundo y no verías nada. El recorrido es el mismo; solo cambia la velocidad
        a la que te lo mostramos.
      </p>
    </div>
  );
}

const R = 62; // radio del círculo del fasor, en unidades del viewBox

/** El fasor girando, con su proyección vertical marcada. */
function FasorGirando({ angulo, amplitud }: { angulo: number; amplitud: number }) {
  const cx = 78;
  const cy = 80;
  const x = cx + R * Math.cos(angulo);
  const y = cy - R * Math.sin(angulo);

  return (
    <svg
      class="fasor-svg"
      viewBox="0 0 156 160"
      role="img"
      aria-label={`Fasor de ${ingenieril(amplitud, 'V')} girando; su proyección sobre el eje vertical es el valor instantáneo`}
    >
      <circle class="fasor__circulo" cx={cx} cy={cy} r={R} />
      <line class="fasor__eje" x1={cx - R - 8} y1={cy} x2={cx + R + 8} y2={cy} />
      <line class="fasor__eje" x1={cx} y1={cy - R - 8} x2={cx} y2={cy + R + 8} />

      {/* La proyección sobre el eje vertical: eso es v(t). */}
      <line class="fasor__proyeccion" x1={x} y1={y} x2={cx} y2={y} />
      <line class="fasor__proyeccion-marca" x1={cx - 5} y1={y} x2={cx + 5} y2={y} />

      <line class="fasor__vector" x1={cx} y1={cy} x2={x} y2={y} />
      <circle class="fasor__punta" cx={x} cy={y} r="4" />

      <text class="fasor__rotulo" x={cx + R + 2} y={cy - 6}>
        0°
      </text>
      <text class="fasor__rotulo" x={cx + 6} y={cy - R - 2}>
        90°
      </text>
    </svg>
  );
}

/**
 * v(t) trazándose. Se dibuja un período completo y el cursor recorre la curva
 * al mismo tiempo que gira el fasor.
 */
function CurvaEnElTiempo({
  senoide,
  anguloActual,
  faseRad,
}: {
  senoide: Senoide;
  anguloActual: number;
  faseRad: number;
}) {
  const ancho = 240;
  const alto = 160;
  const medio = 80;
  const escala = 62 / Math.max(senoide.amplitud, 1);

  // Se traza el ángulo, no el tiempo: así el eje horizontal es directamente el
  // recorrido del fasor y la correspondencia es visible.
  const puntos: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const ang = faseRad + (i / 120) * 2 * Math.PI;
    const v = senoide.amplitud * Math.sin(ang);
    puntos.push(`${18 + (i / 120) * (ancho - 26)},${medio - v * escala}`);
  }

  // Dónde está el cursor dentro del período que se muestra.
  const avance = ((anguloActual - faseRad) % (2 * Math.PI)) / (2 * Math.PI);
  const avanceNormalizado = avance < 0 ? avance + 1 : avance;
  const xCursor = 18 + avanceNormalizado * (ancho - 26);
  const yCursor = medio - senoide.amplitud * Math.sin(anguloActual) * escala;

  return (
    <svg
      class="curva-svg"
      viewBox={`0 0 ${ancho} ${alto}`}
      role="img"
      aria-label="Tensión en función del tiempo, trazándose en sincronía con el giro del fasor"
    >
      <line class="fasor__eje" x1="10" y1={medio} x2={ancho - 4} y2={medio} />
      <line class="fasor__eje" x1="18" y1="10" x2="18" y2={alto - 10} />

      {/* La línea que une la punta del fasor con el punto de la curva: es lo que
          hace evidente que son la misma cosa. */}
      <line class="fasor__proyeccion" x1="10" y1={yCursor} x2={xCursor} y2={yCursor} />

      <polyline class="curva__trazo" points={puntos.join(' ')} />
      <circle class="fasor__punta" cx={xCursor} cy={yCursor} r="4" />

      <text class="fasor__rotulo" x={ancho - 40} y={medio - 6}>
        ωt
      </text>
    </svg>
  );
}
