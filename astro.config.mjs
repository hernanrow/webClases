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

  security: {
    /**
     * Astro calcula los hashes de sus propios scripts y estilos inline y los
     * emite en un <meta http-equiv="content-security-policy">.
     *
     * Esto reemplaza a la CSP que estaba en public/_headers, que rompía el
     * sitio: `script-src 'self'` bloqueaba el runtime de islas de Astro —que va
     * inline— y por eso ningún simulador hidrataba en producción. Aflojar la
     * política con 'unsafe-inline' habría funcionado, pero es justo lo que la
     * CSP viene a evitar; con hashes se mantiene estricta.
     *
     * `data:` en font-src hace falta porque KaTeX inlinea una de sus fuentes.
     */
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        "base-uri 'none'",
        "form-action 'none'",
        // `frame-ancestors` NO va acá: el navegador lo ignora cuando la CSP
        // viene en un <meta>. Va como cabecera, en public/_headers.
      ],

      /**
       * Los atributos `style=` inline no los cubre ningún hash: un hash se
       * calcula sobre el contenido de una etiqueta <style>, no sobre un
       * atributo. Hay que permitirlos aparte, en `style-src-attr`.
       *
       * El sitio los usa para el color de cada unidad, que es un valor dinámico
       * y no puede vivir en una hoja de estilos fija.
       *
       * Se afloja solo esto y **no** `script-src`, que sigue con hashes: un
       * estilo inline no ejecuta código, que es de lo que la CSP protege de
       * verdad. Y este sitio no tiene login, ni cookies, ni datos de nadie.
       */
      styleDirective: {
        resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }],
      },
    },
  },
  markdown: {
    // Notación matemática resuelta en el build: el navegador recibe HTML, no LaTeX.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
});
