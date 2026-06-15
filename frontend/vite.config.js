/**
 * Configures the frontend Vite dev server with the React plugin and proxies /api requests to the local backend on port 3001. Used for local development of the full-stack Routed app.
 * @name Shivum Arora
 * @date 2026-06-05
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
