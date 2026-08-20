import type { Animacion } from './usarAnimacion';
import { coma } from '../../lib/formato';

/** Controles y deslizadores compartidos por los componentes de corriente alterna. */

export function ControlesAnimacion({ anim }: { anim: Animacion }) {
  return (
    <>
      <div class="sim__acciones">
        <button
          type="button"
          class="boton"
          aria-pressed={anim.corriendo}
          onClick={anim.alternar}
        >
          {anim.corriendo ? 'Pausar' : 'Reanudar'}
        </button>
        <button type="button" class="boton" onClick={anim.reiniciar}>
          Volver al inicio
        </button>
      </div>

      {anim.movimientoReducido && !anim.corriendo && (
        <p class="sim__aviso">
          Tu sistema está configurado para reducir las animaciones, así que esto arranca
          quieto. Podés ponerlo en marcha con el botón de arriba cuando quieras.
        </p>
      )}
    </>
  );
}

interface DeslizadorProps {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  unidad: string;
  /** Escala logarítmica, para rangos que abarcan varias décadas. */
  logaritmico?: boolean;
  onCambio: (valor: number) => void;
}

/**
 * Deslizador con su valor a la vista. El blanco de toque es de 28 px porque se
 * usa con el pulgar en una pantalla de 360 px.
 */
export function Deslizador({
  rotulo,
  valor,
  min,
  max,
  paso,
  unidad,
  logaritmico = false,
  onCambio,
}: DeslizadorProps) {
  // En logarítmico el deslizador se mueve entre 0 y 100 y se traduce al valor.
  const aPosicion = (v: number) =>
    logaritmico ? ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 100 : v;
  const aValor = (p: number) =>
    logaritmico ? 10 ** (Math.log10(min) + (p / 100) * (Math.log10(max) - Math.log10(min))) : p;

  const mostrado = Number.isInteger(valor) ? valor.toFixed(0) : valor.toPrecision(3);

  return (
    <label class="campo campo--deslizador">
      <span class="campo__rotulo">
        {rotulo}
        <span class="campo__valor">
          {coma(mostrado)} {unidad}
        </span>
      </span>
      <input
        type="range"
        min={logaritmico ? 0 : min}
        max={logaritmico ? 100 : max}
        step={logaritmico ? 0.5 : paso}
        value={aPosicion(valor)}
        aria-label={`${rotulo} en ${unidad}`}
        aria-valuetext={`${coma(mostrado)} ${unidad}`}
        onInput={(e) => onCambio(aValor(Number((e.target as HTMLInputElement).value)))}
      />
    </label>
  );
}
