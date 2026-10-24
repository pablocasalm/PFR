import { Navigate, useSearchParams } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuth, hasActiveSubscription } from "./store"
import { useI18n } from "../i18n/store"
import LegalLinks from "../ui/LegalLinks"
import Precios from "../../pages/App/pages/Precios"

/**
 * /suscripcion — elegir plan para quien tiene cuenta pero todavía no tiene suscripción (24/10/2026).
 * Está fuera de la app a propósito: sin menú, sin tour y sin pantallas a las que no puede entrar.
 * Llega aquí quien cierra Stripe sin pagar, quien entra con una cuenta sin suscripción y quien ya
 * acabó su prueba. Con acceso, a Inicio.
 */
const SubscribePage = () => {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const [params] = useSearchParams()
  const checkout = params.get("checkout")

  if (user && hasActiveSubscription(user)) return <Navigate to="/app/inicio" replace />

  return (
    <div className="min-h-screen bg-midnight bg-film-room px-4 pb-10 pt-6 text-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="/Logos/favicon_sinfondo.png" alt="Padel Film Room" className="h-9 w-9 object-contain" />
          <span className="text-sm font-bold uppercase tracking-wide">Padel Film Room</span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          {t("header.logout", "Cerrar sesión")}
        </button>
      </div>

      {checkout === "cancelled" && (
        <p className="mx-auto mt-6 w-full max-w-5xl rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {t("subscribe.cancelled", "No se ha completado el pago y no se te ha cobrado nada. Elige un plan cuando quieras.")}
        </p>
      )}
      {checkout === "pending" && (
        <p className="mx-auto mt-6 w-full max-w-5xl rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {t("subscribe.pending", "Si acabas de pagar, tu suscripción se está activando: recarga la página en un minuto. Si no, escríbenos a hello@padelfilmroom.com.")}
        </p>
      )}

      <Precios standalone />
      <LegalLinks className="justify-center" />
    </div>
  )
}

export default SubscribePage
