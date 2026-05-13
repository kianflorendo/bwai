import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  server: {
    proxy: {
      //Target your Node.js backend
      '/api-proxy': 'http://localhost:5000',
      '/ws-proxy': { target: 'ws://localhost:5000', ws: true },
    },
  },
  plugins: react(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
