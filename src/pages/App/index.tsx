import { Outlet } from "react-router-dom"
import Header from "./components/Header"

/**
 * AppLayout — Layout principal de la app. Standalone en /app (sin backend).
 * Comparte el Header entre las secciones hijas (Inicio, Explorar, Mi Lista, Mi Juego)
 * que se renderizan en el <Outlet/>. Solo visual; se itera con los mockups.
 */
const AppLayout = () => (
  <div className="min-h-screen bg-midnight bg-film-room text-white">
    <Header />
    {/* Padding horizontal compartido por todas las secciones (igual que el navbar). */}
    <div className="px-10">
      <Outlet />
    </div>
  </div>
)

export default AppLayout
