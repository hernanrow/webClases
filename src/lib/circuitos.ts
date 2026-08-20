/**
 * Motor de cálculo de circuitos de corriente continua.
 *
 * Funciones puras: no importa nada de Preact ni toca el DOM. Todo lo que se
 * muestra en pantalla sale de acá, así que un error en este archivo es un error
 * en todos los simuladores a la vez. Por eso tiene tests (`circuitos.test.ts`)
 * contra ejercicios resueltos a mano.
 *
 * Unidades base en todo el archivo: volt, ampere, ohm, watt.
 */

/** Tolerancia relativa para comparar magnitudes de punto flotante. */
const EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Ley de Ohm
// ---------------------------------------------------------------------------

export type MagnitudOhm = 'tension' | 'corriente' | 'resistencia';

export interface ResultadoOhm {
  tension: number;
  corriente: number;
  resistencia: number;
  potencia: number;
  /** Cuál de las tres se calculó a partir de las otras dos. */
  despejada: MagnitudOhm;
  /** La fórmula usada, en LaTeX, con los valores ya reemplazados. */
  formula: string;
}

/**
 * Resuelve la ley de Ohm a partir de exactamente dos de las tres magnitudes.
 * Devuelve también la potencia y la fórmula despejada que usó, porque el
 * alumno tiene que ver de dónde sale el número.
 */
export function leyDeOhm(datos: {
  tension?: number;
  corriente?: number;
  resistencia?: number;
}): ResultadoOhm {
  const { tension: v, corriente: i, resistencia: r } = datos;
  const cargados = [v, i, r].filter((x) => x !== undefined).length;

  if (cargados !== 2) {
    throw new Error(
      `La ley de Ohm necesita exactamente dos datos para despejar el tercero; se recibieron ${cargados}.`,
    );
  }

  if (v !== undefined && i !== undefined) {
    if (Math.abs(i) < EPSILON) {
      throw new Error('Con corriente nula la resistencia es indeterminada (circuito abierto).');
    }
    const resistencia = v / i;
    return {
      tension: v,
      corriente: i,
      resistencia,
      potencia: v * i,
      despejada: 'resistencia',
      formula: `R = \\frac{V}{I} = \\frac{${v}}{${i}}`,
    };
  }

  if (v !== undefined && r !== undefined) {
    if (Math.abs(r) < EPSILON) {
      throw new Error('Con resistencia nula la corriente es indeterminada (cortocircuito).');
    }
    const corriente = v / r;
    return {
      tension: v,
      corriente,
      resistencia: r,
      potencia: (v * v) / r,
      despejada: 'corriente',
      formula: `I = \\frac{V}{R} = \\frac{${v}}{${r}}`,
    };
  }

  // Quedan corriente y resistencia.
  const corriente = i as number;
  const resistencia = r as number;
  return {
    tension: corriente * resistencia,
    corriente,
    resistencia,
    potencia: corriente * corriente * resistencia,
    despejada: 'tension',
    formula: `V = I \\cdot R = ${corriente} \\cdot ${resistencia}`,
  };
}

// ---------------------------------------------------------------------------
// Redes resistivas: serie, paralelo y mixto
// ---------------------------------------------------------------------------

export type Red =
  | { tipo: 'resistencia'; rotulo: string; valor: number }
  | { tipo: 'serie'; hijos: Red[] }
  | { tipo: 'paralelo'; hijos: Red[] };

export interface Paso {
  /** Qué se combinó, con los rótulos originales. Ej: "R2 ∥ R3". */
  descripcion: string;
  /** La cuenta con los valores reemplazados, en LaTeX. */
  desarrollo: string;
  /** El resultado parcial, en ohm. */
  valor: number;
  /** Rótulo que se le asigna al resultado parcial. Ej: "R23". */
  rotulo: string;
}

export interface ReduccionRed {
  equivalente: number;
  pasos: Paso[];
}

export function serie(valores: number[]): number {
  if (valores.length === 0) throw new Error('Una conexión en serie necesita al menos una resistencia.');
  return valores.reduce((a, b) => a + b, 0);
}

export function paralelo(valores: number[]): number {
  if (valores.length === 0) throw new Error('Una conexión en paralelo necesita al menos una resistencia.');
  if (valores.some((v) => Math.abs(v) < EPSILON)) return 0; // una rama en corto anula el paralelo
  const sumaInversas = valores.reduce((acc, v) => acc + 1 / v, 0);
  return 1 / sumaInversas;
}

/**
 * Reduce una red a su resistencia equivalente devolviendo **el desarrollo
 * paso a paso**, no solo el número. El brief (§6) es explícito: el alumno tiene
 * que poder seguir la cuenta.
 */
