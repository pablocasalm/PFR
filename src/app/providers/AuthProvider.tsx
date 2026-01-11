import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type AuthState = {
  isAuthenticated: boolean
  email: string | null
}

type AuthContextValue = AuthState & {
  login: (email: string) => void
  logout: () => void
}

const AUTH_STORAGE_KEY = "padel-film-room-auth"

const readStoredAuth = (): AuthState => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return { isAuthenticated: false, email: null }
  }
  try {
    const parsed = JSON.parse(raw) as AuthState
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      email: parsed.email ?? null,
    }
  } catch {
    return { isAuthenticated: false, email: null }
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => readStoredAuth())

  const persist = (nextState: AuthState) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState))
    setState(nextState)
  }

  const login = (email: string) =>
    persist({
      isAuthenticated: true,
      email,
    })

  const logout = () =>
    persist({
      isAuthenticated: false,
      email: null,
    })

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return context
}
