import { useEffect, useRef, useState } from 'preact/hooks';

/**
 * Reloj de animación compartido por los componentes de CA.
 *
 * Tres cosas que el brief (§6) pide y que conviene tener en un solo lugar:
 *
 * 1. **Se pausa sola con `prefers-reduced-motion`.** Hay chicos a los que el
 *    movimiento les da náuseas o les dispara migraña; si el sistema operativo
 *    dice que no quiere animaciones, acá no arranca. No es una preferencia
 *    estética: para algunos es la diferencia entre poder usar el sitio o no.
 * 2. **Botón de pausa siempre disponible**, aunque el sistema no pida nada.
 * 3. **Se detiene cuando la pestaña no se ve.** Un `requestAnimationFrame`
 *    girando en segundo plano gasta batería para nada, y estos chicos entran
 *    desde el celular.
 *
 * Devuelve el tiempo transcurrido en segundos, que es lo que los componentes
 * usan para calcular ωt.
 */

export interface Animacion {
  /** Segundos transcurridos de animación, sin contar el tiempo en pausa. */
  t: number;
  corriendo: boolean;
  alternar: () => void;
  reiniciar: () => void;
  /** Si el sistema pidió no animar. Sirve para explicarle al alumno por qué está quieto. */
  movimientoReducido: boolean;
}

export function usarAnimacion(velocidad = 1): Animacion {
  const [movimientoReducido, setMovimientoReducido] = useState(false);
  const [corriendo, setCorriendo] = useState(true);
  const [t, setT] = useState(0);

  const frame = useRef<number | null>(null);
  const ultimo = useRef<number | null>(null);

  // La preferencia del sistema puede cambiar mientras la página está abierta.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => {
      setMovimientoReducido(consulta.matches);
      if (consulta.matches) setCorriendo(false);
    };
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  // Con la pestaña oculta no se anima: gasta batería sin que nadie mire.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden) ultimo.current = null;
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, []);

  useEffect(() => {
    if (!corriendo) {
      ultimo.current = null;
      return;
    }

    const paso = (ahora: number) => {
      if (!document.hidden) {
        if (ultimo.current !== null) {
          // Se acota el salto: si la pestaña estuvo minutos en segundo plano,
          // el primer frame traería un delta enorme y el fasor pegaría un salto.
          const delta = Math.min((ahora - ultimo.current) / 1000, 0.05);
          setT((anterior) => anterior + delta * velocidad);
        }
        ultimo.current = ahora;
      }
      frame.current = requestAnimationFrame(paso);
    };

    frame.current = requestAnimationFrame(paso);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [corriendo, velocidad]);

  return {
    t,
    corriendo,
    alternar: () => setCorriendo((x) => !x),
    reiniciar: () => setT(0),
    movimientoReducido,
  };
}