export function reducirRed(red: Red): ReduccionRed {
  const pasos: Paso[] = [];
  let contador = 0;

  function recorrer(nodo: Red): { valor: number; rotulo: string } {
    if (nodo.tipo === 'resistencia') {
      return { valor: nodo.valor, rotulo: nodo.rotulo };
    }

    // Primero se resuelven los hijos: la reducción va de adentro hacia afuera.
    const resueltos = nodo.hijos.map(recorrer);
    const valores = resueltos.map((h) => h.valor);
    const rotulos = resueltos.map((h) => h.rotulo);

    if (resueltos.length === 1) return resueltos[0]!;

    contador += 1;
    const rotulo = `R_{eq${contador}}`;

    if (nodo.tipo === 'serie') {
      const valor = serie(valores);
      pasos.push({
        descripcion: `${rotulos.join(' + ')} en serie`,
        desarrollo: `${rotulo} = ${rotulos.join(' + ')} = ${valores.join(' + ')} = ${redondear(valor)}\\ \\Omega`,
        valor,
        rotulo,
      });
      return { valor, rotulo };
    }

    const valor = paralelo(valores);
    const inversas = valores.map((v) => `\\frac{1}{${v}}`).join(' + ');
    pasos.push({
      descripcion: `${rotulos.join(' ∥ ')} en paralelo`,
      desarrollo: `\\frac{1}{${rotulo}} = ${inversas} \\Rightarrow ${rotulo} = ${redondear(valor)}\\ \\Omega`,
      valor,
      rotulo,
    });
    return { valor, rotulo };
  }

  const { valor } = recorrer(red);
  return { equivalente: valor, pasos };
}

function redondear(x: number, cifras = 4): number {
  if (x === 0) return 0;
  const magnitud = Math.ceil(Math.log10(Math.abs(x)));
  const factor = 10 ** (cifras - magnitud);
  return Math.round(x * factor) / factor;
}

// ---------------------------------------------------------------------------
// Estrella ↔ triángulo
// ---------------------------------------------------------------------------

export interface Estrella {
  /** Resistencias de rama, del nudo común a cada terminal A, B y C. */
  a: number;
  b: number;
  c: number;
}

export interface Triangulo {
  /** Resistencias entre terminales: ab entre A y B, y así. */
  ab: number;
  bc: number;
  ca: number;
}

/** Estrella → triángulo. R_ab = (Ra·Rb + Rb·Rc + Rc·Ra) / Rc, y sus rotaciones. */
export function estrellaATriangulo({ a, b, c }: Estrella): Triangulo {
  const suma = a * b + b * c + c * a;
  if (Math.abs(a) < EPSILON || Math.abs(b) < EPSILON || Math.abs(c) < EPSILON) {
    throw new Error('La conversión estrella → triángulo no admite ramas de resistencia nula.');
  }
  return { ab: suma / c, bc: suma / a, ca: suma / b };
}

/** Triángulo → estrella. Ra = (R_ab · R_ca) / (R_ab + R_bc + R_ca), y sus rotaciones. */
export function trianguloAEstrella({ ab, bc, ca }: Triangulo): Estrella {
  const perimetro = ab + bc + ca;
  if (Math.abs(perimetro) < EPSILON) {
    throw new Error('La conversión triángulo → estrella necesita un perímetro no nulo.');
  }
  return {
    a: (ab * ca) / perimetro,
    b: (ab * bc) / perimetro,
    c: (bc * ca) / perimetro,
  };
}

// ---------------------------------------------------------------------------
// Sistemas de ecuaciones lineales (Gauss con pivoteo parcial)
// ---------------------------------------------------------------------------

/**
 * Resuelve A·x = b por eliminación de Gauss con pivoteo parcial.
 *
 * El pivoteo no es un lujo: sin él, un cero en la diagonal rompe el método aun
 * cuando el sistema tiene solución, y los errores de redondeo se amplifican.
 * Es la base de los métodos de mallas y de nudos (Unidad 2).
 *
 * @param A matriz de coeficientes, n×n
 * @param b vector de términos independientes, n
 * @returns el vector solución x
 */
