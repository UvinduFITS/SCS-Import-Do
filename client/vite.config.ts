import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// During dev the API runs on PORT (default 4000). Adjust the proxy target via
// VITE_API_PROXY if your backend runs elsewhere.
const apiTarget = process.env.VITE_API_PROXY || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@scs/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Fixed, dedicated port so this app never silently moves to 5174+ when another
    // dev server (e.g. a portfolio on 5173) is running. strictPort fails loudly
    // instead of shifting, so the URL is always http://localhost:5180.
    port: 5180,
    strictPort: true,
    // Allow importing the sibling `shared` package source.
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
});
