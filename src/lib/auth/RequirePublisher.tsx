import { Navigate } from "react-router-dom"
import { useAuth, canPublish } from "./store"

/**
 * Protege las rutas de publicación: solo ContentCreator y Admin pueden entrar.
 * Un usuario normal (solo consume) se redirige a Inicio.
 */
const RequirePublisher = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!canPublish(user)) return <Navigate to="/app/inicio" replace />
  return <>{children}</>
}

export default RequirePublisher
