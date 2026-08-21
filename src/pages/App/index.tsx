import { useEffect, useRef } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import Header from "./components/Header"
import MobileNav from "./components/MobileNav"
import FeedbackButton from "./components/FeedbackButton"
import ScrollToTop from "../../lib/ui/ScrollToTop"
import { hydrateSaved } from "../../lib/saved/store"
import { useAuth } from "../../lib/auth/store"
import { startOnboardingTour } from "../../lib/onboarding/tour"

/**
 * AppLayout — Layout principal de la app (/app). Header arriba, contenido en el
 * <Outlet/>, y una barra de navegación inferior en móvil (MobileNav).
 */
const AppLayout = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Al entrar en la zona con sesión, sincroniza Mi Lista con la cuenta (/api/saved).
  useEffect(() => {
    hydrateSaved()
  }, [])

  // Tour de bienvenida (beta): lo recuerda el backend (User.HasSeenOnboarding), no el
  // dispositivo — así que sale igual la primera vez que la cuenta entra, venga de donde venga.
  const tourStarted = useRef(false)
  useEffect(() => {
    if (tourStarted.current || !user || user.hasSeenOnboarding) return
    tourStarted.current = true
    startOnboardingTour(navigate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="min-h-screen bg-midnight bg-film-room text-white">
      <ScrollToTop />
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
