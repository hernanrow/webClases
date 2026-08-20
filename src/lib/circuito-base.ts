/**
 * El circuito base de la Unidad 2 y los cinco métodos que lo resuelven.
 *
 * Todos los métodos operan sobre **el mismo circuito** y tienen que dar
 * **el mismo resultado**. Ese es el objetivo didáctico de la unidad, así que no
 * es solo una intención: `circuito-base.test.ts` compara los cinco entre sí y
 * falla el build si alguno se desvía.
 *
 * Topología (dos fuentes, cinco resistencias, dos nudos y tres mallas):
 *
 *      ┌──R1──A──R3──B──R5──┐
 *      │      │      │      │
 *     (V1)   R2     R4     (V2)
 *      │      │      │      │
 *      └──────┴──────┴──────┘  ← referencia
 *
 * Unidades base: volt, ampere, ohm, watt.
 */

import { resolverSistema, determinante } from './circuitos';

export interface CircuitoBase {
  v1: number;
  v2: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r5: number;
}

export const CIRCUITO_INICIAL: CircuitoBase = {
  v1: 12,
  v2: 6,
  r1: 100,
  r2: 220,
  r3: 330,
  r4: 470,
  r5: 150,
};

/**
 * Corrientes de rama, con el sentido positivo fijado así:
 *
 *   i1: de V1 hacia A, por R1
 *   i2: de A a la referencia, por R2
 *   i3: de A hacia B, por R3
 *   i4: de B a la referencia, por R4
 *   i5: de V2 hacia B, por R5
 *
 * Con esos sentidos, las dos ecuaciones de nudo son i1 = i2 + i3 y
 * i3 + i5 = i4. Una corriente negativa significa que va al revés.
 */
export interface CorrientesDeRama {
  i1: number;
  i2: number;
  i3: number;
  i4: number;
  i5: number;
}

export function esValido(c: CircuitoBase): boolean {
  return (
    Number.isFinite(c.v1) &&
    Number.isFinite(c.v2) &&
    [c.r1, c.r2, c.r3, c.r4, c.r5].every((r) => Number.isFinite(r) && r > 0)
  );
}

// ---------------------------------------------------------------------------
// Método de nudos
// ---------------------------------------------------------------------------

export interface ResultadoNudos {
  /** Matriz de conductancias, en siemens. */
  matriz: number[][];
  /** Términos independientes: las corrientes inyectadas por las fuentes. */
  terminos: number[];
  /** Tensión de cada nudo respecto de la referencia. */
  tensiones: { nudo: string; valor: number }[];
  corrientes: CorrientesDeRama;
}

/**
 * Nudos A y B, con el riel de abajo como referencia.
 *
 *   Nudo A: (vA − V1)/R1 + vA/R2 + (vA − vB)/R3 = 0
 *   Nudo B: (vB − vA)/R3 + vB/R4 + (vB − V2)/R5 = 0
 */
export function resolverPorNudos(c: CircuitoBase): ResultadoNudos {
  const g1 = 1 / c.r1;
  const g2 = 1 / c.r2;
  const g3 = 1 / c.r3;
  const g4 = 1 / c.r4;
  const g5 = 1 / c.r5;

  const matriz = [
    [g1 + g2 + g3, -g3],
    [-g3, g3 + g4 + g5],
  ];
  const terminos = [c.v1 * g1, c.v2 * g5];

  const [va, vb] = resolverSistema(matriz, terminos) as [number, number];

  return {
    matriz,
    terminos,
    tensiones: [
      { nudo: 'A', valor: va },
      { nudo: 'B', valor: vb },
    ],
    corrientes: {
      i1: (c.v1 - va) / c.r1,
      i2: va / c.r2,
      i3: (va - vb) / c.r3,
      i4: vb / c.r4,
      i5: (c.v2 - vb) / c.r5,
    },
  };
}

// ---------------------------------------------------------------------------
// Método de mallas
// ---------------------------------------------------------------------------

export interface ResultadoMallas {
  /** Matriz de resistencias. */
  matriz: number[][];
  terminos: number[];
  /** Corrientes de malla, las tres en sentido horario. */
  mallas: { malla: string; valor: number }[];
  /** Los cuatro determinantes de Cramer: el del sistema y uno por incógnita. */
  determinantes: { nombre: string; valor: number }[];
  corrientes: CorrientesDeRama;
}

