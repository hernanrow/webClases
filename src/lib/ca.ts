/**
 * Circuitos en corriente alterna senoidal.
 *
 * Se apoya en `complejos.ts` para la aritmética y agrega lo que es propio de la
 * materia: reactancias, impedancia serie y paralelo, resonancia y potencias.
 *
 * Unidades base: volt, ampere, ohm, hertz, henry, farad, watt, var, VA.
 */

import {
  complejo,
  sumar,
  paraleloComplejo,
  modulo,
  argumento,
  argumentoGrados,
  type Complejo,
} from './complejos';

const EPSILON = 1e-12;

// ---------------------------------------------------------------------------
// Senoides y fasores
// ---------------------------------------------------------------------------

export interface Senoide {
  /** Amplitud, o valor de pico. */
  amplitud: number;
  /** Frecuencia en hertz. */
  frecuencia: number;
  /** Fase inicial en grados. */
  fase: number;
}

/** Pulsación ω = 2πf, en rad/s. */
export function pulsacion(frecuencia: number): number {
  return 2 * Math.PI * frecuencia;
}

/** Período T = 1/f, en segundos. */
export function periodo(frecuencia: number): number {
  if (Math.abs(frecuencia) < EPSILON) return Infinity;
  return 1 / frecuencia;
}

/**
 * Valor eficaz de una senoide: el pico dividido por raíz de dos.
 *
 * Es el valor que marca un téster y el que se usa para calcular potencia: una
 * senoide de 311 V de pico calienta lo mismo que 220 V de continua.
 */
export function eficaz(amplitud: number): number {
  return Math.abs(amplitud) / Math.SQRT2;
}

/** Valor pico a pico: del máximo al mínimo. */
export function picoAPico(amplitud: number): number {
  return 2 * Math.abs(amplitud);
}

/** v(t) = A · sen(ωt + φ) */
export function valorInstantaneo(s: Senoide, t: number): number {
  return s.amplitud * Math.sin(pulsacion(s.frecuencia) * t + (s.fase * Math.PI) / 180);
}

/**
 * El fasor de una senoide: módulo el valor **eficaz** y argumento la fase.
 *
 * Se usa el eficaz y no el pico porque es la convención de la materia y la que
 * hace que las potencias salgan directas, sin factores de dos dando vueltas.
 */
export function fasor(s: Senoide): Complejo {
  return {
    re: eficaz(s.amplitud) * Math.cos((s.fase * Math.PI) / 180),
    im: eficaz(s.amplitud) * Math.sin((s.fase * Math.PI) / 180),
  };
}

/** De un fasor de vuelta a la senoide, dada la frecuencia. */
export function senoideDeFasor(z: Complejo, frecuencia: number): Senoide {
  return {
    amplitud: modulo(z) * Math.SQRT2,
    frecuencia,
    fase: argumentoGrados(z),
  };
}

/**
 * Suma de senoides de la misma frecuencia, resuelta con fasores.
 *
 * Es el punto del tema: sumar dos senoides desfasadas en el tiempo es difícil,
 * pero sumar sus fasores es sumar dos vectores.
 */
export function sumarSenoides(a: Senoide, b: Senoide): Senoide {
  if (Math.abs(a.frecuencia - b.frecuencia) > EPSILON) {
    throw new Error(
      'Solo se pueden sumar con fasores senoides de la misma frecuencia. ' +
        'Con frecuencias distintas la suma no es una senoide.',
    );
  }
  return senoideDeFasor(sumar(fasor(a), fasor(b)), a.frecuencia);
}

// ---------------------------------------------------------------------------
// Reactancias e impedancias
// ---------------------------------------------------------------------------

/** Reactancia inductiva X_L = ωL. Crece con la frecuencia. */
export function reactanciaInductiva(inductancia: number, frecuencia: number): number {
  return pulsacion(frecuencia) * inductancia;
}

/** Reactancia capacitiva X_C = 1/(ωC). Baja con la frecuencia. */
export function reactanciaCapacitiva(capacidad: number, frecuencia: number): number {
  const w = pulsacion(frecuencia);
  if (w * capacidad < EPSILON) return Infinity;
  return 1 / (w * capacidad);
}

export type Conexion = 'serie' | 'paralelo';

export interface CircuitoCA {
  /** Resistencia en ohm. */
  r: number;
  /** Inductancia en henry. Cero significa que no hay bobina. */
  l: number;
  /** Capacidad en farad. Cero significa que no hay capacitor. */
  c: number;
  /** Frecuencia en hertz. */
  f: number;
  conexion: Conexion;
}

export type Caracter = 'inductivo' | 'capacitivo' | 'resistivo';

export interface ResultadoImpedancia {
  /** La impedancia total, en forma binómica. */
  z: Complejo;
  xl: number;
  xc: number;
  /** Reactancia neta X = X_L − X_C. En paralelo no aplica, queda como null. */
  reactanciaNeta: number | null;
  /** Desfasaje entre tensión y corriente, en grados. Positivo = inductivo. */
  desfasaje: number;
  caracter: Caracter;
  /** cos φ. */
  factorDePotencia: number;
}

/**
 * Impedancia de un R-L-C, en serie o en paralelo.
 *
 * En **serie** las impedancias se suman: Z = R + j(X_L − X_C).
 * En **paralelo** se suman las admitancias, que es 1/(1/Z₁ + 1/Z₂ + 1/Z₃).
 */
