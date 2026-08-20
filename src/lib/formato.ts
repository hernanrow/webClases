/**
 * Notación ingenieril: el exponente siempre múltiplo de 3, con el prefijo del SI.
 * Todo valor que se muestre en pantalla pasa por acá (ver CLAUDE.md §12).
 */
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

/**
 * @param valor   magnitud en unidades base (ohm, volt, ampere, ...)
 * @param unidad  símbolo de la unidad: 'Ω', 'V', 'A', 'F', 'H', 'W'
 * @param cifras  cifras significativas
 */
export function ingenieril(valor: number, unidad: string, cifras = 3): string {
  if (!Number.isFinite(valor)) return `— ${unidad}`;
  if (valor === 0) return `0 ${unidad}`;

  const signo = valor < 0 ? '-' : '';
  const abs = Math.abs(valor);

  let exp = Math.floor(Math.log10(abs) / 3) * 3;
  exp = Math.min(9, Math.max(-12, exp));

  const mantisa = abs / 10 ** exp;
  // Redondear a `cifras` significativas sobre la mantisa (siempre 1 ≤ m < 1000).
  const enteros = Math.floor(Math.log10(mantisa)) + 1;
  const decimales = Math.max(0, cifras - enteros);

  return `${signo}${mantisa.toFixed(decimales)} ${PREFIJOS[exp] ?? ''}${unidad}`;
}
