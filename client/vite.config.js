import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite + React — basic setup
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
