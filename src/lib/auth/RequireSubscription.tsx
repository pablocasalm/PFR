import { useEffect, useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"
import { useAuth, hasActiveSubscription, refreshSubscriptionState } from "./store"
import { useI18n } from "../i18n/store"

// Vuelta de Stripe Checkout: cuántas veces (cada 2 s) se vuelve a mirar si el webhook ya ha dado
// el acceso antes de rendirse y mandar a Precios.
const CHECKOUT_RETRIES = 10

/**
 * Paywall: además de sesión (RequireAuth), exige suscripción activa (o exención Free/trial
 * vigente, ver hasActiveSubscription). Sin ella, manda a la pantalla de precios.
 *
 * Al volver de Stripe Checkout (?checkout=success) la app puede llegar antes que el aviso de
 * Stripe a nuestro servidor: en vez de mandar a Precios a quien acaba de pagar, espera unos
 * segundos refrescando la sesión hasta que el acceso aparece.
 */
const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const { t } = useI18n()
  const { user } = useAuth()
  const [params] = useSearchParams()
  // Se lee una sola vez: el layout (pages/App/index.tsx) quita el parámetro de la URL enseguida.
  const [returningFromCheckout] = useState(() => params.get("checkout") === "success")
  const [gaveUp, setGaveUp] = useState(false)
  const hasAccess = hasActiveSubscription(user)

  useEffect(() => {
    if (!returningFromCheckout || hasAccess || gaveUp) return
    let tries = 0
    const id = window.setInterval(() => {
      tries += 1
      refreshSubscriptionState()
      if (tries >= CHECKOUT_RETRIES) {
        window.clearInterval(id)
        setGaveUp(true)
      }
    }, 2000)
    return () => window.clearInterval(id)
  }, [returningFromCheckout, hasAccess, gaveUp])

  if (!hasAccess) {
    if (returningFromCheckout && !gaveUp) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <p className="text-sm text-white/70">{t("checkout.activating", "Activando tu suscripción…")}</p>
        </div>
      )
    }
    return <Navigate to="/app/precios" replace />
  }
  return <>{children}</>
}

export default RequireSubscription
