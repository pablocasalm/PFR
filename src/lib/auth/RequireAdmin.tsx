import { Navigate } from "react-router-dom"
import { useAuth, isAdmin } from "./store"

/**
 * Protege las rutas de administración (invitaciones, etc.): solo Admin.
 * Cualquier otro rol se redirige a Inicio.
 */
const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!isAdmin(user)) return <Navigate to="/app/inicio" replace />
  return <>{children}</>
}

export default RequireAdmin
