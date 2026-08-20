import { useState } from 'preact/hooks';
import {
  COLORES,
  leerBandas,
  calcularBandas,
  INDICES_DIGITO,
  INDICES_MULTIPLICADOR,
  INDICES_TOLERANCIA,
  type CantidadBandas,
} from '../../lib/colores';
import { ingenieril, leerNumero } from '../../lib/formato';

/**
 * Resistencia dibujada en SVG con las bandas editables. Funciona en los dos
 * sentidos: bandas → valor y valor → bandas (CLAUDE.md §6).
 *
 * Las bandas se eligen con `<select>` nativos en vez de un menú propio: en el
 * celular el selector del sistema se usa con el pulgar sin apuntar a un blanco
 * de 16 px, y encima funciona con lector de pantalla sin que haya que
 * inventar nada.
 */

const CUATRO: number[] = [1, 0, 2, 10]; // marrón negro rojo oro = 1 kΩ ±5 %
const CINCO: number[] = [1, 0, 0, 1, 1]; // marrón negro negro marrón marrón = 1 kΩ ±1 %

function rotuloBanda(indice: number, cantidad: CantidadBandas): string {
  const digitos = cantidad - 2;
  if (indice < digitos) return `${indice + 1}.ª cifra`;
  if (indice === digitos) return 'Multiplicador';
  return 'Tolerancia';
}

function opcionesBanda(indice: number, cantidad: CantidadBandas): number[] {
  const digitos = cantidad - 2;
  if (indice < digitos) return INDICES_DIGITO;
  if (indice === digitos) return INDICES_MULTIPLICADOR;
  return INDICES_TOLERANCIA;
}

export default function CodigoColores() {
  const [cantidad, setCantidad] = useState<CantidadBandas>(4);
  const [bandas, setBandas] = useState<number[]>(CUATRO);
  const [texto, setTexto] = useState('1000');
  const [aviso, setAviso] = useState<string | null>(null);

  const lectura = seguro(() => leerBandas(bandas));

  function cambiarCantidad(nueva: CantidadBandas) {
    setCantidad(nueva);
    setBandas(nueva === 4 ? CUATRO : CINCO);
    setTexto('1000');
    setAviso(null);
  }

  function cambiarBanda(indice: number, color: number) {
    const nuevas = [...bandas];
    nuevas[indice] = color;
    setBandas(nuevas);
    setAviso(null);
    const r = seguro(() => leerBandas(nuevas));
    if (r) setTexto(String(r.valor).replace('.', ','));
  }

  /** Valor → bandas. El sentido que se usa cuando tenés el valor y querés la resistencia. */
  function cambiarValor(valor: string) {
    setTexto(valor);
    const n = leerNumero(valor);
    if (n === null) {
      setAviso(null);
      return;
    }
    const tolerancia = COLORES[bandas[cantidad - 1]!]!.tolerancia ?? 5;
    const nuevas = calcularBandas(n, cantidad, tolerancia);
    if (nuevas) {
      setBandas(nuevas);
      setAviso(null);
    } else {
      setAviso(
        `${ingenieril(n, 'Ω')} no se puede representar con ${cantidad} bandas: haría falta otra ` +
          `cantidad de cifras significativas. Probá con un valor de la serie comercial.`,
      );
    }
  }

  return (
    <div class="sim">
      <p class="sim__rotulo">Código de colores</p>

      <Resistencia bandas={bandas} />

      <div class="sim__acciones" role="group" aria-label="Cantidad de bandas">
        {([4, 5] as CantidadBandas[]).map((n) => (
          <button
            type="button"
            key={n}
            class={`boton${cantidad === n ? ' boton--activo' : ''}`}
            aria-pressed={cantidad === n}
            onClick={() => cambiarCantidad(n)}
          >
            {n} bandas
          </button>
        ))}
      </div>

      <div class="bandas">
        {bandas.map((color, i) => (
          <label class="banda" key={`${cantidad}-${i}`}>
            <span class="campo__rotulo">{rotuloBanda(i, cantidad)}</span>
            <span class="banda__muestra" style={`background:${COLORES[color]!.hex}`} aria-hidden="true" />
            <select
              value={String(color)}
              onChange={(e) => cambiarBanda(i, Number((e.target as HTMLSelectElement).value))}
            >
              {opcionesBanda(i, cantidad).map((idx) => (
                <option value={String(idx)} key={idx}>
                  {COLORES[idx]!.nombre}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {lectura && (
        <div class="sim__resultado">
          <em>Valor</em>
          <span class="sim__valor">{ingenieril(lectura.valor, 'Ω')}</span>
          <span class="sim__secundario">
            ±{String(lectura.tolerancia).replace('.', ',')} % · de{' '}
            {ingenieril(lectura.minimo, 'Ω')} a {ingenieril(lectura.maximo, 'Ω')}
          </span>
        </div>
      )}

      <div class="sim__campos" style="margin-top:1.3rem">
        <label class="campo">
          <span class="campo__rotulo">O escribí el valor y mirá las bandas</span>
          <span class="campo__fila">
            <input
              type="text"
              inputMode="decimal"
              value={texto}
              aria-label="Valor en ohm"
              onInput={(e) => cambiarValor((e.target as HTMLInputElement).value)}
            />
            <span class="campo__unidad">Ω</span>
          </span>
        </label>
      </div>

      {aviso && <p class="sim__error">{aviso}</p>}
    </div>
  );
}

/**
 * La resistencia dibujada. El cuerpo es un componente físico, no un símbolo de
 * esquema, así que acá sí van los extremos redondeados: es un dibujo de la cosa,
 * no la simbología IRAM.
 */
function Resistencia({ bandas }: { bandas: number[] }) {
  const cantidad = bandas.length;
  const xInicial = 78;
  const paso = 26;
  // La banda de tolerancia va separada, como en la resistencia real.
  const xTolerancia = 236;

  return (
    <svg
      class="resistencia"
      viewBox="0 0 320 96"
      role="img"
      aria-label={`Resistencia de ${cantidad} bandas: ${bandas
        .map((b) => COLORES[b]!.nombre)
        .join(', ')}`}
    >
      <line x1="0" y1="48" x2="62" y2="48" class="patita" />
      <line x1="258" y1="48" x2="320" y2="48" class="patita" />
      <rect x="62" y="22" width="196" height="52" rx="12" class="cuerpo" />
      {bandas.map((color, i) => {
        const esTolerancia = i === cantidad - 1;
        const x = esTolerancia ? xTolerancia : xInicial + i * paso;
        return (
          <rect
            key={i}
            x={x}
            y="22"
            width="14"
            height="52"
            fill={COLORES[color]!.hex}
            rx={esTolerancia ? 6 : 0}
          />
        );
      })}
      <rect x="62" y="22" width="196" height="52" rx="12" class="contorno" />
    </svg>
  );
}

/** Ejecuta y devuelve null si tira: las combinaciones de bandas pueden ser inválidas. */
function seguro<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}
