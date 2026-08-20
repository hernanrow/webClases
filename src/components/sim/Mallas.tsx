import { useState } from 'preact/hooks';
import { resolverPorMallas, esValido } from '../../lib/circuito-base';
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
 * Método de mallas: arma el sistema a partir del circuito, muestra la matriz de
 * resistencias y resuelve por Cramer con los determinantes desarrollados
 * (CLAUDE.md §6).
 */
export default function Mallas() {
  const [texto, setTexto] = useState(TEXTO_INICIAL);
  const circuito = leerCircuito(texto);

  if (!circuito || !esValido(circuito)) {
    return (
      <div class="sim">
        <p class="sim__rotulo">Método de mallas</p>
        <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />
        {avisoCircuitoInvalido()}
      </div>
    );
  }

  const { matriz, terminos, mallas, determinantes, corrientes } = resolverPorMallas(circuito);
  const [d, d1, d2, d3] = determinantes.map((x) => x.valor) as [number, number, number, number];

  return (
    <div class="sim">
      <p class="sim__rotulo">Método de mallas</p>

      <CircuitoBaseSvg circuito={circuito} mostrarMallas />

      <ControlesCircuito texto={texto} onCambio={(k, v) => setTexto({ ...texto, [k]: v })} />

      <h4 class="sim__subtitulo">El sistema</h4>
      <p class="sim__aviso" style="margin-top:0">
        La diagonal de la matriz es la suma de las resistencias de cada malla. Fuera de la
        diagonal va la resistencia que comparten dos mallas, cambiada de signo. Las mallas
        1 y 3 no se tocan, por eso ese término es cero.
      </p>

      <div class="sistema">
        <Matriz filas={matriz} formato={(x) => numero(Number(x), 4)} />
        <Matriz filas={[['I₁'], ['I₂'], ['I₃']]} />
        <span class="matriz__signo">=</span>
        <Matriz filas={terminos.map((t) => [t])} formato={(x) => numero(Number(x), 4)} />
      </div>

      <h4 class="sim__subtitulo">Resolución por Cramer</h4>
      <ol class="pasos">
        <li>
          <span class="pasos__que">Determinante del sistema</span>
          <span class="pasos__cuenta">Δ = {numero(d, 6)}</span>
        </li>
        {(
          [
            ['Δ₁', d1, mallas[0]!.valor, 'I₁'],
            ['Δ₂', d2, mallas[1]!.valor, 'I₂'],
            ['Δ₃', d3, mallas[2]!.valor, 'I₃'],
          ] as const
        ).map(([nombre, det, valor, corriente]) => (
          <li key={nombre}>
            <span class="pasos__que">
              {nombre} — se reemplaza la columna de {corriente} por los términos
            </span>
            <span class="pasos__cuenta">
              {corriente} = {nombre} / Δ = {numero(det, 6)} / {numero(d, 6)} ={' '}
              {ingenieril(valor, 'A')}
            </span>
          </li>
        ))}
      </ol>

      <p class="sim__aviso">
        Las corrientes de malla no son las de rama. Por R1 circula I₁ sola; por R2 circula
        la diferencia I₁ − I₂, porque las dos mallas la comparten.
      </p>

      <TablaDeRamas corrientes={corrientes} />
    </div>
  );
}
