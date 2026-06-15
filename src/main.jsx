/**
 * Runs App.jsx in the browser to display the React frontend. This imports the CSS, React JS, and React-DOM to bundle with App.jsx. 
 * @author Shivum Arora
 * @date 5/27/2026  
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
