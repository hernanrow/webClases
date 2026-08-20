// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// URL de producción. Hace falta para canonical, sitemap y los QR de la versión
// imprimible (Fase 1). Si algún día se pone un dominio propio, se cambia acá.
export default defineConfig({
  site: 'https://webclases.hernanatrodriguez.workers.dev',
  integrations: [mdx(), preact()],
  markdown: {
    // Notación matemática resuelta en el build: el navegador recibe HTML, no LaTeX.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
