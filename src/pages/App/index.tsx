import { useEffect, useRef } from "react"
import { Outlet, useNavigate, useSearchParams } from "react-router-dom"
import Header from "./components/Header"
import MobileNav from "./components/MobileNav"
import FeedbackButton from "./components/FeedbackButton"
import ScrollToTop from "../../lib/ui/ScrollToTop"
import { hydrateSaved } from "../../lib/saved/store"
import { hydrateFolders } from "../../lib/saved/folders"
import SaveToSheet from "../../lib/saved/SaveToSheet"
import { trackActivity } from "../../lib/api/activity"
import { useAuth, refreshSubscriptionState, applyAccountState, getAuthUser, isAdmin, hasActiveSubscription, hasFeature } from "../../lib/auth/store"
import { startAccountHub, stopAccountHub, onHubEvent, currentUserId } from "../../lib/realtime/accountHub"
import { startOnboardingTour } from "../../lib/onboarding/tour"

/**
 * AppLayout — Layout principal de la app (/app). Header arriba, contenido en el
 * <Outlet/>, y una barra de navegación inferior en móvil (MobileNav).
 */
const AppLayout = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Al entrar en la zona con sesión, sincroniza Mi Lista con la cuenta (/api/saved).
  useEffect(() => {
    hydrateSaved()
    hydrateFolders()
    trackActivity("app_open") // métricas internas: días que entra cada usuario
  }, [])

  // Canal en tiempo real con el backend mientras hay sesión: si cambia el plan o la suscripción
  // (pago, cambio de plan, cancelación), la app lo refleja al momento, sin recargar.
  useEffect(() => {
    const offAccount = onHubEvent("accountChanged", applyAccountState)
    // Mensaje nuevo de Coach escrito por otra persona: sube el contador del menú. (El hilo que
    // esté abierto en pantalla lo descuenta él mismo — ver AnalysisThread.) Un alumno cuenta los
    // del equipo; un admin, los de los alumnos.
    const offMessage = onHubEvent("coachMessage", (message) => {
      const me = getAuthUser()
      if (message.authorUserId === currentUserId() || message.fromStaff === isAdmin(me)) return
      applyAccountState({ coachUnread: (me?.coachUnread ?? 0) + 1 })
    })
    startAccountHub()
    return () => {
      offAccount()
      offMessage()
      stopAccountHub()
    }
  }, [])

  // Vuelta de Stripe Checkout (ver Precios.tsx, successUrl=/app/inicio?checkout=success):
  // refresca los datos de suscripción sin esperar al próximo refresh natural del token, y
  // limpia el parámetro de la URL para que no se repita en un F5.
  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return
    refreshSubscriptionState()
    setSearchParams((prev) => {
      prev.delete("checkout")
      return prev
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Tour de bienvenida (beta): lo recuerda el backend (User.HasSeenOnboarding), no el
  // dispositivo — así que sale igual la primera vez que la cuenta entra, venga de donde venga.
  const tourStarted = useRef(false)
  useEffect(() => {
    // Solo con acceso: sin suscripción no se puede navegar por la app y el tour no tendría sentido.
    if (tourStarted.current || !user || user.hasSeenOnboarding || !hasActiveSubscription(user)) return
    tourStarted.current = true
    // Los pasos de Club solo con Club o Coach (con Essential esas pantallas llevan a Precios).
    startOnboardingTour(navigate, hasFeature(user, "monthlyPicks"))
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
      {/* «Guardar en…»: la abre el botón de guardar de cualquier tarjeta. */}
      <SaveToSheet />
      <FeedbackButton />
    </div>
  )
}

export default AppLayout
