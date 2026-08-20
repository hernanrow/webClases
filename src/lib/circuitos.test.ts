import { describe, it, expect } from 'vitest';
import {
  leyDeOhm,
  serie,
  paralelo,
  reducirRed,
  estrellaATriangulo,
  trianguloAEstrella,
  resolverSistema,
  determinante,
  verificarKirchhoff,
  type Red,
} from './circuitos';

/** Compara con tolerancia relativa: los flotantes no dan igualdad exacta. */
const cerca = (real: number, esperado: number, tol = 1e-6) =>
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(Math.abs(esperado) * tol + 1e-9);

describe('ley de Ohm', () => {
  it('despeja la corriente: 9 V sobre 220 Ω dan 40,909 mA', () => {
    const r = leyDeOhm({ tension: 9, resistencia: 220 });
    cerca(r.corriente, 0.0409090909);
    expect(r.despejada).toBe('corriente');
  });

  it('despeja la tensión: 15 mA por 1,2 kΩ dan 18 V', () => {
    const r = leyDeOhm({ corriente: 0.015, resistencia: 1200 });
    cerca(r.tension, 18);
    expect(r.despejada).toBe('tension');
  });

  it('despeja la resistencia: 5 V con 250 mA dan 20 Ω', () => {
    const r = leyDeOhm({ tension: 5, corriente: 0.25 });
    cerca(r.resistencia, 20);
    expect(r.despejada).toBe('resistencia');
  });

  it('la potencia coincide por los tres caminos (P = VI = I²R = V²/R)', () => {
    const { tension: v, corriente: i, resistencia: r, potencia } = leyDeOhm({
      tension: 9,
      resistencia: 220,
    });
    cerca(potencia, v * i);
    cerca(potencia, i * i * r);
    cerca(potencia, (v * v) / r);
    cerca(potencia, 0.368181818);
  });

  it('rechaza recibir menos o más de dos datos', () => {
    expect(() => leyDeOhm({ tension: 9 })).toThrow();
    expect(() => leyDeOhm({ tension: 9, corriente: 1, resistencia: 9 })).toThrow();
  });

  it('rechaza dividir por cero en vez de devolver infinito', () => {
    expect(() => leyDeOhm({ tension: 9, resistencia: 0 })).toThrow();
    expect(() => leyDeOhm({ tension: 9, corriente: 0 })).toThrow();
  });
});

describe('serie y paralelo', () => {
  it('en serie las resistencias se suman', () => {
    cerca(serie([100, 220, 330]), 650);
  });

  it('dos iguales en paralelo dan la mitad', () => {
    cerca(paralelo([1000, 1000]), 500);
  });

  it('paralelo de 220 y 330 da 132 Ω', () => {
    cerca(paralelo([220, 330]), 132);
  });

  it('tres en paralelo: 100, 200 y 300 dan 54,545 Ω', () => {
    cerca(paralelo([100, 200, 300]), 600 / 11);
  });

  it('el paralelo siempre es menor que la menor de las ramas', () => {
    const valores = [470, 1200, 2200];
    expect(paralelo(valores)).toBeLessThan(Math.min(...valores));
  });

  it('una rama en cortocircuito anula el paralelo', () => {
    cerca(paralelo([470, 0]), 0);
  });
});

