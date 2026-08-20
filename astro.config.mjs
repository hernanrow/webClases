// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// `site` se completa con la URL real de Cloudflare Pages una vez desplegado.
// Hace falta para canonical, sitemap y los QR de la versión imprimible (Fase 1).
export default defineConfig({
  site: 'https://webclases.pages.dev',
  integrations: [mdx()],
  markdown: {
    // Notación matemática resuelta en el build: el navegador recibe HTML, no LaTeX.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
