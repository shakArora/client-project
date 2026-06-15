/**
 * Frontend Vite configuration with the React plugin and dev-server API proxy.
 * Forwards /api requests to the backend at localhost:3001 during local development.
 * @author Shivum Arora
 * @date 6/5/2026
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
