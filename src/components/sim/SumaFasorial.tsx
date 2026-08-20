import { useState } from 'preact/hooks';
import { sumarSenoides, type Senoide } from '../../lib/ca';
import { ingenieril, coma } from '../../lib/formato';
import { usarAnimacion } from './usarAnimacion';
import { ControlesAnimacion, Deslizador } from './animacion-ui';

/**
 * Dos senoides con fase distinta: la suma en el tiempo y la suma vectorial de
 * fasores, en paralelo (CLAUDE.md §6).
 *
 * Lo que tiene que quedar claro es que **las amplitudes no se suman**: dos
 * senoides de 3 V y 4 V desfasadas 90° dan 5 V, no 7 V. El dibujo de la
 * izquierda muestra por qué: es la regla del paralelogramo.
 */

const SEGUNDOS_POR_VUELTA = 4;
const FRECUENCIA = 50;

export default function SumaFasorial() {
  const [amplitudA, setAmplitudA] = useState(3);
  const [faseA, setFaseA] = useState(0);
  const [amplitudB, setAmplitudB] = useState(4);
  const [faseB, setFaseB] = useState(90);

  const anim = usarAnimacion(1 / SEGUNDOS_POR_VUELTA);

  const a: Senoide = { amplitud: amplitudA, frecuencia: FRECUENCIA, fase: faseA };
  const b: Senoide = { amplitud: amplitudB, frecuencia: FRECUENCIA, fase: faseB };
  const suma = sumarSenoides(a, b);

  const giro = anim.t * 2 * Math.PI;
  const maximo = Math.max(amplitudA, amplitudB, suma.amplitud, 1);

  const sumaAritmetica = amplitudA + amplitudB;
  const diferencia = sumaAritmetica - suma.amplitud;

  return (
    <div class="sim">
      <p class="sim__rotulo">Suma de senoidales</p>

      <div class="fasor-y-curva">
        <FasoresSumados a={a} b={b} suma={suma} giro={giro} maximo={maximo} />
        <CurvasSumadas a={a} b={b} suma={suma} giro={giro} maximo={maximo} />
      </div>

      <p class="leyenda">
        <span style="color:var(--tinta)">
          <i></i> v₁
        </span>
        <span style="color:var(--u3)">
          <i></i> v₂
        </span>
        <span style="color:var(--verde-senal)">
          <i></i> v₁ + v₂
        </span>
      </p>

      <ControlesAnimacion anim={anim} />

      <div class="sim__campos">
        <Deslizador rotulo="Amplitud v₁" valor={amplitudA} min={0} max={20} paso={0.5} unidad="V" onCambio={setAmplitudA} />
        <Deslizador rotulo="Fase v₁" valor={faseA} min={-180} max={180} paso={5} unidad="°" onCambio={setFaseA} />
        <Deslizador rotulo="Amplitud v₂" valor={amplitudB} min={0} max={20} paso={0.5} unidad="V" onCambio={setAmplitudB} />
        <Deslizador rotulo="Fase v₂" valor={faseB} min={-180} max={180} paso={5} unidad="°" onCambio={setFaseB} />
      </div>

      <div class="sim__resultado">
        <em>Amplitud de la suma</em>
        <span class="sim__valor">{ingenieril(suma.amplitud, 'V')}</span>
        <span class="sim__secundario">∠ {coma(suma.fase.toFixed(1)).replace('-', '−')}°</span>
      </div>

      <p class={diferencia > 0.05 ? 'sim__aviso' : 'sim__aviso coincide'}>
        {diferencia > 0.05 ? (
          <>
            Sumando las amplitudes a lo bruto daría{' '}
            <strong>{ingenieril(sumaAritmetica, 'V')}</strong>, pero la suma real es{' '}
            <strong>{ingenieril(suma.amplitud, 'V')}</strong>. Faltan{' '}
            {ingenieril(diferencia, 'V')}, y no es un error de redondeo: es que las dos
            senoides no llegan al máximo en el mismo instante.
          </>
        ) : (
          <>
            Con las dos en fase —y solo en ese caso— las amplitudes sí se suman a lo
            bruto. Movele la fase a alguna y mirá qué pasa.
          </>
        )}
      </p>

      <table class="ramas">
        <thead>
          <tr>
            <th scope="col">Senoide</th>
            <th scope="col" class="num">Amplitud</th>
            <th scope="col" class="num">Fase</th>
          </tr>
        </thead>
        <tbody>
          {(
            [
              ['v₁', a.amplitud, a.fase],
              ['v₂', b.amplitud, b.fase],
              ['v₁ + v₂', suma.amplitud, suma.fase],
            ] as const
          ).map(([nombre, amp, f], i) => (
            <tr key={nombre}>
              <th scope="row" style="font-family:var(--mono);text-transform:none;letter-spacing:0">
                {nombre}
              </th>
              <td class={i === 2 ? 'num coincide' : 'num'}>{ingenieril(amp, 'V')}</td>
              <td class={i === 2 ? 'num coincide' : 'num'}>
                {coma(f.toFixed(1)).replace('-', '−')}°
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Los tres fasores girando juntos, con el paralelogramo de la suma. */
function FasoresSumados({
  a,
  b,
  suma,
  giro,
  maximo,
}: {
  a: Senoide;
  b: Senoide;
  suma: Senoide;
  giro: number;
  maximo: number;
}) {
  const cx = 78;
  const cy = 80;
  const escala = 62 / maximo;

  const punta = (s: Senoide) => {
    const ang = giro + (s.fase * Math.PI) / 180;
    return { x: cx + s.amplitud * escala * Math.cos(ang), y: cy - s.amplitud * escala * Math.sin(ang) };
  };
  const pa = punta(a);
  const pb = punta(b);
  const ps = punta(suma);

  return (
    <svg
      class="fasor-svg"
      viewBox="0 0 156 160"
      role="img"
      aria-label="Los dos fasores y su suma vectorial, girando juntos"
    >
      <circle class="fasor__circulo" cx={cx} cy={cy} r="62" />
      <line class="fasor__eje" x1={cx - 70} y1={cy} x2={cx + 70} y2={cy} />
      <line class="fasor__eje" x1={cx} y1={cy - 70} x2={cx} y2={cy + 70} />

      {/* El paralelogramo: los dos lados trasladados que cierran en la suma. */}
      <line class="fasor__proyeccion" x1={pa.x} y1={pa.y} x2={ps.x} y2={ps.y} />
      <line class="fasor__proyeccion" x1={pb.x} y1={pb.y} x2={ps.x} y2={ps.y} />

      <line class="fasor__vector" x1={cx} y1={cy} x2={pa.x} y2={pa.y} />
      <line class="fasor__vector fasor__vector--b" x1={cx} y1={cy} x2={pb.x} y2={pb.y} />
      <line class="fasor__vector fasor__vector--suma" x1={cx} y1={cy} x2={ps.x} y2={ps.y} />
      <circle class="fasor__punta" cx={ps.x} cy={ps.y} r="4" />
    </svg>
  );
}

/** Las tres curvas en el tiempo, con el cursor recorriéndolas. */
function CurvasSumadas({
  a,
  b,
  suma,
  giro,
  maximo,
}: {
  a: Senoide;
  b: Senoide;
  suma: Senoide;
  giro: number;
  maximo: number;
}) {
  const ancho = 240;
  const medio = 80;
  const escala = 62 / maximo;

  const trazo = (s: Senoide) => {
    const puntos: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const ang = (i / 120) * 2 * Math.PI + (s.fase * Math.PI) / 180;
      puntos.push(`${18 + (i / 120) * (ancho - 26)},${medio - s.amplitud * Math.sin(ang) * escala}`);
    }
    return puntos.join(' ');
  };

  const avance = ((giro % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
  const xCursor = 18 + avance * (ancho - 26);
  const ySuma = medio - suma.amplitud * Math.sin(giro + (suma.fase * Math.PI) / 180) * escala;

  return (
    <svg
      class="curva-svg"
      viewBox={`0 0 ${ancho} 160`}
      role="img"
      aria-label="Las dos senoides y su suma en función del tiempo"
    >
      <line class="fasor__eje" x1="10" y1={medio} x2={ancho - 4} y2={medio} />
      <line class="fasor__eje" x1="18" y1="10" x2="18" y2="150" />

      <polyline class="curva__trazo curva__trazo--tenue" points={trazo(a)} />
      <polyline class="curva__trazo curva__trazo--b" points={trazo(b)} />
      <polyline class="curva__trazo curva__trazo--suma" points={trazo(suma)} />

      <line class="fasor__proyeccion" x1="10" y1={ySuma} x2={xCursor} y2={ySuma} />
      <circle class="fasor__punta" cx={xCursor} cy={ySuma} r="4" />
    </svg>
  );
}
