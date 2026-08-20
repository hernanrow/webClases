/**
 * Aritmética de números complejos.
 *
 * Funciones puras, sin nada de Preact. Es la base de toda la parte de corriente
 * alterna: una impedancia es un número complejo, y sumar impedancias en serie es
 * sumar complejos.
 *
 * Convención de la materia: la parte real es la resistiva y la imaginaria la
 * reactiva. Un ángulo positivo significa que la tensión adelanta a la corriente,
 * o sea circuito inductivo.
 *
 * Los ángulos se manejan en **radianes** adentro y se muestran en **grados**,
 * que es como los escriben en la carpeta. La conversión va explícita en el
 * borde, nunca en el medio de una cuenta.
 */

import { coma, ingenieril } from './formato';

export interface Complejo {
  /** Parte real. En una impedancia, la resistencia. */
  re: number;
  /** Parte imaginaria. En una impedancia, la reactancia. */
  im: number;
}

const EPSILON = 1e-12;

export const cero: Complejo = { re: 0, im: 0 };

export function complejo(re: number, im = 0): Complejo {
  return { re, im };
}

/** Desde módulo y argumento en radianes. */
export function desdePolar(modulo: number, argumento: number): Complejo {
  return { re: modulo * Math.cos(argumento), im: modulo * Math.sin(argumento) };
}

/** Desde módulo y argumento en grados, que es como se escribe en la carpeta. */
export function desdePolarGrados(modulo: number, grados: number): Complejo {
  return desdePolar(modulo, aRadianes(grados));
}

export function sumar(...zs: Complejo[]): Complejo {
  return zs.reduce((a, b) => ({ re: a.re + b.re, im: a.im + b.im }), cero);
}

export function restar(a: Complejo, b: Complejo): Complejo {
  return { re: a.re - b.re, im: a.im - b.im };
}

/** (a + jb)(c + jd) = (ac − bd) + j(ad + bc) */
export function multiplicar(a: Complejo, b: Complejo): Complejo {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/**
 * División por el conjugado: se multiplica arriba y abajo por el conjugado del
 * denominador para que abajo quede un número real.
 */
export function dividir(a: Complejo, b: Complejo): Complejo {
  const den = b.re * b.re + b.im * b.im;
  if (den < EPSILON) {
    throw new Error('No se puede dividir por cero complejo.');
  }
  return {
    re: (a.re * b.re + a.im * b.im) / den,
    im: (a.im * b.re - a.re * b.im) / den,
  };
}

export function conjugado(z: Complejo): Complejo {
  return { re: z.re, im: -z.im };
}

/** 1/z. Se usa para pasar de impedancia a admitancia y al revés. */
export function inverso(z: Complejo): Complejo {
  return dividir(complejo(1), z);
}

export function escalar(z: Complejo, k: number): Complejo {
  return { re: z.re * k, im: z.im * k };
}

export function modulo(z: Complejo): number {
  return Math.hypot(z.re, z.im);
}

/** Argumento en radianes, entre −π y π. */
export function argumento(z: Complejo): number {
  return Math.atan2(z.im, z.re);
}

/** Argumento en grados, entre −180 y 180. */
export function argumentoGrados(z: Complejo): number {
  return aGrados(argumento(z));
}

export function aGrados(radianes: number): number {
  return (radianes * 180) / Math.PI;
}

export function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Suma de complejos en paralelo: 1/(1/z1 + 1/z2 + ...).
 *
 * Dos casos límite, los dos con sentido físico:
 *
 * - Una rama en **cortocircuito** anula el paralelo: Z = 0.
 * - Si las admitancias se **cancelan** —una bobina y un capacitor ideales con
 *   la misma reactancia—, el paralelo es un **circuito abierto**: Z → ∞ y
 *   puramente real. Es el circuito tanque en resonancia. No es un error de
 *   cálculo: es lo que hace el circuito, y por eso se devuelve infinito en vez
 *   de tirar una excepción.
 */
export function paraleloComplejo(...zs: Complejo[]): Complejo {
  if (zs.length === 0) throw new Error('El paralelo necesita al menos una impedancia.');
  if (zs.some((z) => modulo(z) < EPSILON)) return cero;

  const admitancia = sumar(...zs.map(inverso));
  if (modulo(admitancia) < EPSILON) return { re: Infinity, im: 0 };

  return inverso(admitancia);
}

/** ¿Son iguales dentro de una tolerancia? Para tests y comparaciones. */
export function iguales(a: Complejo, b: Complejo, tolerancia = 1e-9): boolean {
  return Math.abs(a.re - b.re) <= tolerancia && Math.abs(a.im - b.im) <= tolerancia;
}

/**
 * Forma binómica: "12,0 + j5,00" o "12,0 − j5,00".
 *
 * El signo de la parte imaginaria va **afuera** de la j, separado, como se
 * escribe a mano. Nunca "12,0 + j−5,00".
 */
export function binomica(z: Complejo, unidad = '', cifras = 3): string {
  const re = unidad ? ingenieril(z.re, unidad, cifras) : coma(z.re.toPrecision(cifras));
  const abs = Math.abs(z.im);
  const im = unidad ? ingenieril(abs, unidad, cifras) : coma(abs.toPrecision(cifras));
  const signo = z.im < 0 ? '−' : '+';
  return `${re} ${signo} j${im}`;
}

/** Forma polar: "13,0 Ω ∠ 22,6°". */
export function polar(z: Complejo, unidad = '', cifras = 3): string {
  const m = unidad
    ? ingenieril(modulo(z), unidad, cifras)
    : coma(modulo(z).toPrecision(cifras));
  const ang = coma(argumentoGrados(z).toFixed(1)).replace('-', '−');
  return `${m} ∠ ${ang}°`;
}
