import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function githubPagesPortablePlugin(): Plugin {
  return {
    name: 'openkeys-github-pages-portable',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Replace static GitHub Pages bundle tags with source entry so both
        // `vite dev` (HMR) and `vite build` compile directly from /src/main.tsx
        return html
          .replace(
            /<link\s+rel="stylesheet"\s+href="\.\/bundle\/assets\/openkeys\.css"\s*\/?>/i,
            ''
          )
          .replace(
            /<script\s+type="module"\s+src="\.\/bundle\/assets\/openkeys\.js"\s*><\/script>/i,
            '<script type="module" src="/src/main.tsx"></script>'
          );
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [githubPagesPortablePlugin(), react()],
  build: {
    outDir: 'bundle',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/openkeys.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/openkeys.[ext]',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
