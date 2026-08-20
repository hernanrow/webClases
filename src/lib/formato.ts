/**
 * Formato de magnitudes para pantalla.
 *
 * Todo valor que se muestre pasa por acá (CLAUDE.md §12): notación ingenieril,
 * unidad correcta y cifras significativas coherentes.
 *
 * **Separador decimal: coma.** Es el que usan en la carpeta y en el pizarrón, y
 * el que usa el propio texto de los apuntes. `toFixed()` devuelve punto siempre,
 * así que hay que convertir a mano — no alcanza con confiar en el locale del
 * navegador, que depende de la configuración del celular de cada alumno.
 */

/** Prefijos del SI en pasos de 10³. */
const PREFIJOS: Record<number, string> = {
  [-12]: 'p',
  [-9]: 'n',
  [-6]: 'µ',
  [-3]: 'm',
  [0]: '',
  [3]: 'k',
  [6]: 'M',
  [9]: 'G',
};

const EXP_MIN = -12;
const EXP_MAX = 9;

/**
 * Notación ingenieril: el exponente siempre múltiplo de 3, con el prefijo del SI.
 *
 * @param valor  magnitud en unidades base (ohm, volt, ampere, ...)
 * @param unidad símbolo de la unidad: 'Ω', 'V', 'A', 'F', 'H', 'W'
 * @param cifras cifras significativas
 *
 * @example ingenieril(0.0409, 'A')  // "40,9 mA"
 * @example ingenieril(1200, 'Ω')    // "1,20 kΩ"
 */
export function ingenieril(valor: number, unidad: string, cifras = 3): string {
  if (!Number.isFinite(valor)) return `— ${unidad}`;
  if (valor === 0) return `0 ${unidad}`;

  const signo = valor < 0 ? '−' : ''; // signo menos tipográfico, no guion
  const abs = Math.abs(valor);

  let exp = Math.floor(Math.log10(abs) / 3) * 3;
  exp = Math.min(EXP_MAX, Math.max(EXP_MIN, exp));

  // Se redondea primero y se cuentan los dígitos después. Al revés no funciona:
  // 999,7 Ω con 3 cifras redondea a 1000, que hay que mostrar como 1,00 kΩ, y
  // contar los enteros sobre la mantisa sin redondear daría 1,000 kΩ.
  let significativo = Number((abs / 10 ** exp).toPrecision(cifras));

  if (significativo >= 1000 && exp < EXP_MAX) {
    exp += 3;
    significativo = Number((abs / 10 ** exp).toPrecision(cifras));
  }

  const enteros = Math.max(1, Math.floor(Math.log10(significativo)) + 1);
  const decimales = Math.max(0, cifras - enteros);

  return `${signo}${coma(significativo.toFixed(decimales))} ${PREFIJOS[exp] ?? ''}${unidad}`;
}

/**
 * Un número suelto, sin unidad, con coma decimal y la cantidad de cifras
 * significativas pedida. Para los desarrollos paso a paso.
 */
export function numero(valor: number, cifras = 4): string {
  if (!Number.isFinite(valor)) return '—';
  if (valor === 0) return '0';
  const redondeado = Number(valor.toPrecision(cifras));
  return coma(String(redondeado)).replace('-', '−');
}

/** Cambia el punto decimal por coma. */
export function coma(texto: string): string {
  return texto.replace('.', ',');
}

/** Lee un número escrito con coma o con punto. Devuelve null si no es válido. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.').replace('−', '-');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}
