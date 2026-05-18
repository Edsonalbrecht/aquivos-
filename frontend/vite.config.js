import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['react-simple-maps', 'd3-scale', 'd3-interpolate'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-socket': ['socket.io-client'],
        }
      }
    }
  }
});