/**
 * Tres mallas, todas en sentido horario:
 *
 *   I1 — la de la izquierda  (V1, R1, R2)
 *   I2 — la del medio        (R2, R3, R4)
 *   I3 — la de la derecha    (R4, R5, V2)
 *
 * La diagonal de la matriz es la suma de resistencias de cada malla, y fuera de
 * la diagonal va la resistencia compartida cambiada de signo.
 */
export function resolverPorMallas(c: CircuitoBase): ResultadoMallas {
  const matriz = [
    [c.r1 + c.r2, -c.r2, 0],
    [-c.r2, c.r2 + c.r3 + c.r4, -c.r4],
    [0, -c.r4, c.r4 + c.r5],
  ];
  // V1 empuja a favor de I1. V2 empuja en contra de I3, porque recorriendo la
  // malla derecha en sentido horario se atraviesa la fuente del + al −.
  const terminos = [c.v1, 0, -c.v2];

  const [im1, im2, im3] = resolverSistema(matriz, terminos) as [number, number, number];

  // Determinantes de Cramer: se reemplaza la columna k por los términos.
  const conColumna = (k: number) => matriz.map((fila, i) => fila.map((x, j) => (j === k ? terminos[i]! : x)));
  const determinantes = [
    { nombre: 'Δ', valor: determinante(matriz) },
    { nombre: 'Δ₁', valor: determinante(conColumna(0)) },
    { nombre: 'Δ₂', valor: determinante(conColumna(1)) },
    { nombre: 'Δ₃', valor: determinante(conColumna(2)) },
  ];

  return {
    matriz,
    terminos,
    mallas: [
      { malla: 'I₁', valor: im1 },
      { malla: 'I₂', valor: im2 },
      { malla: 'I₃', valor: im3 },
    ],
    determinantes,
    // R1 lleva solo I1; R2 y R4 son compartidas; R3 lleva solo I2; R5 solo I3.
    corrientes: {
      i1: im1,
      i2: im1 - im2,
      i3: im2,
      i4: im2 - im3,
      i5: -im3,
    },
  };
}

// ---------------------------------------------------------------------------
// Thévenin y Norton
// ---------------------------------------------------------------------------

/** Las ramas que se pueden marcar como carga. */
export type RamaCarga = 'r2' | 'r4';

export interface ResultadoThevenin {
  /** Tensión a circuito abierto en los bornes de la carga. */
  vth: number;
  /** Resistencia vista desde la carga con las fuentes pasivadas. */
  rth: number;
  /** Corriente por la carga original. */
  corrienteCarga: number;
  potenciaCarga: number;
  /** R_L que maximiza la potencia entregada, que es siempre R_Th. */
  rCargaOptima: number;
  potenciaMaxima: number;
}

/**
 * Thévenin visto desde una de las dos ramas verticales.
 *
 * Los dos pasos son los del pizarrón:
 *   1. Se saca la carga y se calcula la tensión que queda entre esos bornes.
 *   2. Se pasivan las fuentes (las de tensión en cortocircuito) y se calcula la
 *      resistencia vista desde esos mismos bornes.
 */
export function thevenin(c: CircuitoBase, rama: RamaCarga): ResultadoThevenin {
  // Paso 1: circuito abierto en la rama de la carga.
  // Quitar R2 equivale a R2 → infinito; se modela con una conductancia nula.
  const abierto = { ...c, [rama]: Number.POSITIVE_INFINITY } as CircuitoBase;
  const { tensiones } = resolverPorNudosConInfinitos(abierto);
  const vth = (rama === 'r2' ? tensiones[0]! : tensiones[1]!).valor;

  // Paso 2: fuentes pasivadas. Las de tensión pasan a ser un cortocircuito, así
  // que los nudos V1 y V2 quedan unidos a la referencia y R1 y R5 quedan
  // directamente entre A (o B) y la referencia.
  const rth = resistenciaVista(c, rama);

  const rCarga = rama === 'r2' ? c.r2 : c.r4;
  const corrienteCarga = vth / (rth + rCarga);
  const potenciaCarga = corrienteCarga * corrienteCarga * rCarga;

  // Máxima transferencia: R_L = R_Th, y ahí P = V_Th² / (4·R_Th).
  const potenciaMaxima = (vth * vth) / (4 * rth);

  return { vth, rth, corrienteCarga, potenciaCarga, rCargaOptima: rth, potenciaMaxima };
}

