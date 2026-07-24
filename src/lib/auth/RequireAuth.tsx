import { Navigate } from "react-router-dom"
import { useAuth } from "./store"

/**
 * Puerta de la app. Toda la zona /app vive detrás de sesión (app.padelfilmroom),
 * así que sin token se redirige a /login. No hay contenido público dentro de /app.
 */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default RequireAuth
