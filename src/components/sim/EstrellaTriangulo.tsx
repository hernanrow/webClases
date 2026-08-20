import { useState } from 'preact/hooks';
import { estrellaATriangulo, trianguloAEstrella } from '../../lib/circuitos';
import { ingenieril, leerNumero, numero } from '../../lib/formato';

/**
 * Los dos esquemas lado a lado en SVG. Se edita un lado y el otro se actualiza,
 * mostrando las tres fórmulas con los valores reemplazados (CLAUDE.md §6).
 *
 * Los esquemas van en simbología IRAM/IEC: la resistencia es un rectángulo de
 * trazo 2 px, sin relleno y sin esquinas redondeadas. Tiene que ser el mismo
 * símbolo que copian del pizarrón.
 */

type Lado = 'estrella' | 'triangulo';

export default function EstrellaTriangulo() {
  const [lado, setLado] = useState<Lado>('estrella');
  const [estrella, setEstrella] = useState({ a: '10', b: '20', c: '30' });
  const [triangulo, setTriangulo] = useState({ ab: '30', bc: '30', ca: '30' });

  const eNum = {
    a: leerNumero(estrella.a),
    b: leerNumero(estrella.b),
    c: leerNumero(estrella.c),
  };
  const tNum = {
    ab: leerNumero(triangulo.ab),
    bc: leerNumero(triangulo.bc),
    ca: leerNumero(triangulo.ca),
  };

  const estrellaValida = valida(eNum.a) && valida(eNum.b) && valida(eNum.c);
  const trianguloValido = valida(tNum.ab) && valida(tNum.bc) && valida(tNum.ca);

  // El lado que se está editando manda; el otro se calcula.
  let e: { a: number; b: number; c: number } | null = null;
  let t: { ab: number; bc: number; ca: number } | null = null;

  if (lado === 'estrella' && estrellaValida) {
    e = { a: eNum.a!, b: eNum.b!, c: eNum.c! };
    t = estrellaATriangulo(e);
  } else if (lado === 'triangulo' && trianguloValido) {
    t = { ab: tNum.ab!, bc: tNum.bc!, ca: tNum.ca! };
    e = trianguloAEstrella(t);
  }

  function editarEstrella(clave: 'a' | 'b' | 'c', valor: string) {
    setLado('estrella');
    setEstrella({ ...estrella, [clave]: valor });
  }

  function editarTriangulo(clave: 'ab' | 'bc' | 'ca', valor: string) {
    setLado('triangulo');
    setTriangulo({ ...triangulo, [clave]: valor });
  }

  // Lo que se muestra en el lado calculado.
  const muestraEstrella = lado === 'estrella' ? estrella : formatear3(e, ['a', 'b', 'c']);
  const muestraTriangulo = lado === 'triangulo' ? triangulo : formatear3(t, ['ab', 'bc', 'ca']);

  const suma = e ? e.a * e.b + e.b * e.c + e.c * e.a : 0;
  const perimetro = t ? t.ab + t.bc + t.ca : 0;

  return (
    <div class="sim">
      <p class="sim__rotulo">Estrella ↔ triángulo</p>

      <div class="dos-esquemas">
        <div class={`esquema${lado === 'estrella' ? ' esquema--activo' : ''}`}>
          <h3 class="esquema__titulo">Estrella (Y)</h3>
          <DibujoEstrella />
          <div class="esquema__campos">
            {(['a', 'b', 'c'] as const).map((k) => (
              <label class="campo campo--chico" key={k}>
                <span class="campo__rotulo">R{k.toUpperCase()}</span>
                <span class="campo__fila">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={muestraEstrella[k]}
                    aria-label={`Resistencia R${k.toUpperCase()} de la estrella, en ohm`}
                    onInput={(ev) => editarEstrella(k, (ev.target as HTMLInputElement).value)}
                  />
                  <span class="campo__unidad">Ω</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div class={`esquema${lado === 'triangulo' ? ' esquema--activo' : ''}`}>
          <h3 class="esquema__titulo">Triángulo (Δ)</h3>
          <DibujoTriangulo />
          <div class="esquema__campos">
            {(['ab', 'bc', 'ca'] as const).map((k) => (
              <label class="campo campo--chico" key={k}>
                <span class="campo__rotulo">R{k.toUpperCase()}</span>
                <span class="campo__fila">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={muestraTriangulo[k]}
                    aria-label={`Resistencia R${k.toUpperCase()} del triángulo, en ohm`}
                    onInput={(ev) => editarTriangulo(k, (ev.target as HTMLInputElement).value)}
                  />
                  <span class="campo__unidad">Ω</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <p class="sim__aviso">
        Estás editando {lado === 'estrella' ? 'la estrella' : 'el triángulo'}; el otro lado
        se calcula. Tocá cualquier campo del otro para invertir el sentido.
      </p>

      {e && t ? (
        <ol class="pasos">
          {lado === 'estrella' ? (
            <>
              <li>
                <span class="pasos__que">Suma de productos</span>
                <span class="pasos__cuenta">
                  RA·RB + RB·RC + RC·RA = {numero(e.a)}·{numero(e.b)} + {numero(e.b)}·
                  {numero(e.c)} + {numero(e.c)}·{numero(e.a)} = {numero(suma)}
                </span>
              </li>
              {(
                [
                  ['RAB', suma, e.c, t.ab, 'RC'],
                  ['RBC', suma, e.a, t.bc, 'RA'],
                  ['RCA', suma, e.b, t.ca, 'RB'],
                ] as const
              ).map(([nombre, num, den, res, divisor]) => (
                <li key={nombre}>
                  <span class="pasos__que">
                    {nombre} = suma / {divisor}
                  </span>
                  <span class="pasos__cuenta">
                    {nombre} = {numero(num)} / {numero(den)} = {ingenieril(res, 'Ω')}
                  </span>
                </li>
              ))}
            </>
          ) : (
            <>
              <li>
                <span class="pasos__que">Perímetro</span>
                <span class="pasos__cuenta">
                  RAB + RBC + RCA = {numero(t.ab)} + {numero(t.bc)} + {numero(t.ca)} ={' '}
                  {numero(perimetro)}
                </span>
              </li>
              {(
                [
                  ['RA', t.ab, t.ca, e.a, 'RAB·RCA'],
                  ['RB', t.ab, t.bc, e.b, 'RAB·RBC'],
                  ['RC', t.bc, t.ca, e.c, 'RBC·RCA'],
                ] as const
              ).map(([nombre, x, y, res, formula]) => (
                <li key={nombre}>
                  <span class="pasos__que">
                    {nombre} = {formula} / perímetro
                  </span>
                  <span class="pasos__cuenta">
                    {nombre} = ({numero(x)}·{numero(y)}) / {numero(perimetro)} ={' '}
                    {ingenieril(res, 'Ω')}
                  </span>
                </li>
              ))}
            </>
          )}
        </ol>
      ) : (
        <p class="sim__error">
          Las tres resistencias del lado que estás editando tienen que ser mayores que cero.
        </p>
      )}
    </div>
  );
}

function valida(x: number | null): boolean {
  return x !== null && x > 0;
}

function formatear3<K extends string>(
  valores: Record<K, number> | null,
  claves: readonly K[],
): Record<K, string> {
  const salida = {} as Record<K, string>;
  for (const k of claves) {
    salida[k] = valores ? numero(valores[k], 4) : '';
  }
  return salida;
}

/* --- Los esquemas, en simbología IRAM/IEC --- */

function DibujoEstrella() {
  return (
    <svg class="esquema__svg" viewBox="0 0 200 170" role="img" aria-label="Conexión en estrella: tres resistencias desde un nudo común a los terminales A, B y C">
      <g class="hilo">
        <line x1="100" y1="85" x2="100" y2="62" />
        <line x1="100" y1="85" x2="62" y2="107" />
        <line x1="100" y1="85" x2="138" y2="107" />
        <line x1="100" y1="34" x2="100" y2="18" />
        <line x1="40" y1="119" x2="26" y2="127" />
        <line x1="160" y1="119" x2="174" y2="127" />
      </g>
      <rect class="resistencia-simbolo" x="90" y="34" width="20" height="28" />
      <rect class="resistencia-simbolo" x="34" y="97" width="28" height="20" transform="rotate(30 48 107)" />
      <rect class="resistencia-simbolo" x="138" y="97" width="28" height="20" transform="rotate(-30 152 107)" />
      <circle class="nudo" cx="100" cy="85" r="3.5" />
      <text class="borne" x="100" y="12" text-anchor="middle">A</text>
      <text class="borne" x="18" y="140" text-anchor="middle">B</text>
      <text class="borne" x="182" y="140" text-anchor="middle">C</text>
      <text class="rotulo-r" x="118" y="52">RA</text>
      <text class="rotulo-r" x="30" y="92">RB</text>
      <text class="rotulo-r" x="152" y="92">RC</text>
    </svg>
  );
}

function DibujoTriangulo() {
  return (
    <svg class="esquema__svg" viewBox="0 0 200 170" role="img" aria-label="Conexión en triángulo: tres resistencias entre los terminales A, B y C">
      <g class="hilo">
        <line x1="100" y1="30" x2="66" y2="70" />
        <line x1="100" y1="30" x2="134" y2="70" />
        <line x1="46" y1="120" x2="154" y2="120" />
        <line x1="100" y1="30" x2="100" y2="18" />
      </g>
      <rect class="resistencia-simbolo" x="52" y="66" width="28" height="20" transform="rotate(50 66 76)" />
      <rect class="resistencia-simbolo" x="120" y="66" width="28" height="20" transform="rotate(-50 134 76)" />
      <rect class="resistencia-simbolo" x="86" y="110" width="28" height="20" />
      <circle class="nudo" cx="100" cy="30" r="3.5" />
      <circle class="nudo" cx="46" cy="120" r="3.5" />
      <circle class="nudo" cx="154" cy="120" r="3.5" />
      <text class="borne" x="100" y="12" text-anchor="middle">A</text>
      <text class="borne" x="34" y="140" text-anchor="middle">B</text>
      <text class="borne" x="166" y="140" text-anchor="middle">C</text>
      <text class="rotulo-r" x="24" y="76">RAB</text>
      <text class="rotulo-r" x="150" y="76">RCA</text>
      <text class="rotulo-r" x="86" y="150">RBC</text>
    </svg>
  );
}
