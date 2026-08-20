import { describe, it, expect } from 'vitest';
import {
  pulsacion,
  periodo,
  eficaz,
  picoAPico,
  valorInstantaneo,
  fasor,
  senoideDeFasor,
  sumarSenoides,
  reactanciaInductiva,
  reactanciaCapacitiva,
  impedancia,
  resonanciaSerie,
  potenciasDe,
  capacidadParaCorregir,
  type Senoide,
} from './ca';
import { complejo, modulo, argumentoGrados } from './complejos';

const cerca = (real: number, esperado: number, tol = 1e-6) =>
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(Math.abs(esperado) * tol + 1e-9);

describe('senoides', () => {
  it('ω = 2πf: a 50 Hz son 314 rad/s', () => {
    cerca(pulsacion(50), 314.159265, 1e-6);
  });

  it('T = 1/f: a 50 Hz son 20 ms', () => {
    cerca(periodo(50), 0.02);
  });

  it('el eficaz es el pico sobre raíz de dos', () => {
    cerca(eficaz(311.13), 220, 1e-4);
  });

  it('la red domiciliaria: 220 V eficaces son 311 V de pico', () => {
    cerca(220 * Math.SQRT2, 311.126984, 1e-6);
  });

  it('el pico a pico es el doble del pico', () => {
    cerca(picoAPico(311), 622);
  });

  it('v(t) arranca en cero si la fase es cero', () => {
    cerca(valorInstantaneo({ amplitud: 10, frecuencia: 50, fase: 0 }, 0), 0);
  });

  it('con fase de 90 grados arranca en el máximo', () => {
    cerca(valorInstantaneo({ amplitud: 10, frecuencia: 50, fase: 90 }, 0), 10);
  });

  it('a un cuarto de período está en el máximo', () => {
    const s: Senoide = { amplitud: 10, frecuencia: 50, fase: 0 };
    cerca(valorInstantaneo(s, 0.005), 10);
  });

  it('a medio período vuelve a cero', () => {
    const s: Senoide = { amplitud: 10, frecuencia: 50, fase: 0 };
    expect(Math.abs(valorInstantaneo(s, 0.01))).toBeLessThan(1e-9);
  });
});

describe('fasores', () => {
  it('el módulo del fasor es el valor eficaz', () => {
    cerca(modulo(fasor({ amplitud: 311.13, frecuencia: 50, fase: 0 })), 220, 1e-4);
  });

  it('el argumento del fasor es la fase', () => {
    cerca(argumentoGrados(fasor({ amplitud: 10, frecuencia: 50, fase: 30 })), 30, 1e-9);
  });

  it('ida y vuelta conserva la senoide', () => {
    const s: Senoide = { amplitud: 10, frecuencia: 50, fase: 30 };
    const vuelta = senoideDeFasor(fasor(s), 50);
    cerca(vuelta.amplitud, s.amplitud);
    cerca(vuelta.fase, s.fase, 1e-9);
  });
});

describe('suma de senoides', () => {
  it('dos en fase se suman las amplitudes', () => {
    const r = sumarSenoides(
      { amplitud: 10, frecuencia: 50, fase: 0 },
      { amplitud: 5, frecuencia: 50, fase: 0 },
    );
    cerca(r.amplitud, 15);
    cerca(r.fase, 0, 1e-9);
  });

  it('dos en contrafase se restan', () => {
    const r = sumarSenoides(
      { amplitud: 10, frecuencia: 50, fase: 0 },
      { amplitud: 4, frecuencia: 50, fase: 180 },
    );
    cerca(r.amplitud, 6);
  });

  it('dos iguales en contrafase se cancelan', () => {
    const r = sumarSenoides(
      { amplitud: 10, frecuencia: 50, fase: 0 },
      { amplitud: 10, frecuencia: 50, fase: 180 },
    );
    expect(r.amplitud).toBeLessThan(1e-9);
  });

  it('a 90 grados la suma es la hipotenusa, no la suma aritmética', () => {
    // Es el resultado que sorprende: 3 y 4 desfasadas 90° dan 5, no 7.
    const r = sumarSenoides(
      { amplitud: 3, frecuencia: 50, fase: 0 },
      { amplitud: 4, frecuencia: 50, fase: 90 },
    );
    cerca(r.amplitud, 5);
    cerca(r.fase, 53.130102, 1e-5);
  });

  it('la suma coincide con sumar punto a punto en el tiempo', () => {
    const a: Senoide = { amplitud: 7, frecuencia: 50, fase: 20 };
    const b: Senoide = { amplitud: 4, frecuencia: 50, fase: -50 };
    const s = sumarSenoides(a, b);
    for (const t of [0, 0.003, 0.007, 0.013, 0.019]) {
      cerca(valorInstantaneo(s, t), valorInstantaneo(a, t) + valorInstantaneo(b, t), 1e-6);
    }
  });

  it('se niega a sumar frecuencias distintas', () => {
    expect(() =>
      sumarSenoides(
        { amplitud: 1, frecuencia: 50, fase: 0 },
        { amplitud: 1, frecuencia: 60, fase: 0 },
      ),
    ).toThrow(/misma frecuencia/i);
  });
});

