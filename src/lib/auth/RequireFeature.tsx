import { Navigate } from "react-router-dom"
import { useAuth, hasActiveSubscription, hasFeature, type PlanFeature } from "./store"

/**
 * Paywall por tier (§Stripe 3 planes): además de sesión y suscripción activa (RequireSubscription,
 * que no cambia — el catálogo/Mi Lista/Mi Juego los dan los tres tiers por igual), exige que el
 * tier del usuario incluya `feature`. Sin ella, manda a la pantalla de precios, igual que
 * RequireSubscription.
 */
const RequireFeature = ({ feature, children }: { feature: PlanFeature; children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!hasActiveSubscription(user)) return <Navigate to="/app/precios" replace />
  if (!hasFeature(user, feature)) return <Navigate to="/app/precios" replace />
  return <>{children}</>
}

export default RequireFeature
