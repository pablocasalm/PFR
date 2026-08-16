import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import Header from "./components/Header"
import MobileNav from "./components/MobileNav"
import FeedbackButton from "./components/FeedbackButton"
import { hydrateSaved } from "../../lib/saved/store"

/**
 * AppLayout — Layout principal de la app (/app). Header arriba, contenido en el
 * <Outlet/>, y una barra de navegación inferior en móvil (MobileNav).
 */
const AppLayout = () => {
  // Al entrar en la zona con sesión, sincroniza Mi Lista con la cuenta (/api/saved).
  useEffect(() => {
    hydrateSaved()
  }, [])

  return (
    <div className="min-h-screen bg-midnight bg-film-room text-white">
      <Header />
      {/* Padding lateral responsive + espacio inferior para la barra móvil/tablet (hasta xl).
          overflow-x-clip: red de seguridad contra scroll horizontal en móvil. */}
      <div className="overflow-x-clip px-4 pb-24 sm:px-6 lg:px-10 xl:pb-8">
        <Outlet />
      </div>
      <MobileNav />
      <FeedbackButton />
    </div>
  )
}

export default AppLayout
