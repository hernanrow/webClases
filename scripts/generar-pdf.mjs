/**
 * Genera la versión imprimible a partir del sitio ya construido.
 *
 * Regla que no se rompe (CLAUDE.md §8): el HTML es la fuente de verdad y el PDF
 * sale de él. Este script no escribe contenido: abre las páginas que ya existen
 * y las imprime.
 *
 * Hace dos cosas, en este orden:
 *
 *   1. Captura cada simulador a `public/capturas/`. Esas capturas son las que
 *      reemplazan al simulador en papel.
 *   2. Imprime a PDF cada tema con `pdf: true` y un PDF por unidad completa,
 *      a `public/descargas/`.
 *
 * Entre los dos pasos hay que reconstruir el sitio, porque el paso 2 necesita
 * que las capturas del paso 1 ya estén en las páginas. Por eso el flujo real es:
 *
 *   npm run build && node scripts/generar-pdf.mjs --capturas
 *   npm run build && node scripts/generar-pdf.mjs --pdf
 *
 * o directamente `npm run pdf`, que encadena las cuatro cosas.
 *
 * No corre en el build de Cloudflare: descargar Chromium en cada push
 * convertiría un deploy de 5 segundos en varios minutos. Corre en un GitHub
 * Action aparte, solo cuando cambia el contenido (.github/workflows/pdf.yml).
 */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const CAPTURAS = join(RAIZ, 'public', 'capturas');
const DESCARGAS = join(RAIZ, 'public', 'descargas');
const PUERTO = 4327;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

/** Servidor estático mínimo sobre dist/. Evita depender de `astro preview`. */
function servir() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PUERTO}`);
      let ruta = join(DIST, decodeURIComponent(url.pathname));
      if (!extname(ruta)) ruta = join(ruta, 'index.html');
      const cuerpo = await readFile(ruta);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] ?? 'application/octet-stream' });
      res.end(cuerpo);
    } catch {
      res.writeHead(404).end('no encontrado');
    }
  });
  return new Promise((resolve) => server.listen(PUERTO, () => resolve(server)));
}

/** Los temas del sitio, leídos del frontmatter de los .mdx. */
async function leerTemas() {
  const contenido = join(RAIZ, 'src', 'content');
  const materias = (await readdir(contenido, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const temas = [];
  for (const materia of materias) {
    const archivos = (await readdir(join(contenido, materia))).filter((f) => f.endsWith('.mdx'));
    for (const archivo of archivos) {
      const texto = await readFile(join(contenido, materia, archivo), 'utf8');
      const frontmatter = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatter) continue;
      const campo = (nombre) => frontmatter[1].match(new RegExp(`^${nombre}:\\s*(.+)$`, 'm'))?.[1]?.trim();

      temas.push({
        materia,
        slug: archivo.replace(/\.mdx$/, ''),
        titulo: (campo('titulo') ?? archivo).replace(/^["']|["']$/g, ''),
        unidad: Number(campo('unidad') ?? 0),
        orden: Number(campo('orden') ?? 0),
        pdf: campo('pdf') === 'true',
      });
    }
  }
  return temas.sort((a, b) => a.unidad - b.unidad || a.orden - b.orden);
}

async function capturarSimuladores(navegador, temas) {
  await mkdir(CAPTURAS, { recursive: true });
  // Ancho de tableta: entra bien en una hoja A4 y los simuladores no quedan
  // apretados como a 360 px.
  const contexto = await navegador.newContext({
    viewport: { width: 760, height: 1200 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const pagina = await contexto.newPage();

  let capturadas = 0;
  for (const tema of temas) {
    const url = `http://localhost:${PUERTO}/${tema.materia}/${tema.slug}/`;
    await pagina.goto(url, { waitUntil: 'networkidle' });

    const sim = pagina.locator('.simulador__interactivo .sim').first();
    if ((await sim.count()) === 0) continue;

    // client:visible: hay que traerlo a la vista para que hidrate.
    await sim.scrollIntoViewIfNeeded();
    await pagina.waitForTimeout(700);

    const destino = join(CAPTURAS, `${tema.slug}.png`);
    await sim.screenshot({ path: destino });
    capturadas++;
    console.log(`  captura  ${tema.slug}.png`);
  }

  await contexto.close();
  return capturadas;
}

