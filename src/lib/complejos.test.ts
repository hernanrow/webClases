import { describe, it, expect } from 'vitest';
import {
  complejo,
  desdePolarGrados,
  sumar,
  restar,
  multiplicar,
  dividir,
  conjugado,
  inverso,
  modulo,
  argumentoGrados,
  paraleloComplejo,
  iguales,
  binomica,
  polar,
  aGrados,
  aRadianes,
} from './complejos';

const cerca = (real: number, esperado: number, tol = 1e-9) =>
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(Math.abs(esperado) * tol + 1e-9);

describe('aritmética básica', () => {
  it('suma componente a componente', () => {
    expect(sumar(complejo(3, 4), complejo(1, -2))).toEqual({ re: 4, im: 2 });
  });

  it('resta componente a componente', () => {
    expect(restar(complejo(3, 4), complejo(1, -2))).toEqual({ re: 2, im: 6 });
  });

  it('multiplica: (3+j4)(1+j2) = −5 + j10', () => {
    expect(multiplicar(complejo(3, 4), complejo(1, 2))).toEqual({ re: -5, im: 10 });
  });

  it('j al cuadrado es −1', () => {
    expect(multiplicar(complejo(0, 1), complejo(0, 1))).toEqual({ re: -1, im: 0 });
  });

  it('divide: (3+j4)/(1+j2) = 2,2 − j0,4', () => {
    const z = dividir(complejo(3, 4), complejo(1, 2));
    cerca(z.re, 2.2);
    cerca(z.im, -0.4);
  });

  it('dividir y multiplicar son inversas', () => {
    const a = complejo(7, -3);
    const b = complejo(2, 5);
    expect(iguales(multiplicar(dividir(a, b), b), a)).toBe(true);
  });

  it('avisa al dividir por cero en vez de devolver NaN', () => {
    expect(() => dividir(complejo(1, 1), complejo(0, 0))).toThrow();
  });

  it('el conjugado da vuelta la parte imaginaria', () => {
    expect(conjugado(complejo(3, 4))).toEqual({ re: 3, im: -4 });
  });

  it('z por su conjugado da el módulo al cuadrado, real', () => {
    const z = complejo(3, 4);
    const p = multiplicar(z, conjugado(z));
    cerca(p.re, 25);
    cerca(p.im, 0);
  });

  it('el inverso de j es −j', () => {
    expect(iguales(inverso(complejo(0, 1)), complejo(0, -1))).toBe(true);
  });
});

describe('módulo y argumento', () => {
  it('el triángulo 3-4-5', () => {
    cerca(modulo(complejo(3, 4)), 5);
  });

  it('un real puro tiene argumento cero', () => {
    cerca(argumentoGrados(complejo(5, 0)), 0);
  });

  it('j puro está a 90 grados', () => {
    cerca(argumentoGrados(complejo(0, 1)), 90);
  });

  it('−j puro está a −90 grados', () => {
    cerca(argumentoGrados(complejo(0, -1)), -90);
  });

  it('1 + j está a 45 grados', () => {
    cerca(argumentoGrados(complejo(1, 1)), 45);
  });

  it('el tercer cuadrante da ángulo negativo, no 225 grados', () => {
    cerca(argumentoGrados(complejo(-1, -1)), -135);
  });
});

describe('conversión polar y binómica', () => {
  it('5 a 53,13 grados da 3 + j4', () => {
    const z = desdePolarGrados(5, 53.13010235);
    cerca(z.re, 3, 1e-6);
    cerca(z.im, 4, 1e-6);
  });

  it('ida y vuelta conserva el número', () => {
    const original = complejo(12, -5);
    const vuelta = desdePolarGrados(modulo(original), argumentoGrados(original));
    expect(iguales(vuelta, original, 1e-9)).toBe(true);
  });

  it('grados y radianes se convierten en los dos sentidos', () => {
    cerca(aGrados(Math.PI), 180);
    cerca(aRadianes(180), Math.PI);
    cerca(aGrados(aRadianes(37)), 37);
  });
});

describe('paralelo de complejos', () => {
  it('dos resistencias iguales dan la mitad', () => {
    const z = paraleloComplejo(complejo(100), complejo(100));
    cerca(z.re, 50);
    cerca(z.im, 0);
  });

  it('una resistencia con una reactancia inductiva igual', () => {
    // 100 ∥ j100 = (100·j100)/(100+j100) = 50 + j50
    const z = paraleloComplejo(complejo(100), complejo(0, 100));
    cerca(z.re, 50);
    cerca(z.im, 50);
  });

  it('una rama en cortocircuito anula el paralelo', () => {
    const z = paraleloComplejo(complejo(100), complejo(0, 0));
    cerca(modulo(z), 0);
  });

  it('el módulo del paralelo es menor que el de cualquier rama resistiva', () => {
    const z = paraleloComplejo(complejo(470), complejo(1200));
    expect(modulo(z)).toBeLessThan(470);
  });
});

describe('cómo se escriben en pantalla', () => {
  it('binómica con el signo afuera de la j', () => {
    expect(binomica(complejo(12, 5), 'Ω')).toBe('12,0 Ω + j5,00 Ω');
    expect(binomica(complejo(12, -5), 'Ω')).toBe('12,0 Ω − j5,00 Ω');
  });

  it('nunca escribe "j−5"', () => {
    expect(binomica(complejo(1, -5))).not.toContain('j−');
    expect(binomica(complejo(1, -5))).not.toContain('j-');
  });

  it('polar con módulo y ángulo en grados', () => {
    expect(polar(complejo(3, 4), 'Ω')).toBe('5,00 Ω ∠ 53,1°');
  });

  it('el ángulo negativo usa el menos tipográfico', () => {
    expect(polar(complejo(3, -4), 'Ω')).toBe('5,00 Ω ∠ −53,1°');
  });

  it('usa coma decimal', () => {
    expect(binomica(complejo(1.5, 2.5))).toContain(',');
    expect(binomica(complejo(1.5, 2.5))).not.toContain('.');
  });
});