describe('reactancias', () => {
  it('la inductiva crece con la frecuencia', () => {
    expect(reactanciaInductiva(0.1, 100)).toBeGreaterThan(reactanciaInductiva(0.1, 50));
  });

  it('la capacitiva baja con la frecuencia', () => {
    expect(reactanciaCapacitiva(1e-6, 100)).toBeLessThan(reactanciaCapacitiva(1e-6, 50));
  });

  it('una bobina de 100 mH a 50 Hz da 31,4 Ω', () => {
    cerca(reactanciaInductiva(0.1, 50), 31.4159265, 1e-6);
  });

  it('un capacitor de 10 µF a 50 Hz da 318 Ω', () => {
    cerca(reactanciaCapacitiva(10e-6, 50), 318.309886, 1e-6);
  });

  it('en continua la bobina es un cable y el capacitor un circuito abierto', () => {
    cerca(reactanciaInductiva(0.1, 0), 0);
    expect(reactanciaCapacitiva(10e-6, 0)).toBe(Infinity);
  });
});

describe('impedancia en serie', () => {
  it('R-L: la reactancia va sumando en el eje imaginario', () => {
    const { z, caracter } = impedancia({ r: 30, l: 0.1, c: 0, f: 50, conexion: 'serie' });
    cerca(z.re, 30);
    cerca(z.im, 31.4159265, 1e-6);
    expect(caracter).toBe('inductivo');
  });

  it('R-C: la reactancia resta', () => {
    const { z, caracter } = impedancia({ r: 100, l: 0, c: 10e-6, f: 50, conexion: 'serie' });
    cerca(z.re, 100);
    cerca(z.im, -318.309886, 1e-6);
    expect(caracter).toBe('capacitivo');
  });

  it('R-L-C con las reactancias iguales queda resistivo puro', () => {
    // A 50 Hz, L = 0,1 H da 31,416 Ω. El C que da lo mismo es 1/(ω·31,416).
    const l = 0.1;
    const f = 50;
    const w = 2 * Math.PI * f;
    const c = 1 / (w * (w * l));
    const { z, caracter, desfasaje } = impedancia({ r: 47, l, c, f, conexion: 'serie' });
    cerca(z.re, 47);
    expect(Math.abs(z.im)).toBeLessThan(1e-9);
    expect(caracter).toBe('resistivo');
    cerca(desfasaje, 0, 1e-9);
  });

  it('el módulo es la hipotenusa de R y X', () => {
    const { z } = impedancia({ r: 30, l: 0, c: 0, f: 50, conexion: 'serie' });
    cerca(modulo(z), 30);
    const rl = impedancia({ r: 30, l: 40 / (2 * Math.PI * 50), c: 0, f: 50, conexion: 'serie' });
    cerca(modulo(rl.z), 50, 1e-6); // triángulo 30-40-50
  });

  it('el factor de potencia de un resistivo puro es 1', () => {
    const { factorDePotencia } = impedancia({ r: 100, l: 0, c: 0, f: 50, conexion: 'serie' });
    cerca(factorDePotencia, 1);
  });
});

