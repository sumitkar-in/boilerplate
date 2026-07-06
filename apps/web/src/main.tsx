import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './core/i18n/i18n'
import App from './App.tsx'
import { applyTheme, getInitialTheme } from './core/theme'

applyTheme(getInitialTheme())

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
