/**
 * Root Vite configuration enabling the React plugin for the repository's top-level frontend entry.
 * Provides the default dev/build setup without API proxying (contrast with frontend/vite.config.js).
 * @author Shivum Arora
 * @date 5/27/2026
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
