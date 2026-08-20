/**
 * Código de colores de resistencias (IEC 60062).
 *
 * Funciona en los dos sentidos: bandas → valor y valor → bandas. Soporta 4 y 5
 * bandas. Los colores hex son los que se usan también como paleta de unidades
 * del sitio (CLAUDE.md §9), así que el alumno ve el mismo marrón en la banda de
 * una resistencia y en el rótulo de la unidad 1.
 */

export interface Color {
  nombre: string;
  hex: string;
  /** Valor como dígito. null si el color no puede ser dígito (oro, plata). */
  digito: number | null;
  /** Factor multiplicador, o null si no puede ser multiplicador. */
  multiplicador: number | null;
  /** Tolerancia en porcentaje, o null si no puede ser banda de tolerancia. */
  tolerancia: number | null;
  /** Si el texto sobre esta banda debe ser claro u oscuro. */
  textoClaro: boolean;
}

export const COLORES: readonly Color[] = [
  { nombre: 'negro', hex: '#1A1A1A', digito: 0, multiplicador: 1, tolerancia: null, textoClaro: true },
  { nombre: 'marrón', hex: '#7B4B2A', digito: 1, multiplicador: 10, tolerancia: 1, textoClaro: true },
  { nombre: 'rojo', hex: '#B4342B', digito: 2, multiplicador: 100, tolerancia: 2, textoClaro: true },
  { nombre: 'naranja', hex: '#D4762A', digito: 3, multiplicador: 1e3, tolerancia: null, textoClaro: false },
  { nombre: 'amarillo', hex: '#D9A428', digito: 4, multiplicador: 1e4, tolerancia: null, textoClaro: false },
  { nombre: 'verde', hex: '#3B7D46', digito: 5, multiplicador: 1e5, tolerancia: 0.5, textoClaro: true },
  { nombre: 'azul', hex: '#2F5D9E', digito: 6, multiplicador: 1e6, tolerancia: 0.25, textoClaro: true },
  { nombre: 'violeta', hex: '#7A4E9B', digito: 7, multiplicador: 1e7, tolerancia: 0.1, textoClaro: true },
  { nombre: 'gris', hex: '#8A8F96', digito: 8, multiplicador: 1e8, tolerancia: 0.05, textoClaro: false },
  { nombre: 'blanco', hex: '#F2F3F5', digito: 9, multiplicador: 1e9, tolerancia: null, textoClaro: false },
  { nombre: 'oro', hex: '#C9A227', digito: null, multiplicador: 0.1, tolerancia: 5, textoClaro: false },
  { nombre: 'plata', hex: '#B4B8BC', digito: null, multiplicador: 0.01, tolerancia: 10, textoClaro: false },
];

/** Índices de los colores que pueden ser dígito (las dos o tres primeras bandas). */
export const INDICES_DIGITO = COLORES.map((c, i) => (c.digito !== null ? i : -1)).filter((i) => i >= 0);

/** Índices de los colores que pueden ser multiplicador. */
export const INDICES_MULTIPLICADOR = COLORES.map((c, i) => (c.multiplicador !== null ? i : -1)).filter(
  (i) => i >= 0,
);

/** Índices de los colores que pueden ser tolerancia. */
export const INDICES_TOLERANCIA = COLORES.map((c, i) => (c.tolerancia !== null ? i : -1)).filter((i) => i >= 0);

export type CantidadBandas = 4 | 5;

export interface LecturaResistencia {
  /** Valor nominal en ohm. */
  valor: number;
  tolerancia: number;
  /** Extremos del rango admisible por la tolerancia. */
  minimo: number;
  maximo: number;
}

/**
 * Bandas → valor.
 *
 * @param indices índices en COLORES. Para 4 bandas: [d1, d2, mult, tol].
 *                Para 5: [d1, d2, d3, mult, tol].
 */
export function leerBandas(indices: number[]): LecturaResistencia {
  const cantidad = indices.length;
  if (cantidad !== 4 && cantidad !== 5) {
    throw new Error(`Una resistencia se lee con 4 o 5 bandas, no con ${cantidad}.`);
  }

  const colores = indices.map((i) => {
    const c = COLORES[i];
    if (!c) throw new Error(`No existe el color de índice ${i}.`);
    return c;
  });

  const cantidadDigitos = cantidad - 2;
  let digitos = 0;
  for (let i = 0; i < cantidadDigitos; i++) {
    const d = colores[i]!.digito;
    if (d === null) {
      throw new Error(`El ${colores[i]!.nombre} no puede ser una banda de dígito.`);
    }
    digitos = digitos * 10 + d;
  }

  const mult = colores[cantidadDigitos]!.multiplicador;
  if (mult === null) {
    throw new Error(`El ${colores[cantidadDigitos]!.nombre} no puede ser banda multiplicadora.`);
  }

  const tol = colores[cantidad - 1]!.tolerancia;
  if (tol === null) {
    throw new Error(`El ${colores[cantidad - 1]!.nombre} no puede ser banda de tolerancia.`);
  }

  // El producto se redondea: 47 · 0,1 da 4,7000000000000005 en punto flotante.
  const valor = Number((digitos * mult).toPrecision(12));

  return {
    valor,
    tolerancia: tol,
    minimo: Number((valor * (1 - tol / 100)).toPrecision(12)),
    maximo: Number((valor * (1 + tol / 100)).toPrecision(12)),
  };
}

/**
 * Valor → bandas. Devuelve los índices en COLORES.
 *
 * Devuelve `null` si el valor no se puede representar con esa cantidad de
 * bandas: no toda resistencia imaginable existe en el código de colores.
 */
export function calcularBandas(
  valor: number,
  cantidad: CantidadBandas,
  tolerancia = 5,
): number[] | null {
  if (!Number.isFinite(valor) || valor <= 0) return null;

  const iTolerancia = COLORES.findIndex((c) => c.tolerancia === tolerancia);
  if (iTolerancia < 0) return null;

  const cantidadDigitos = cantidad - 2;

  // Se busca el exponente que deja los dígitos significativos como entero.
  // Ej: 4700 con 2 dígitos → 47 · 10²; con 3 dígitos → 470 · 10¹.
  for (let exp = -2; exp <= 9; exp++) {
    const escalado = valor / 10 ** exp;
    const redondeado = Math.round(escalado);
    const minimo = 10 ** (cantidadDigitos - 1);
    const maximo = 10 ** cantidadDigitos - 1;

    if (redondeado < minimo || redondeado > maximo) continue;
    // Solo sirve si la representación es exacta, no aproximada.
    if (Math.abs(escalado - redondeado) > 1e-9) continue;

    const iMultiplicador = COLORES.findIndex((c) => c.multiplicador === 10 ** exp);
    if (iMultiplicador < 0) continue;

    const digitos = String(redondeado)
      .padStart(cantidadDigitos, '0')
      .split('')
      .map((d) => COLORES.findIndex((c) => c.digito === Number(d)));

    if (digitos.some((i) => i < 0)) continue;

    return [...digitos, iMultiplicador, iTolerancia];
  }

  return null;
}

/** Serie E24: los valores comerciales que el alumno se va a encontrar de verdad. */
export const E24 = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6,
  6.2, 6.8, 7.5, 8.2, 9.1,
];

/** Un valor comercial al azar entre 1 Ω y 10 MΩ, para el generador de ejercicios. */
export function valorComercial(semilla: number): number {
  const base = E24[Math.abs(Math.floor(semilla)) % E24.length]!;
  const decada = 10 ** (Math.abs(Math.floor(semilla / E24.length)) % 7);
  return Number((base * decada).toPrecision(12));
}
