/**
 * Color de cada unidad = banda del código de colores de resistencias
 * correspondiente a su número (ver CLAUDE.md §9).
 * El alumno aprende el código navegando el sitio.
 */
const BANDAS: readonly { readonly color: string; readonly nombre: string }[] = [
  { color: '#0B0B0B', nombre: 'negro' },
  { color: '#7B4B2A', nombre: 'marrón' },
  { color: '#B4342B', nombre: 'rojo' },
  { color: '#D4762A', nombre: 'naranja' },
  { color: '#D9A428', nombre: 'amarillo' },
  { color: '#3FA66B', nombre: 'verde' },
  { color: '#2F5D9E', nombre: 'azul' },
  { color: '#7A4E9B', nombre: 'violeta' },
  { color: '#8A8F96', nombre: 'gris' },
  { color: '#F2F3F5', nombre: 'blanco' },
];

/** Unidad 1 → marrón, unidad 2 → rojo, unidad 3 → naranja, unidad 4 → amarillo. */
export function colorUnidad(numero: number): string {
  return (BANDAS[numero] ?? BANDAS[8]!).color;
}

export function nombreColorUnidad(numero: number): string {
  return (BANDAS[numero] ?? BANDAS[8]!).nombre;
}
