import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022'
  },
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true
  }
});