export function resolverSistema(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (A.length !== n || A.some((fila) => fila.length !== n)) {
    throw new Error(`La matriz debe ser cuadrada y coherente con el vector: se esperaba ${n}×${n}.`);
  }

  // Copia de trabajo: no se toca lo que nos pasaron.
  const M = A.map((fila, i) => [...fila, b[i]!]);

  for (let col = 0; col < n; col++) {
    // Pivoteo parcial: se lleva a la diagonal el coeficiente de mayor módulo.
    let mejor = col;
    for (let fila = col + 1; fila < n; fila++) {
      if (Math.abs(M[fila]![col]!) > Math.abs(M[mejor]![col]!)) mejor = fila;
    }
    if (Math.abs(M[mejor]![col]!) < EPSILON) {
      throw new Error(
        'El sistema no tiene solución única: la matriz es singular. ' +
          'En un circuito, esto suele significar que las mallas elegidas no son independientes.',
      );
    }
    [M[col], M[mejor]] = [M[mejor]!, M[col]!];

    // Eliminación hacia abajo.
    for (let fila = col + 1; fila < n; fila++) {
      const factor = M[fila]![col]! / M[col]![col]!;
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) {
        M[fila]![k]! -= factor * M[col]![k]!;
      }
    }
  }

  // Sustitución hacia atrás.
  const x = new Array<number>(n).fill(0);
  for (let fila = n - 1; fila >= 0; fila--) {
    let suma = M[fila]![n]!;
    for (let col = fila + 1; col < n; col++) {
      suma -= M[fila]![col]! * x[col]!;
    }
    x[fila] = suma / M[fila]![fila]!;
  }
  return x;
}

/** Determinante por eliminación de Gauss. Lo usa el método de Cramer (Unidad 2). */
export function determinante(A: number[][]): number {
  const n = A.length;
  if (A.some((fila) => fila.length !== n)) throw new Error('La matriz debe ser cuadrada.');

  const M = A.map((fila) => [...fila]);
  let det = 1;

  for (let col = 0; col < n; col++) {
    let mejor = col;
    for (let fila = col + 1; fila < n; fila++) {
      if (Math.abs(M[fila]![col]!) > Math.abs(M[mejor]![col]!)) mejor = fila;
    }
    if (Math.abs(M[mejor]![col]!) < EPSILON) return 0;
    if (mejor !== col) {
      [M[col], M[mejor]] = [M[mejor]!, M[col]!];
      det = -det; // cada permutación de filas cambia el signo
    }
    det *= M[col]![col]!;
    for (let fila = col + 1; fila < n; fila++) {
      const factor = M[fila]![col]! / M[col]![col]!;
      for (let k = col; k < n; k++) M[fila]![k]! -= factor * M[col]![k]!;
    }
  }
  return det;
}

// ---------------------------------------------------------------------------
// Verificación de las leyes de Kirchhoff
// ---------------------------------------------------------------------------

export interface Nudo {
  nombre: string;
  /** Corrientes de rama con signo: positiva si entra al nudo. */
  corrientes: { rama: string; valor: number }[];
}

export interface Malla {
  nombre: string;
  /** Caídas y elevaciones de tensión recorriendo la malla, con signo. */
  tensiones: { elemento: string; valor: number }[];
}

export interface VerificacionKirchhoff {
  nombre: string;
  /** La suma algebraica, que debería dar cero. */
  suma: number;
  cierra: boolean;
  /** Qué se sumó, para mostrarlo cuando no cierra. */
  desarrollo: string;
}

/**
 * Verifica ΣI = 0 en cada nudo y ΣV = 0 en cada malla.
 *
 * La tolerancia es absoluta y generosa a propósito: el alumno redondea a mA y a
 * décimas de volt, y marcar en rojo una respuesta correcta mal redondeada es
 * peor que dejar pasar un error de 1 mA.
 */
export function verificarKirchhoff(
  nudos: Nudo[],
  mallas: Malla[],
  tolerancia = 1e-3,
): { nudos: VerificacionKirchhoff[]; mallas: VerificacionKirchhoff[]; todoCierra: boolean } {
  const verificarNudo = (n: Nudo): VerificacionKirchhoff => {
    const suma = n.corrientes.reduce((acc, c) => acc + c.valor, 0);
    return {
      nombre: n.nombre,
      suma,
      cierra: Math.abs(suma) <= tolerancia,
      desarrollo: n.corrientes.map((c) => `${signo(c.valor)}${Math.abs(c.valor)} (${c.rama})`).join(' '),
    };
  };

  const verificarMalla = (m: Malla): VerificacionKirchhoff => {
    const suma = m.tensiones.reduce((acc, t) => acc + t.valor, 0);
    return {
      nombre: m.nombre,
      suma,
      cierra: Math.abs(suma) <= tolerancia,
      desarrollo: m.tensiones.map((t) => `${signo(t.valor)}${Math.abs(t.valor)} (${t.elemento})`).join(' '),
    };
  };

  const resNudos = nudos.map(verificarNudo);
  const resMallas = mallas.map(verificarMalla);

  return {
    nudos: resNudos,
    mallas: resMallas,
    todoCierra: [...resNudos, ...resMallas].every((r) => r.cierra),
  };
}

function signo(x: number): string {
  return x < 0 ? '− ' : '+ ';
}
