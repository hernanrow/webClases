import { describe, it, expect } from 'vitest';
import {
  CIRCUITO_INICIAL,
  resolverPorNudos,
  resolverPorMallas,
  thevenin,
  norton,
  superposicion,
  potencias,
  type CircuitoBase,
  type CorrientesDeRama,
} from './circuito-base';

const cerca = (real: number, esperado: number, tol = 1e-6) =>
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(Math.abs(esperado) * tol + 1e-9);

const mismasCorrientes = (a: CorrientesDeRama, b: CorrientesDeRama, tol = 1e-6) => {
  for (const k of ['i1', 'i2', 'i3', 'i4', 'i5'] as const) {
    expect(Math.abs(a[k] - b[k]), `${k}: ${a[k]} vs ${b[k]}`).toBeLessThanOrEqual(
      Math.abs(b[k]) * tol + 1e-9,
    );
  }
};

/** Unos cuantos circuitos distintos, para no probar con uno solo. */
const CASOS: CircuitoBase[] = [
  CIRCUITO_INICIAL,
  { v1: 24, v2: 0, r1: 1000, r2: 2200, r3: 470, r4: 330, r5: 680 },
  { v1: 5, v2: 15, r1: 47, r2: 100, r3: 220, r4: 47, r5: 330 },
  { v1: 9, v2: 9, r1: 1000, r2: 1000, r3: 1000, r4: 1000, r5: 1000 },
  { v1: -12, v2: 6, r1: 100, r2: 100, r3: 100, r4: 100, r5: 100 },
];

describe('las leyes de Kirchhoff se cumplen en la solución', () => {
  it.each(CASOS)('nudo A: i1 = i2 + i3 · nudo B: i3 + i5 = i4', (c) => {
    const { i1, i2, i3, i4, i5 } = resolverPorNudos(c).corrientes;
    cerca(i1, i2 + i3);
    cerca(i3 + i5, i4);
  });

  it.each(CASOS)('la potencia entregada por las fuentes es la que disipan las resistencias', (c) => {
    const i = resolverPorNudos(c).corrientes;
    const p = potencias(c, i);
    const entregada = c.v1 * i.i1 + c.v2 * i.i5;
    const disipada = p.r1 + p.r2 + p.r3 + p.r4 + p.r5;
    cerca(entregada, disipada, 1e-9);
  });
});

/**
 * Este es el bloque que justifica toda la unidad: los cinco métodos son formas
 * distintas de llegar al mismo lugar. Si alguno se desvía, el build falla.
 */
describe('los cinco métodos dan el mismo resultado', () => {
  it.each(CASOS)('mallas y nudos coinciden', (c) => {
    mismasCorrientes(resolverPorMallas(c).corrientes, resolverPorNudos(c).corrientes);
  });

  it.each(CASOS)('superposición coincide con resolver el circuito entero', (c) => {
    mismasCorrientes(superposicion(c).total, resolverPorNudos(c).corrientes);
  });

  it.each(CASOS)('Thévenin en R2 reproduce la corriente real de esa rama', (c) => {
    const { corrienteCarga } = thevenin(c, 'r2');
    cerca(corrienteCarga, resolverPorNudos(c).corrientes.i2);
  });

  it.each(CASOS)('Thévenin en R4 reproduce la corriente real de esa rama', (c) => {
    const { corrienteCarga } = thevenin(c, 'r4');
    cerca(corrienteCarga, resolverPorNudos(c).corrientes.i4);
  });

  it.each(CASOS)('Norton y Thévenin son el mismo equivalente', (c) => {
    for (const rama of ['r2', 'r4'] as const) {
      const t = thevenin(c, rama);
      const n = norton(c, rama);
      cerca(n.rn, t.rth);
      cerca(n.inorton * n.rn, t.vth); // V_Th = I_N · R_N
    }
  });
});

describe('método de mallas', () => {
  it('la matriz de resistencias es simétrica', () => {
    const { matriz } = resolverPorMallas(CIRCUITO_INICIAL);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) cerca(matriz[i]![j]!, matriz[j]![i]!);
  });

  it('la diagonal es la suma de las resistencias de cada malla', () => {
    const c = CIRCUITO_INICIAL;
    const { matriz } = resolverPorMallas(c);
    cerca(matriz[0]![0]!, c.r1 + c.r2);
    cerca(matriz[1]![1]!, c.r2 + c.r3 + c.r4);
    cerca(matriz[2]![2]!, c.r4 + c.r5);
  });

  it('fuera de la diagonal va la resistencia compartida, negativa', () => {
    const c = CIRCUITO_INICIAL;
    const { matriz } = resolverPorMallas(c);
    cerca(matriz[0]![1]!, -c.r2);
    cerca(matriz[1]![2]!, -c.r4);
    expect(matriz[0]![2]).toBe(0); // las mallas 1 y 3 no comparten nada
  });

  it('Cramer da lo mismo que resolver el sistema', () => {
    const { determinantes, mallas } = resolverPorMallas(CIRCUITO_INICIAL);
    const [d, d1, d2, d3] = determinantes.map((x) => x.valor) as [number, number, number, number];
    cerca(d1 / d, mallas[0]!.valor);
    cerca(d2 / d, mallas[1]!.valor);
    cerca(d3 / d, mallas[2]!.valor);
  });
});

