import { describe, it, expect } from 'vitest';
import { COLORES, leerBandas, calcularBandas, valorComercial, E24 } from './colores';

/** Índice de un color por nombre, para que los tests se lean como el pizarrón. */
const c = (nombre: string) => {
  const i = COLORES.findIndex((x) => x.nombre === nombre);
  if (i < 0) throw new Error(`No existe el color ${nombre}`);
  return i;
};

describe('bandas → valor, 4 bandas', () => {
  it('marrón negro rojo oro = 1 kΩ ±5 %', () => {
    const r = leerBandas([c('marrón'), c('negro'), c('rojo'), c('oro')]);
    expect(r.valor).toBe(1000);
    expect(r.tolerancia).toBe(5);
  });

  it('amarillo violeta rojo oro = 4,7 kΩ ±5 %', () => {
    const r = leerBandas([c('amarillo'), c('violeta'), c('rojo'), c('oro')]);
    expect(r.valor).toBe(4700);
    expect(r.tolerancia).toBe(5);
  });

  it('rojo rojo marrón oro = 220 Ω ±5 %', () => {
    expect(leerBandas([c('rojo'), c('rojo'), c('marrón'), c('oro')]).valor).toBe(220);
  });

  it('marrón negro negro oro = 10 Ω', () => {
    expect(leerBandas([c('marrón'), c('negro'), c('negro'), c('oro')]).valor).toBe(10);
  });

  it('el multiplicador oro divide por 10: amarillo violeta oro oro = 4,7 Ω', () => {
    // Es el caso donde el punto flotante muerde: 47 · 0,1 da 4,7000000000000005.
    expect(leerBandas([c('amarillo'), c('violeta'), c('oro'), c('oro')]).valor).toBe(4.7);
  });

  it('el multiplicador plata divide por 100', () => {
    expect(leerBandas([c('marrón'), c('negro'), c('plata'), c('oro')]).valor).toBe(0.1);
  });

  it('calcula el rango de tolerancia', () => {
    const r = leerBandas([c('marrón'), c('negro'), c('rojo'), c('oro')]);
    expect(r.minimo).toBe(950);
    expect(r.maximo).toBe(1050);
  });
});

describe('bandas → valor, 5 bandas', () => {
  it('marrón negro negro marrón marrón = 1 kΩ ±1 %', () => {
    const r = leerBandas([c('marrón'), c('negro'), c('negro'), c('marrón'), c('marrón')]);
    expect(r.valor).toBe(1000);
    expect(r.tolerancia).toBe(1);
  });

  it('amarillo violeta negro marrón marrón = 4,7 kΩ ±1 %', () => {
    expect(
      leerBandas([c('amarillo'), c('violeta'), c('negro'), c('marrón'), c('marrón')]).valor,
    ).toBe(4700);
  });

  it('el tercer dígito sirve: rojo rojo rojo negro marrón = 222 Ω', () => {
    expect(leerBandas([c('rojo'), c('rojo'), c('rojo'), c('negro'), c('marrón')]).valor).toBe(222);
  });
});

describe('bandas imposibles', () => {
  it('el oro no puede ser dígito', () => {
    expect(() => leerBandas([c('oro'), c('negro'), c('rojo'), c('oro')])).toThrow(/dígito/i);
  });

  it('el naranja no puede ser tolerancia', () => {
    expect(() => leerBandas([c('marrón'), c('negro'), c('rojo'), c('naranja')])).toThrow(
      /tolerancia/i,
    );
  });

  it('rechaza 3 o 6 bandas', () => {
    expect(() => leerBandas([0, 1, 2])).toThrow();
    expect(() => leerBandas([0, 1, 2, 3, 4, 5])).toThrow();
  });
});

describe('valor → bandas', () => {
  it('1 kΩ con 4 bandas da marrón negro rojo oro', () => {
    expect(calcularBandas(1000, 4)).toEqual([c('marrón'), c('negro'), c('rojo'), c('oro')]);
  });

  it('4,7 kΩ con 4 bandas', () => {
    expect(calcularBandas(4700, 4)).toEqual([c('amarillo'), c('violeta'), c('rojo'), c('oro')]);
  });

  it('220 Ω con 4 bandas', () => {
    expect(calcularBandas(220, 4)).toEqual([c('rojo'), c('rojo'), c('marrón'), c('oro')]);
  });

  it('4,7 Ω usa el multiplicador oro', () => {
    expect(calcularBandas(4.7, 4)).toEqual([c('amarillo'), c('violeta'), c('oro'), c('oro')]);
  });

  it('1 kΩ con 5 bandas y 1 % de tolerancia', () => {
    expect(calcularBandas(1000, 5, 1)).toEqual([
      c('marrón'),
      c('negro'),
      c('negro'),
      c('marrón'),
      c('marrón'),
    ]);
  });

  it('devuelve null si el valor no entra en el código', () => {
    expect(calcularBandas(1234, 4)).toBeNull(); // 4 dígitos significativos
    expect(calcularBandas(0, 4)).toBeNull();
    expect(calcularBandas(-100, 4)).toBeNull();
    expect(calcularBandas(NaN, 4)).toBeNull();
  });

  it('devuelve null con una tolerancia que ningún color representa', () => {
    expect(calcularBandas(1000, 4, 3)).toBeNull();
  });
});

describe('ida y vuelta', () => {
  it('todo valor de la serie E24 vuelve igual con 4 bandas', () => {
    for (const base of E24) {
      for (const decada of [1, 10, 100, 1000, 10_000, 100_000]) {
        const valor = Number((base * decada).toPrecision(12));
        const bandas = calcularBandas(valor, 4);
        expect(bandas, `no se pudo codificar ${valor} Ω`).not.toBeNull();
        expect(leerBandas(bandas!).valor, `${valor} Ω no volvió igual`).toBe(valor);
      }
    }
  });
});

describe('valores comerciales para ejercicios', () => {
  it('la misma semilla da siempre el mismo valor', () => {
    expect(valorComercial(7)).toBe(valorComercial(7));
  });

  it('semillas distintas dan valores distintos', () => {
    const valores = new Set([0, 1, 2, 3, 4, 5].map(valorComercial));
    expect(valores.size).toBeGreaterThan(1);
  });

  it('siempre devuelve un valor que existe en el código de colores', () => {
    for (let s = 0; s < 60; s++) {
      expect(calcularBandas(valorComercial(s), 4), `semilla ${s}`).not.toBeNull();
    }
  });
});