export interface ResultadoNorton {
  /** Corriente de cortocircuito entre los bornes de la carga. */
  inorton: number;
  rn: number;
  vth: number;
}

/** Norton sale del mismo motor: I_N = V_Th / R_Th y R_N = R_Th. */
export function norton(c: CircuitoBase, rama: RamaCarga): ResultadoNorton {
  const { vth, rth } = thevenin(c, rama);
  return { inorton: vth / rth, rn: rth, vth };
}

/**
 * Resistencia vista desde la rama de la carga con las fuentes de tensión
 * pasivadas (en cortocircuito).
 *
 * Pasivadas las fuentes, el circuito queda:
 *   desde A: R1 y R2 a la referencia, y R3 hacia B, que a su vez tiene R4 y R5
 *   a la referencia.
 */
function resistenciaVista(c: CircuitoBase, rama: RamaCarga): number {
  const par = (a: number, b: number) => (a * b) / (a + b);

  if (rama === 'r2') {
    // Desde A, sin R2: R1 ∥ (R3 + (R4 ∥ R5))
    return par(c.r1, c.r3 + par(c.r4, c.r5));
  }
  // Desde B, sin R4: R5 ∥ (R3 + (R1 ∥ R2))
  return par(c.r5, c.r3 + par(c.r1, c.r2));
}

/** Igual que `resolverPorNudos` pero admite una resistencia infinita (rama abierta). */
function resolverPorNudosConInfinitos(c: CircuitoBase): ResultadoNudos {
  const g = (r: number) => (Number.isFinite(r) ? 1 / r : 0);
  const g1 = g(c.r1);
  const g2 = g(c.r2);
  const g3 = g(c.r3);
  const g4 = g(c.r4);
  const g5 = g(c.r5);

  const matriz = [
    [g1 + g2 + g3, -g3],
    [-g3, g3 + g4 + g5],
  ];
  const terminos = [c.v1 * g1, c.v2 * g5];
  const [va, vb] = resolverSistema(matriz, terminos) as [number, number];

  return {
    matriz,
    terminos,
    tensiones: [
      { nudo: 'A', valor: va },
      { nudo: 'B', valor: vb },
    ],
    corrientes: {
      i1: (c.v1 - va) * g1,
      i2: va * g2,
      i3: (va - vb) * g3,
      i4: vb * g4,
      i5: (c.v2 - vb) * g5,
    },
  };
}

// ---------------------------------------------------------------------------
// Superposición
// ---------------------------------------------------------------------------

export interface AporteFuente {
  fuente: 'V1' | 'V2';
  /** Lo que aporta esta fuente sola, con las demás pasivadas. */
  corrientes: CorrientesDeRama;
}

export interface ResultadoSuperposicion {
  aportes: AporteFuente[];
  /** La suma de los aportes, que tiene que coincidir con resolver el circuito entero. */
  total: CorrientesDeRama;
}

/**
 * Se apaga una fuente por vez —pasivar una fuente de tensión es ponerla en
 * cortocircuito— y se suman los aportes. La suma tiene que dar lo mismo que
 * resolver el circuito completo de una sola vez.
 */
export function superposicion(c: CircuitoBase): ResultadoSuperposicion {
  const soloV1 = resolverPorNudos({ ...c, v2: 0 }).corrientes;
  const soloV2 = resolverPorNudos({ ...c, v1: 0 }).corrientes;

  return {
    aportes: [
      { fuente: 'V1', corrientes: soloV1 },
      { fuente: 'V2', corrientes: soloV2 },
    ],
    total: sumarCorrientes(soloV1, soloV2),
  };
}

export function sumarCorrientes(a: CorrientesDeRama, b: CorrientesDeRama): CorrientesDeRama {
  return {
    i1: a.i1 + b.i1,
    i2: a.i2 + b.i2,
    i3: a.i3 + b.i3,
    i4: a.i4 + b.i4,
    i5: a.i5 + b.i5,
  };
}

/** Potencia disipada en cada resistencia, para los controles de coherencia. */
export function potencias(c: CircuitoBase, i: CorrientesDeRama) {
  return {
    r1: i.i1 * i.i1 * c.r1,
    r2: i.i2 * i.i2 * c.r2,
    r3: i.i3 * i.i3 * c.r3,
    r4: i.i4 * i.i4 * c.r4,
    r5: i.i5 * i.i5 * c.r5,
  };
}