describe('reducción de red mixta', () => {
  // R1 en serie con (R2 ∥ R3):  100 + (220 ∥ 330) = 100 + 132 = 232 Ω
  const mixta: Red = {
    tipo: 'serie',
    hijos: [
      { tipo: 'resistencia', rotulo: 'R_1', valor: 100 },
      {
        tipo: 'paralelo',
        hijos: [
          { tipo: 'resistencia', rotulo: 'R_2', valor: 220 },
          { tipo: 'resistencia', rotulo: 'R_3', valor: 330 },
        ],
      },
    ],
  };

  it('resuelve la equivalente de una mixta', () => {
    cerca(reducirRed(mixta).equivalente, 232);
  });

  it('devuelve el desarrollo, no solo el número', () => {
    const { pasos } = reducirRed(mixta);
    expect(pasos.length).toBe(2);
    // De adentro hacia afuera: primero el paralelo, después la serie.
    expect(pasos[0]!.descripcion).toContain('paralelo');
    cerca(pasos[0]!.valor, 132);
    expect(pasos[1]!.descripcion).toContain('serie');
    cerca(pasos[1]!.valor, 232);
  });

  it('una resistencia sola no genera pasos', () => {
    const sola: Red = { tipo: 'resistencia', rotulo: 'R_1', valor: 470 };
    const { equivalente, pasos } = reducirRed(sola);
    cerca(equivalente, 470);
    expect(pasos).toHaveLength(0);
  });

  it('anida paralelos dentro de series dentro de paralelos', () => {
    // (R1 + R2) ∥ R3  =  (100 + 200) ∥ 300  =  300 ∥ 300  =  150
    const red: Red = {
      tipo: 'paralelo',
      hijos: [
        {
          tipo: 'serie',
          hijos: [
            { tipo: 'resistencia', rotulo: 'R_1', valor: 100 },
            { tipo: 'resistencia', rotulo: 'R_2', valor: 200 },
          ],
        },
        { tipo: 'resistencia', rotulo: 'R_3', valor: 300 },
      ],
    };
    cerca(reducirRed(red).equivalente, 150);
  });
});

describe('estrella y triángulo', () => {
  it('estrella equilibrada de 10 Ω da triángulo de 30 Ω', () => {
    const t = estrellaATriangulo({ a: 10, b: 10, c: 10 });
    cerca(t.ab, 30);
    cerca(t.bc, 30);
    cerca(t.ca, 30);
  });

  it('triángulo equilibrado de 30 Ω da estrella de 10 Ω', () => {
    const e = trianguloAEstrella({ ab: 30, bc: 30, ca: 30 });
    cerca(e.a, 10);
    cerca(e.b, 10);
    cerca(e.c, 10);
  });

  it('ida y vuelta devuelve los valores originales', () => {
    const original = { a: 12, b: 25, c: 40 };
    const vuelta = trianguloAEstrella(estrellaATriangulo(original));
    cerca(vuelta.a, original.a);
    cerca(vuelta.b, original.b);
    cerca(vuelta.c, original.c);
  });

  it('caso desequilibrado resuelto a mano: estrella 6, 12, 18', () => {
    // ΣRiRj = 6·12 + 12·18 + 18·6 = 72 + 216 + 108 = 396
    // Rab = 396/18 = 22 ; Rbc = 396/6 = 66 ; Rca = 396/12 = 33
    const t = estrellaATriangulo({ a: 6, b: 12, c: 18 });
    cerca(t.ab, 22);
    cerca(t.bc, 66);
    cerca(t.ca, 33);
  });

  it('rechaza una rama nula en vez de devolver infinito', () => {
    expect(() => estrellaATriangulo({ a: 0, b: 10, c: 10 })).toThrow();
  });
});

