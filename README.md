# Apuntes y simuladores — EEST N° 2073 «San Pablo»

Sitio estático con los apuntes, la ejercitación y los simuladores interactivos de las
materias técnicas. El contexto completo del proyecto está en [`CLAUDE.md`](./CLAUDE.md).

**Estado: Fase 0 (esqueleto).** Astro + MDX + colección de contenido + navegación por
unidades + un apunte de ejemplo. Los simuladores llegan en la Fase 1.

## Correr el sitio localmente

```bash
npm install
npm run dev
```

Queda en `http://localhost:4321`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Genera el sitio estático en `dist/` |
| `npm run preview` | Sirve `dist/` para revisar el build |
| `npm run check` | Valida tipos y frontmatter sin generar el sitio |

## Cargar un apunte nuevo

1. Crear `src/content/circuitos-redes-i/05-tema-nuevo.mdx`.
2. Copiar el frontmatter de otro apunte y cambiar los datos.
3. Escribir en Markdown. Fórmulas con `$...$` (en línea) o `$$...$$` (en bloque).
4. `git push` — Cloudflare Pages reconstruye y publica solo.

Si el frontmatter tiene un error (falta un campo, la `unidad` no existe, un requisito
apunta a un tema inexistente) **el build falla** en vez de publicar una página rota.

## Sumar una materia nueva

Crear la carpeta `src/content/<slug-de-la-materia>/` con:

- un `materia.json` (nombre, curso, resumen y la lista de unidades),
- los `.mdx` de los temas.

No hay que tocar nada fuera de `src/content/`. Las rutas, el índice y la navegación
salen solos.

## Despliegue

**https://webclases.hernanatrodriguez.workers.dev**

Cloudflare Workers (Static Assets), build automático en cada push a `main`.

- Comando de build: `npm run build`
- Directorio de salida: `dist`
- Versión de Node: `22` (fijada en `.nvmrc`)
- El resto de la configuración de despliegue vive en `wrangler.jsonc`.