export function impedancia(circuito: CircuitoCA): ResultadoImpedancia {
  const { r, l, c, f, conexion } = circuito;
  const xl = reactanciaInductiva(l, f);
  const xc = reactanciaCapacitiva(c, f);

  let z: Complejo;
  let reactanciaNeta: number | null = null;

  if (conexion === 'serie') {
    // Un componente ausente en serie es un cable: aporta impedancia nula.
    const zl = l > 0 ? complejo(0, xl) : complejo(0, 0);
    const zc = c > 0 ? complejo(0, -xc) : complejo(0, 0);
    z = sumar(complejo(r), zl, zc);
    reactanciaNeta = (l > 0 ? xl : 0) - (c > 0 ? xc : 0);
  } else {
    // Un componente ausente en paralelo es una rama abierta: no se incluye.
    const ramas: Complejo[] = [];
    if (r > 0) ramas.push(complejo(r));
    if (l > 0 && xl > EPSILON) ramas.push(complejo(0, xl));
    if (c > 0 && Number.isFinite(xc) && xc > EPSILON) ramas.push(complejo(0, -xc));
    z = ramas.length > 0 ? paraleloComplejo(...ramas) : complejo(0);
  }

  const desfasaje = argumentoGrados(z);
  const caracter: Caracter =
    Math.abs(z.im) < 1e-9 ? 'resistivo' : z.im > 0 ? 'inductivo' : 'capacitivo';

  return {
    z,
    xl,
    xc,
    reactanciaNeta,
    desfasaje,
    caracter,
    factorDePotencia: Math.cos(argumento(z)),
  };
}

// ---------------------------------------------------------------------------
// Resonancia
// ---------------------------------------------------------------------------

export interface ResultadoResonancia {
  /** Frecuencia de resonancia f₀ = 1/(2π√(LC)), en hertz. */
  f0: number;
  /** Factor de calidad Q. */
  q: number;
  /** Ancho de banda BW = f₀/Q, en hertz. */
  anchoDeBanda: number;
  /** Frecuencias de corte, donde la potencia cae a la mitad. */
  fInferior: number;
  fSuperior: number;
  /** Impedancia en resonancia: en serie es R puro. */
  zEnResonancia: number;
}

/**
 * Resonancia de un R-L-C serie.
 *
 * En f₀ las dos reactancias se cancelan: X_L = X_C. La impedancia queda mínima
 * y puramente resistiva, y la corriente es máxima.
 */
export function resonanciaSerie(r: number, l: number, c: number): ResultadoResonancia {
  if (l <= 0 || c <= 0) {
    throw new Error('Para que haya resonancia hacen falta una bobina y un capacitor.');
  }
  const f0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
  // Q = (1/R)·√(L/C): cuánto más grandes son las reactancias que la resistencia.
  const q = r > EPSILON ? Math.sqrt(l / c) / r : Infinity;
  const anchoDeBanda = Number.isFinite(q) && q > 0 ? f0 / q : 0;

  // Las frecuencias de corte no son simétricas alrededor de f₀; su media
  // geométrica sí da f₀ exacto.
  const alfa = r / (2 * l);
  const w0 = 2 * Math.PI * f0;
  const fInferior = (Math.sqrt(alfa * alfa + w0 * w0) - alfa) / (2 * Math.PI);
  const fSuperior = (Math.sqrt(alfa * alfa + w0 * w0) + alfa) / (2 * Math.PI);

  return { f0, q, anchoDeBanda, fInferior, fSuperior, zEnResonancia: r };
}

// ---------------------------------------------------------------------------
// Potencias
// ---------------------------------------------------------------------------

export interface Potencias {
  /** Potencia activa, en watt. La que hace trabajo. */
  p: number;
  /** Potencia reactiva, en var. La que va y viene sin hacer trabajo. */
  q: number;
  /** Potencia aparente, en VA. El módulo de las otras dos. */
  s: number;
  /** cos φ. */
  factorDePotencia: number;
  /** Desfasaje en grados. */
  desfasaje: number;
}

/**
 * El triángulo de potencias a partir de la tensión eficaz aplicada y la
 * impedancia.
 *
 *   S = V·I     (aparente, en VA)
 *   P = S·cos φ (activa, en W)
 *   Q = S·sen φ (reactiva, en var)
 *
 * y se cumple S² = P² + Q², que es el teorema de Pitágoras sobre el triángulo.
 */
export function potenciasDe(tensionEficaz: number, z: Complejo): Potencias {
  const m = modulo(z);
  if (m < EPSILON) {
    throw new Error('Con impedancia nula la corriente sería infinita.');
  }
  const corriente = tensionEficaz / m;
  const fi = argumento(z);
  const s = tensionEficaz * corriente;

  return {
    p: s * Math.cos(fi),
    q: s * Math.sin(fi),
    s,
    factorDePotencia: Math.cos(fi),
    desfasaje: argumentoGrados(z),
  };
}

/**
 * Capacidad que hace falta para llevar el factor de potencia hasta el objetivo.
 *
 * Es la corrección que se hace en cualquier instalación con motores: se ponen
 * capacitores en paralelo para compensar la reactiva inductiva y no pagar
 * penalidad. Devuelve el valor en farad.
 */
export function capacidadParaCorregir(
  potencias: Potencias,
  cosFiObjetivo: number,
  tensionEficaz: number,
  frecuencia: number,
): number {
  if (cosFiObjetivo <= 0 || cosFiObjetivo > 1) {
    throw new Error('El factor de potencia objetivo tiene que estar entre 0 y 1.');
  }
  const fiObjetivo = Math.acos(cosFiObjetivo);
  const qObjetivo = potencias.p * Math.tan(fiObjetivo);
  const qACompensar = potencias.q - qObjetivo;
  if (qACompensar <= 0) return 0; // ya está mejor que el objetivo
  return qACompensar / (pulsacion(frecuencia) * tensionEficaz * tensionEficaz);
}
