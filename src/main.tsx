import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Tras un deploy, los chunks con lazy() cambian de hash: un usuario con la app abierta
// puede pedir un chunk viejo que ya no existe ("Failed to fetch dynamically imported module").
// En ese caso recargamos para coger el build nuevo (con guarda anti-bucle de 10s).
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('chunkReloadAt') ?? 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem('chunkReloadAt', String(Date.now()))
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
