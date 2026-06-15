/**
 * Configures the root Vite project with the React plugin for the standalone marketing app in src/. Minimal setup without API proxy since it is separate from the frontend app.
 * @name Shivum Arora
 * @date 2026-05-27
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
