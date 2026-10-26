import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Em desenvolvimento, /api é encaminhado para a API Node.js (porta 3333).
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3333', changeOrigin: true } },
  },
});