describe('impedancia en paralelo', () => {
  it('dos resistencias en paralelo', () => {
    const { z } = impedancia({ r: 100, l: 0, c: 0, f: 50, conexion: 'paralelo' });
    cerca(z.re, 100); // una sola rama
  });

  it('R en paralelo con L da una impedancia menor que R', () => {
    const { z } = impedancia({ r: 100, l: 0.1, c: 0, f: 50, conexion: 'paralelo' });
    expect(modulo(z)).toBeLessThan(100);
  });

  it('R ∥ L es inductivo, igual que en serie', () => {
    const { caracter } = impedancia({ r: 100, l: 0.1, c: 0, f: 50, conexion: 'paralelo' });
    expect(caracter).toBe('inductivo');
  });

  it('el tanque LC en resonancia es un circuito abierto, no un error', () => {
    const f = 50;
    const l = 0.1;
    const w = 2 * Math.PI * f;
    const c = 1 / (w * (w * l));
    // Sin resistencia, las admitancias se cancelan exacto: Z → ∞.
    const { z, caracter } = impedancia({ r: 0, l, c, f, conexion: 'paralelo' });
    expect(modulo(z)).toBe(Infinity);
    expect(caracter).toBe('resistivo');
  });

  it('cerca de la resonancia el tanque tiene impedancia grande pero finita', () => {
    const f = 50;
    const l = 0.1;
    const w = 2 * Math.PI * f;
    const c = 1 / (w * (w * l));
    const { z } = impedancia({ r: 0, l, c: c * 1.01, f, conexion: 'paralelo' });
    expect(Number.isFinite(modulo(z))).toBe(true);
    expect(modulo(z)).toBeGreaterThan(1000);
  });

  it('con una resistencia en paralelo el tanque ya no es infinito', () => {
    const f = 50;
    const l = 0.1;
    const w = 2 * Math.PI * f;
    const c = 1 / (w * (w * l));
    const { z } = impedancia({ r: 10000, l, c, f, conexion: 'paralelo' });
    cerca(modulo(z), 10000, 1e-6);
  });
});

describe('resonancia serie', () => {
  const r = 10;
  const l = 0.1;
  const c = 10e-6;

  it('f₀ = 1/(2π√(LC))', () => {
    const { f0 } = resonanciaSerie(r, l, c);
    cerca(f0, 1 / (2 * Math.PI * Math.sqrt(l * c)), 1e-9);
    cerca(f0, 159.15494, 1e-5);
  });

  it('en f₀ las reactancias se cancelan y la impedancia es R pura', () => {
    const { f0, zEnResonancia } = resonanciaSerie(r, l, c);
    const { z, caracter } = impedancia({ r, l, c, f: f0, conexion: 'serie' });
    expect(Math.abs(z.im)).toBeLessThan(1e-6);
    cerca(z.re, r);
    cerca(zEnResonancia, r);
    expect(caracter).toBe('resistivo');
  });

  it('la impedancia en f₀ es mínima', () => {
    const { f0 } = resonanciaSerie(r, l, c);
    const zEn = modulo(impedancia({ r, l, c, f: f0, conexion: 'serie' }).z);
    for (const factor of [0.5, 0.9, 1.1, 2]) {
      const otra = modulo(impedancia({ r, l, c, f: f0 * factor, conexion: 'serie' }).z);
      expect(otra).toBeGreaterThan(zEn);
    }
  });

  it('por debajo de f₀ el circuito es capacitivo y por encima inductivo', () => {
    const { f0 } = resonanciaSerie(r, l, c);
    expect(impedancia({ r, l, c, f: f0 * 0.5, conexion: 'serie' }).caracter).toBe('capacitivo');
    expect(impedancia({ r, l, c, f: f0 * 2, conexion: 'serie' }).caracter).toBe('inductivo');
  });

  it('Q = (1/R)·√(L/C) y BW = f₀/Q', () => {
    const { f0, q, anchoDeBanda } = resonanciaSerie(r, l, c);
    cerca(q, Math.sqrt(l / c) / r, 1e-9);
    cerca(anchoDeBanda, f0 / q, 1e-9);
  });

  it('más resistencia baja el Q y ensancha la curva', () => {
    const agudo = resonanciaSerie(1, l, c);
    const chato = resonanciaSerie(100, l, c);
    expect(agudo.q).toBeGreaterThan(chato.q);
    expect(agudo.anchoDeBanda).toBeLessThan(chato.anchoDeBanda);
  });

  it('la media geométrica de las frecuencias de corte da f₀', () => {
    const { f0, fInferior, fSuperior } = resonanciaSerie(r, l, c);
    cerca(Math.sqrt(fInferior * fSuperior), f0, 1e-9);
  });

  it('la diferencia entre cortes es el ancho de banda', () => {
    const { fInferior, fSuperior, anchoDeBanda } = resonanciaSerie(r, l, c);
    cerca(fSuperior - fInferior, anchoDeBanda, 1e-6);
  });

  it('en las frecuencias de corte el módulo es √2 veces el de resonancia', () => {
    const { fInferior, fSuperior } = resonanciaSerie(r, l, c);
    for (const f of [fInferior, fSuperior]) {
      cerca(modulo(impedancia({ r, l, c, f, conexion: 'serie' }).z), r * Math.SQRT2, 1e-6);
    }
  });

  it('sin bobina o sin capacitor no hay resonancia', () => {
    expect(() => resonanciaSerie(r, 0, c)).toThrow();
    expect(() => resonanciaSerie(r, l, 0)).toThrow();
  });
});

