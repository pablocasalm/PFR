import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../providers/AuthProvider"

type RequireAuthProps = {
  children: JSX.Element
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
