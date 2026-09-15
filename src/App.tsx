import { useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import router from "./app/router/router"
import { hydrateI18n } from "./lib/i18n/store"

const App = () => {
  // Textos de la interfaz (i18n): hace falta incluso antes de iniciar sesión (login,
  // registro...), así que se carga aquí, en la raíz, no dentro del layout de /app.
  useEffect(() => {
    hydrateI18n()
  }, [])

  return <RouterProvider router={router} />
}

export default App