describe('triángulo de potencias', () => {
  it('un resistivo puro no tiene reactiva', () => {
    const { p, q, s, factorDePotencia } = potenciasDe(220, complejo(100, 0));
    cerca(p, (220 * 220) / 100);
    expect(Math.abs(q)).toBeLessThan(1e-9);
    cerca(s, p);
    cerca(factorDePotencia, 1);
  });

  it('se cumple Pitágoras: S² = P² + Q²', () => {
    const { p, q, s } = potenciasDe(220, complejo(30, 40));
    cerca(Math.sqrt(p * p + q * q), s, 1e-9);
  });

  it('un inductivo tiene reactiva positiva', () => {
    const { q } = potenciasDe(220, complejo(30, 40));
    expect(q).toBeGreaterThan(0);
  });

  it('un capacitivo tiene reactiva negativa', () => {
    const { q } = potenciasDe(220, complejo(30, -40));
    expect(q).toBeLessThan(0);
  });

  it('caso resuelto a mano: 220 V sobre 30 + j40', () => {
    // |Z| = 50 Ω → I = 4,4 A → S = 968 VA, cos φ = 0,6 → P = 580,8 W, Q = 774,4 var
    const { p, q, s, factorDePotencia } = potenciasDe(220, complejo(30, 40));
    cerca(s, 968, 1e-6);
    cerca(factorDePotencia, 0.6, 1e-9);
    cerca(p, 580.8, 1e-6);
    cerca(q, 774.4, 1e-6);
  });

  it('avisa si la impedancia es nula', () => {
    expect(() => potenciasDe(220, complejo(0, 0))).toThrow();
  });
});

describe('corrección del factor de potencia', () => {
  it('con capacitores se llega al cos φ objetivo', () => {
    const p0 = potenciasDe(220, complejo(30, 40)); // cos φ = 0,6
    const c = capacidadParaCorregir(p0, 0.95, 220, 50);
    expect(c).toBeGreaterThan(0);

    // Con el capacitor puesto, la reactiva baja a la del objetivo.
    const qCompensada = p0.q - c * 2 * Math.PI * 50 * 220 * 220;
    const cosFiNuevo = Math.cos(Math.atan2(qCompensada, p0.p));
    cerca(cosFiNuevo, 0.95, 1e-6);
  });

  it('si ya está mejor que el objetivo, no hace falta capacitor', () => {
    const p0 = potenciasDe(220, complejo(100, 5)); // casi resistivo
    expect(capacidadParaCorregir(p0, 0.8, 220, 50)).toBe(0);
  });

  it('rechaza un objetivo imposible', () => {
    const p0 = potenciasDe(220, complejo(30, 40));
    expect(() => capacidadParaCorregir(p0, 1.5, 220, 50)).toThrow();
    expect(() => capacidadParaCorregir(p0, 0, 220, 50)).toThrow();
  });
});
