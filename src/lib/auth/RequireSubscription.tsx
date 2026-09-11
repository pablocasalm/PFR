import { Navigate } from "react-router-dom"
import { useAuth, hasActiveSubscription } from "./store"

/**
 * Paywall: además de sesión (RequireAuth), exige suscripción activa (o exención Free/trial
 * vigente, ver hasActiveSubscription). Sin ella, manda a la pantalla de precios.
 */
const RequireSubscription = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!hasActiveSubscription(user)) return <Navigate to="/app/precios" replace />
  return <>{children}</>
}

export default RequireSubscription
