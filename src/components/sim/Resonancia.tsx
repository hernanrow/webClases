import { useState } from 'preact/hooks';
import { impedancia, resonanciaSerie } from '../../lib/ca';
import { modulo } from '../../lib/complejos';
import { ingenieril, coma } from '../../lib/formato';
import { Deslizador } from './animacion-ui';

/**
 * Barrido de frecuencia con la curva de |Z| y la de corriente. Marca
 * f₀ = 1/(2π√(LC)), Q y ancho de banda. Al mover L o C, la curva se redibuja
 * (CLAUDE.md §6).
 */

const TENSION = 10; // V eficaces aplicados, fijos: lo que importa es la forma

export default function Resonancia() {
  const [r, setR] = useState(10);
  const [lmH, setLmH] = useState(100);
  const [cuF, setCuF] = useState(10);

  const l = lmH * 1e-3;
  const c = cuF * 1e-6;
  const { f0, q, anchoDeBanda, fInferior, fSuperior } = resonanciaSerie(r, l, c);

  // Se barren dos décadas alrededor de f₀, en escala logarítmica.
  const fMin = f0 / 10;
  const fMax = f0 * 10;
  const PUNTOS = 160;

  const muestras = Array.from({ length: PUNTOS + 1 }, (_, i) => {
    const f = fMin * (fMax / fMin) ** (i / PUNTOS);
    const z = modulo(impedancia({ r, l, c, f, conexion: 'serie' }).z);
    return { f, z, i: TENSION / z };
  });

  const zMax = Math.max(...muestras.map((m) => m.z));
  const iMax = TENSION / r;

  const x = (i: number) => 24 + (i / PUNTOS) * 268;
  const xDeF = (f: number) => 24 + (Math.log10(f / fMin) / Math.log10(fMax / fMin)) * 268;

  const curvaZ = muestras.map((m, i) => `${x(i)},${140 - (m.z / zMax) * 112}`).join(' ');
  const curvaI = muestras.map((m, i) => `${x(i)},${140 - (m.i / iMax) * 112}`).join(' ');

  return (
    <div class="sim">
      <p class="sim__rotulo">Resonancia serie</p>

      <svg class="curva curva--ancha" viewBox="0 0 310 175" role="img" aria-label={`Curvas de impedancia y corriente contra frecuencia; la resonancia está en ${ingenieril(f0, 'Hz')}`}>
        <line class="fasor__eje" x1="24" y1="140" x2="298" y2="140" />
        <line class="fasor__eje" x1="24" y1="16" x2="24" y2="146" />

        {/* Banda de paso: entre las dos frecuencias de corte. */}
        <rect
          class="banda"
          x={xDeF(fInferior)}
          y="16"
          width={Math.max(0, xDeF(fSuperior) - xDeF(fInferior))}
          height="124"
        />
        <line class="curva__marca" x1={xDeF(f0)} y1="16" x2={xDeF(f0)} y2="146" />

        <polyline class="curva__trazo curva__trazo--tenue" points={curvaZ} />
        <polyline class="curva__trazo curva__trazo--suma" points={curvaI} />

        <text class="fasor__rotulo" x={xDeF(f0) + 3} y="26">
          f₀
        </text>
        <text class="fasor__rotulo" x="24" y="156">
          {ingenieril(fMin, 'Hz')}
        </text>
        <text class="fasor__rotulo" x="238" y="156">
          {ingenieril(fMax, 'Hz')}
        </text>
        <text class="fasor__rotulo" x="26" y="26">
          escala logarítmica
        </text>
      </svg>

      <p class="leyenda">
        <span style="color:var(--filete-fuerte)">
          <i></i> |Z| — mínima en f₀
        </span>
        <span style="color:var(--verde-senal)">
          <i></i> corriente — máxima en f₀
        </span>
        <span style="color:var(--tinta-3)">
          <i style="border-top-style:dashed"></i> banda de paso
        </span>
      </p>

      <div class="sim__campos">
        <Deslizador rotulo="Resistencia" valor={r} min={0.5} max={500} paso={0.5} unidad="Ω" logaritmico onCambio={(v) => setR(Number(v.toPrecision(3)))} />
        <Deslizador rotulo="Inductancia" valor={lmH} min={1} max={1000} paso={1} unidad="mH" logaritmico onCambio={(v) => setLmH(Number(v.toPrecision(3)))} />
        <Deslizador rotulo="Capacidad" valor={cuF} min={0.1} max={100} paso={0.1} unidad="µF" logaritmico onCambio={(v) => setCuF(Number(v.toPrecision(3)))} />
      </div>

      <div class="sim__resultado">
        <em>Frecuencia de resonancia</em>
        <span class="sim__valor">{ingenieril(f0, 'Hz')}</span>
        <span class="sim__secundario">Q = {coma(q.toPrecision(3))}</span>
      </div>

      <table class="ramas">
        <tbody>
          {(
            [
              ['f₀ = 1/(2π√(LC))', ingenieril(f0, 'Hz')],
              ['Factor de calidad Q', coma(q.toPrecision(4))],
              ['Ancho de banda', ingenieril(anchoDeBanda, 'Hz')],
              ['Corte inferior', ingenieril(fInferior, 'Hz')],
              ['Corte superior', ingenieril(fSuperior, 'Hz')],
              ['Impedancia en f₀', ingenieril(r, 'Ω')],
              ['Corriente en f₀', ingenieril(TENSION / r, 'A')],
            ] as const
          ).map(([nombre, valor]) => (
            <tr key={nombre}>
              <th scope="row" style="text-transform:none;letter-spacing:0">
                {nombre}
              </th>
              <td class="num">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p class="sim__aviso">
        Bajá la resistencia y mirá cómo se afina el pico: el <strong>Q sube</strong> y el
        ancho de banda se achica. Eso es lo que hace que un circuito sintonizado elija una
        emisora y no las de al lado. Subila y la curva se aplana hasta dejar pasar casi
        todo.
      </p>

      <p class="sim__aviso">
        Fijate que <strong>f₀ no depende de R</strong>: moviendo la resistencia el pico
        cambia de forma pero no se corre de lugar. Solo L y C deciden dónde está.
      </p>
    </div>
  );
}
