import { describe, it, expect } from 'vitest';
import { ingenieril, numero, coma, leerNumero } from './formato';

describe('notación ingenieril', () => {
  it('usa coma decimal, no punto', () => {
    expect(ingenieril(0.0409090909, 'A')).toBe('40,9 mA');
    expect(ingenieril(1200, 'Ω')).toBe('1,20 kΩ');
  });

  it('elige el prefijo del SI que deja la mantisa entre 1 y 1000', () => {
    expect(ingenieril(0.000_047, 'F')).toBe('47,0 µF');
    expect(ingenieril(2_200_000, 'Ω')).toBe('2,20 MΩ');
    expect(ingenieril(0.000_000_1, 'F')).toBe('100 nF');
    expect(ingenieril(470, 'Ω')).toBe('470 Ω');
  });

  it('respeta las cifras significativas pedidas', () => {
    expect(ingenieril(0.0409090909, 'A', 4)).toBe('40,91 mA');
    expect(ingenieril(0.0409090909, 'A', 2)).toBe('41 mA');
  });

  it('sube de escalón cuando el redondeo empuja la mantisa a 1000', () => {
    // 999,7 Ω con 3 cifras redondea a 1000, que debe leerse 1,00 kΩ.
    expect(ingenieril(999.7, 'Ω')).toBe('1,00 kΩ');
  });

  it('usa el signo menos tipográfico, no el guion', () => {
    expect(ingenieril(-0.005, 'A')).toBe('−5,00 mA');
  });

  it('el cero no lleva prefijo', () => {
    expect(ingenieril(0, 'V')).toBe('0 V');
  });

  it('no rompe con infinito ni NaN', () => {
    expect(ingenieril(Infinity, 'Ω')).toBe('— Ω');
    expect(ingenieril(NaN, 'V')).toBe('— V');
  });

  it('coincide con el ejemplo resuelto del apunte de ley de Ohm', () => {
    // 9 V / 220 Ω = 40,9 mA, y P = 368 mW
    expect(ingenieril(9 / 220, 'A')).toBe('40,9 mA');
    expect(ingenieril(9 * (9 / 220), 'W')).toBe('368 mW');
  });
});

describe('numero', () => {
  it('usa coma decimal', () => {
    expect(numero(1.5)).toBe('1,5');
  });

  it('recorta a las cifras significativas pedidas', () => {
    expect(numero(1 / 3, 3)).toBe('0,333');
  });

  it('los enteros no llevan coma', () => {
    expect(numero(220)).toBe('220');
  });

  it('usa el signo menos tipográfico', () => {
    expect(numero(-4.5)).toBe('−4,5');
  });
});

describe('lectura de números escritos por el alumno', () => {
  it('acepta coma, que es como los escriben', () => {
    expect(leerNumero('1,5')).toBe(1.5);
  });

  it('acepta punto también', () => {
    expect(leerNumero('1.5')).toBe(1.5);
  });

  it('ignora espacios de más', () => {
    expect(leerNumero('  220  ')).toBe(220);
  });

  it('devuelve null con texto vacío o basura, no NaN', () => {
    expect(leerNumero('')).toBeNull();
    expect(leerNumero('abc')).toBeNull();
    expect(leerNumero('12ohm')).toBeNull();
  });

  it('ida y vuelta con coma()', () => {
    expect(leerNumero(coma('40.91'))).toBeCloseTo(40.91);
  });
});