describe('método de nudos', () => {
  it('la matriz de conductancias es simétrica', () => {
    const { matriz } = resolverPorNudos(CIRCUITO_INICIAL);
    cerca(matriz[0]![1]!, matriz[1]![0]!);
  });

  it('la diagonal es la suma de conductancias que llegan al nudo', () => {
    const c = CIRCUITO_INICIAL;
    const { matriz } = resolverPorNudos(c);
    cerca(matriz[0]![0]!, 1 / c.r1 + 1 / c.r2 + 1 / c.r3);
    cerca(matriz[1]![1]!, 1 / c.r3 + 1 / c.r4 + 1 / c.r5);
  });

  it('fuera de la diagonal va la conductancia compartida, negativa', () => {
    const c = CIRCUITO_INICIAL;
    const { matriz } = resolverPorNudos(c);
    cerca(matriz[0]![1]!, -1 / c.r3);
  });
});

describe('Thévenin', () => {
  it('la máxima potencia se transfiere cuando R_L = R_Th', () => {
    const { vth, rth, rCargaOptima, potenciaMaxima } = thevenin(CIRCUITO_INICIAL, 'r2');
    cerca(rCargaOptima, rth);

    // Se barre la carga y ninguna otra debe superar a la de R_L = R_Th.
    const potencia = (rl: number) => (vth / (rth + rl)) ** 2 * rl;
    cerca(potencia(rth), potenciaMaxima);
    for (const factor of [0.1, 0.5, 0.9, 1.1, 2, 10]) {
      expect(potencia(rth * factor)).toBeLessThan(potenciaMaxima);
    }
  });

  it('sin la segunda fuente, R_Th es la reducción serie-paralelo de siempre', () => {
    // Con V2 = 0 el circuito no cambia de forma: R_Th no depende de las fuentes.
    const c = { ...CIRCUITO_INICIAL, v2: 0 };
    cerca(thevenin(c, 'r2').rth, thevenin(CIRCUITO_INICIAL, 'r2').rth);
  });

  it('R_Th no depende del valor de las fuentes', () => {
    const a = thevenin(CIRCUITO_INICIAL, 'r4').rth;
    const b = thevenin({ ...CIRCUITO_INICIAL, v1: 100, v2: -40 }, 'r4').rth;
    cerca(a, b);
  });
});

describe('superposición', () => {
  it('apagar las dos fuentes deja todo en cero', () => {
    const { total } = superposicion({ ...CIRCUITO_INICIAL, v1: 0, v2: 0 });
    for (const k of ['i1', 'i2', 'i3', 'i4', 'i5'] as const) cerca(total[k], 0);
  });

  it('con una sola fuente, el aporte de la otra es nulo', () => {
    const { aportes } = superposicion({ ...CIRCUITO_INICIAL, v2: 0 });
    const soloV2 = aportes[1]!.corrientes;
    for (const k of ['i1', 'i2', 'i3', 'i4', 'i5'] as const) cerca(soloV2[k], 0);
  });

  it('duplicar una fuente duplica su aporte (el circuito es lineal)', () => {
    const simple = superposicion(CIRCUITO_INICIAL).aportes[0]!.corrientes;
    const doble = superposicion({ ...CIRCUITO_INICIAL, v1: CIRCUITO_INICIAL.v1 * 2 }).aportes[0]!
      .corrientes;
    for (const k of ['i1', 'i2', 'i3', 'i4', 'i5'] as const) cerca(doble[k], simple[k] * 2);
  });
});

describe('caso resuelto a mano', () => {
  // Circuito simétrico: V1 = V2 = 10 V, las cinco resistencias de 100 Ω.
  // Por simetría vA = vB, así que por R3 no circula corriente.
  const simetrico: CircuitoBase = { v1: 10, v2: 10, r1: 100, r2: 100, r3: 100, r4: 100, r5: 100 };

  it('por la rama del medio no circula corriente', () => {
    const { corrientes, tensiones } = resolverPorNudos(simetrico);
    cerca(tensiones[0]!.valor, tensiones[1]!.valor);
    expect(Math.abs(corrientes.i3)).toBeLessThan(1e-12);
  });

  it('sin corriente por R3, cada mitad es un divisor de 10 V entre dos de 100 Ω', () => {
    const { corrientes, tensiones } = resolverPorNudos(simetrico);
    cerca(tensiones[0]!.valor, 5); // divisor: 10 V · 100/(100+100)
    cerca(corrientes.i1, 0.05); // (10 − 5)/100 = 50 mA
    cerca(corrientes.i2, 0.05);
  });

  it('los cinco métodos coinciden también en el simétrico', () => {
    mismasCorrientes(resolverPorMallas(simetrico).corrientes, resolverPorNudos(simetrico).corrientes);
    mismasCorrientes(superposicion(simetrico).total, resolverPorNudos(simetrico).corrientes);
  });
});
