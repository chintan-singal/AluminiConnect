import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  esbuild: { jsx: 'automatic' },
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on(
            'proxyReq',
            (request) =>
              request.getHeader('Origin') === 'http://localhost:5173' &&
              request.setHeader('Origin', 'http://localhost:3000'),
          )
        },
      },
    },
  },
})