async function imprimirPdf(navegador, temas) {
  await mkdir(DESCARGAS, { recursive: true });
  const contexto = await navegador.newContext({ colorScheme: 'light' });
  const pagina = await contexto.newPage();

  const opciones = {
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', right: '16mm', bottom: '20mm', left: '16mm' },
  };

  const conPdf = temas.filter((t) => t.pdf);
  let generados = 0;

  for (const tema of conPdf) {
    await pagina.goto(`http://localhost:${PUERTO}/${tema.materia}/${tema.slug}/`, {
      waitUntil: 'networkidle',
    });
    await pagina.emulateMedia({ media: 'print' });
    await pagina.pdf({ ...opciones, path: join(DESCARGAS, `${tema.slug}.pdf`) });
    generados++;
    console.log(`  pdf      ${tema.slug}.pdf`);
  }

  // Un PDF por unidad: los temas de la unidad, uno tras otro en un solo archivo.
  const porUnidad = new Map();
  for (const tema of conPdf) {
    if (!porUnidad.has(tema.unidad)) porUnidad.set(tema.unidad, []);
    porUnidad.get(tema.unidad).push(tema);
  }

  for (const [unidad, deLaUnidad] of [...porUnidad].sort((a, b) => a[0] - b[0])) {
    const partes = [];
    for (const tema of deLaUnidad) {
      const html = await readFile(join(DIST, tema.materia, tema.slug, 'index.html'), 'utf8');
      const cuerpo = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
      partes.push(`<section class="tema-suelto">${cuerpo}</section>`);
    }

    // Se reusa el <head> de una página real para heredar las mismas hojas de
    // estilo: si el CSS cambia, el PDF de unidad cambia con él.
    const primera = deLaUnidad[0];
    const plantilla = await readFile(
      join(DIST, primera.materia, primera.slug, 'index.html'),
      'utf8',
    );
    const head = plantilla.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
    const documento = `<!doctype html><html lang="es-AR"><head>${head}<style>
      .tema-suelto { break-before: page; page-break-before: always; }
      .tema-suelto:first-child { break-before: auto; page-break-before: auto; }
    </style></head><body>${partes.join('')}</body></html>`;

    const temporal = join(DIST, `__unidad-${unidad}.html`);
    await writeFile(temporal, documento, 'utf8');
    await pagina.goto(`http://localhost:${PUERTO}/__unidad-${unidad}.html`, {
      waitUntil: 'networkidle',
    });
    await pagina.emulateMedia({ media: 'print' });
    await pagina.pdf({
      ...opciones,
      path: join(DESCARGAS, `${primera.materia}-unidad-${unidad}.pdf`),
    });
    generados++;
    console.log(`  pdf      ${primera.materia}-unidad-${unidad}.pdf`);
  }

  await contexto.close();
  return generados;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('No hay dist/. Corré `npm run build` antes.');
    process.exit(1);
  }

  const soloCapturas = process.argv.includes('--capturas');
  const soloPdf = process.argv.includes('--pdf');
  const hacerTodo = !soloCapturas && !soloPdf;

  const temas = await leerTemas();
  const servidor = await servir();
  const navegador = await chromium.launch();

  try {
    if (soloCapturas || hacerTodo) {
      console.log('Capturando simuladores…');
      const n = await capturarSimuladores(navegador, temas);
      console.log(`${n} captura(s).`);
    }
    if (soloPdf || hacerTodo) {
      console.log('Imprimiendo PDF…');
      const n = await imprimirPdf(navegador, temas);
      console.log(`${n} PDF.`);
    }
  } finally {
    await navegador.close();
    servidor.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