describe('sistemas lineales', () => {
  it('resuelve un 2×2 sencillo', () => {
    // 2x + y = 5 ; x − y = 1  →  x = 2, y = 1
    const x = resolverSistema(
      [
        [2, 1],
        [1, -1],
      ],
      [5, 1],
    );
    cerca(x[0]!, 2);
    cerca(x[1]!, 1);
  });

  it('resuelve un circuito de dos mallas resuelto a mano', () => {
    // Malla 1: 30·I1 − 10·I2 = 12
    // Malla 2: −10·I1 + 40·I2 = −6
    // Determinante = 1200 − 100 = 1100
    // I1 = (12·40 − (−10)(−6))/1100 = (480 − 60)/1100 = 420/1100
    // I2 = (30·(−6) − (−10)(12))/1100 = (−180 + 120)/1100 = −60/1100
    const i = resolverSistema(
      [
        [30, -10],
        [-10, 40],
      ],
      [12, -6],
    );
    cerca(i[0]!, 420 / 1100);
    cerca(i[1]!, -60 / 1100);
  });

  it('funciona con un cero en la diagonal (el pivoteo lo salva)', () => {
    // Sin pivoteo parcial este sistema rompe, aunque tiene solución única.
    const x = resolverSistema(
      [
        [0, 2],
        [3, 1],
      ],
      [4, 5],
    );
    cerca(x[0]!, 1);
    cerca(x[1]!, 2);
  });

  it('resuelve un 3×3', () => {
    const x = resolverSistema(
      [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2],
      ],
      [8, -11, -3],
    );
    cerca(x[0]!, 2);
    cerca(x[1]!, 3);
    cerca(x[2]!, -1);
  });

  it('avisa cuando la matriz es singular en vez de devolver NaN', () => {
    expect(() =>
      resolverSistema(
        [
          [1, 2],
          [2, 4],
        ],
        [3, 6],
      ),
    ).toThrow(/singular/i);
  });

  it('no modifica la matriz que recibe', () => {
    const A = [
      [2, 1],
      [1, -1],
    ];
    const copia = A.map((f) => [...f]);
    resolverSistema(A, [5, 1]);
    expect(A).toEqual(copia);
  });
});

describe('determinante', () => {
  it('2×2', () => {
    cerca(determinante([
      [3, 8],
      [4, 6],
    ]), -14);
  });

  it('3×3', () => {
    cerca(determinante([
      [6, 1, 1],
      [4, -2, 5],
      [2, 8, 7],
    ]), -306);
  });

  it('da cero si hay filas dependientes', () => {
    expect(determinante([
      [1, 2],
      [2, 4],
    ])).toBe(0);
  });

  it('el intercambio de filas cambia el signo', () => {
    const a = determinante([
      [3, 8],
      [4, 6],
    ]);
    const b = determinante([
      [4, 6],
      [3, 8],
    ]);
    cerca(a, -b);
  });
});

describe('leyes de Kirchhoff', () => {
  it('marca como correcto un nudo que cierra', () => {
    const r = verificarKirchhoff(
      [
        {
          nombre: 'A',
          corrientes: [
            { rama: 'I1', valor: 0.5 },
            { rama: 'I2', valor: -0.2 },
            { rama: 'I3', valor: -0.3 },
          ],
        },
      ],
      [],
    );
    expect(r.nudos[0]!.cierra).toBe(true);
    expect(r.todoCierra).toBe(true);
  });

  it('señala cuál nudo no cierra y por cuánto', () => {
    const r = verificarKirchhoff(
      [
        { nombre: 'A', corrientes: [{ rama: 'I1', valor: 0.5 }, { rama: 'I2', valor: -0.5 }] },
        { nombre: 'B', corrientes: [{ rama: 'I3', valor: 0.5 }, { rama: 'I4', valor: -0.4 }] },
      ],
      [],
    );
    expect(r.nudos[0]!.cierra).toBe(true);
    expect(r.nudos[1]!.cierra).toBe(false);
    cerca(r.nudos[1]!.suma, 0.1);
    expect(r.todoCierra).toBe(false);
  });

  it('tolera el redondeo del alumno a mA', () => {
    // 0,333 + 0,333 + 0,334 = 1,000 exacto; con 0,3333 queda un resto chico.
    const r = verificarKirchhoff(
      [{ nombre: 'A', corrientes: [{ rama: 'I1', valor: 1 }, { rama: 'I2', valor: -0.9995 }] }],
      [],
    );
    expect(r.nudos[0]!.cierra).toBe(true);
  });

  it('verifica mallas además de nudos', () => {
    const r = verificarKirchhoff(
      [],
      [
        {
          nombre: 'Malla 1',
          tensiones: [
            { elemento: 'fuente', valor: 12 },
            { elemento: 'R1', valor: -5 },
            { elemento: 'R2', valor: -7 },
          ],
        },
      ],
    );
    expect(r.mallas[0]!.cierra).toBe(true);
  });
});
