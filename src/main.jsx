/**
 * Bootstraps the root Vite React app by mounting App.jsx into the DOM with StrictMode. Entry point for the standalone marketing prototype in the repo root.
 * @name Shivum Arora
 * @date 2026-05-27
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
