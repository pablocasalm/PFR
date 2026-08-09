import { Outlet } from "react-router-dom"
import Header from "./components/Header"
import MobileNav from "./components/MobileNav"

/**
 * AppLayout — Layout principal de la app (/app). Header arriba, contenido en el
 * <Outlet/>, y una barra de navegación inferior en móvil (MobileNav).
 */
const AppLayout = () => (
  <div className="min-h-screen bg-midnight bg-film-room text-white">
    <Header />
    {/* Padding lateral responsive + espacio inferior para la barra móvil.
        overflow-x-clip: red de seguridad contra scroll horizontal en móvil. */}
    <div className="overflow-x-clip px-4 pb-24 sm:px-6 md:pb-8 lg:px-10">
      <Outlet />
    </div>
    <MobileNav />
  </div>
)

export default AppLayout
