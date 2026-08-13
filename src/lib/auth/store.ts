import { useSyncExternalStore } from "react"
import { apiLogin, apiRegister } from "../api/auth"
import { clearSaved } from "../saved/store"
import { invalidateApiCache } from "../hooks/useApi"

/**
 * Estado de sesión sin provider global (coherente con el README): un store de módulo
 * con persistencia en localStorage y suscripción vía useSyncExternalStore.
 * El token lo lee también `api/client` (misma clave "token") para adjuntarlo a las peticiones.
 */

export type UserRole = "User" | "Admin" | "ContentCreator"
export type AuthUser = { email: string; displayName?: string | null; role?: UserRole }
type AuthState = { token: string | null; user: AuthUser | null }

/** Pueden publicar contenido los ContentCreator y los Admin. El resto solo consume. */
export function canPublish(user: AuthUser | null): boolean {
  return user?.role === "ContentCreator" || user?.role === "Admin"
}

/** Solo los Admin acceden a la gestión (invitaciones, etc.). */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "Admin"
}

const TOKEN_KEY = "token"
const USER_KEY = "user"

function read(): AuthState {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)
  let user: AuthUser | null = null
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser
    } catch {
      user = null
    }
  }
  return { token, user }
}

let state: AuthState = read()
const listeners = new Set<() => void>()

function setState(next: AuthState) {
  state = next
  if (next.token) localStorage.setItem(TOKEN_KEY, next.token)
  else localStorage.removeItem(TOKEN_KEY)
  if (next.user) localStorage.setItem(USER_KEY, JSON.stringify(next.user))
  else localStorage.removeItem(USER_KEY)
  listeners.forEach((l) => l())
}

function getAuth() {
  return state
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export async function login(email: string, password: string) {
  const res = await apiLogin(email, password)
  setState({
    token: res.token ?? null,
    user: { email: res.email ?? email, displayName: res.displayName, role: res.role as UserRole | undefined },
  })
}

export async function register(email: string, password: string, displayName?: string, inviteCode?: string) {
  const res = await apiRegister(email, password, displayName, inviteCode)
  setState({
    token: res.token ?? null,
    user: { email: res.email ?? email, displayName: res.displayName, role: res.role as UserRole | undefined },
  })
}

export function logout() {
  setState({ token: null, user: null })
  clearSaved() // Mi Lista es por-cuenta: se vacía al salir.
  invalidateApiCache() // no dejar datos cacheados de la cuenta anterior.
}

/** Hook de sesión: { token, user, isAuthenticated } + acciones. */
export function useAuth() {
  const s = useSyncExternalStore(subscribe, getAuth, getAuth)
  return { token: s.token, user: s.user, isAuthenticated: !!s.token, login, register, logout }
}
