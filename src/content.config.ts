import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Una sola colección para todos los apuntes de todas las materias.
 * La materia sale de la carpeta: src/content/<materia>/<tema>.mdx
 * Sumar una materia nueva = crear una carpeta. No se toca este archivo.
 */
const apuntes = defineCollection({
  loader: glob({ pattern: '*/*.mdx', base: './src/content' }),
  schema: z.object({
    titulo: z.string(),
    unidad: z.number().int().positive(),
    orden: z.number().int().positive(),
    resumen: z.string(),
    duracion: z.string(),
    /** Slugs de temas previos, sin la carpeta de la materia. Ej: ["01-ley-de-ohm"] */
    requisitos: z.array(z.string()).default([]),
    /** Si genera versión imprimible en la Fase 1. */
    pdf: z.boolean().default(false),
    descargas: z
      .array(z.object({ titulo: z.string(), archivo: z.string() }))
      .default([]),
  }),
});

/**
 * Metadatos de cada materia: src/content/<materia>/materia.json
 * Define el nombre, el curso y los nombres de las unidades.
 */
const materias = defineCollection({
  loader: glob({
    pattern: '*/materia.json',
    base: './src/content',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    nombre: z.string(),
    curso: z.string(),
    resumen: z.string(),
    unidades: z
      .array(z.object({ numero: z.number().int().positive(), nombre: z.string() }))
      .min(1),
  }),
});

export const collections = { apuntes, materias };
