import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4176,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4005',
        changeOrigin: true,
      },
      // Locally-stored uploads (e.g. profile photos) served by the API in dev
      '/uploads': {
        target: 'http://localhost:4005',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4176,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor bundles for better browser caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['@heroicons/react', 'react-hot-toast', 'emoji-picker-react'],
        },
      },
    },
  },
});
