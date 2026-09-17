import { useSyncExternalStore } from "react"
import { apiLogin, apiRegister, apiLogout, markOnboardingSeen } from "../api/auth"
import { refreshAccessToken } from "../api/client"
import { clearSaved } from "../saved/store"
import { invalidateApiCache } from "../hooks/useApi"
import { setLanguage } from "../i18n/store"

/**
 * Estado de sesión sin provider global (coherente con el README): un store de módulo
 * con persistencia en localStorage y suscripción vía useSyncExternalStore.
 * El token lo lee también `api/client` (misma clave "token") para adjuntarlo a las peticiones.
 */

export type UserRole = "User" | "Admin" | "ContentCreator"
export type BillingPlan = "Free" | "TrialThenPaid" | "Discounted"
export type SubscriptionStatus = "None" | "Trialing" | "Active" | "PastDue" | "Canceled"
export type AuthUser = {
  email: string
  displayName?: string | null
  role?: UserRole
  hasSeenOnboarding?: boolean
  planType?: BillingPlan
  trialEndsAtUtc?: string | null
  subscriptionStatus?: SubscriptionStatus
  subscriptionCurrentPeriodEndUtc?: string | null
  preferredLanguage?: string // "es" | "en"
  subtitlesDefaultOn?: boolean
}
type AuthState = { token: string | null; user: AuthUser | null }

/** Pueden publicar contenido los ContentCreator y los Admin. El resto solo consume. */
export function canPublish(user: AuthUser | null): boolean {
  return user?.role === "ContentCreator" || user?.role === "Admin"
}

/** Solo los Admin acceden a la gestión (invitaciones, etc.). */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "Admin"
}

/** Espejo de la regla de RequireActiveSubscriptionAttribute del backend: exento si es Free (beta
 * invitada directamente) o sigue dentro de su TrialEndsAtUtc, si no hace falta suscripción real. */
export function hasActiveSubscription(user: AuthUser | null): boolean {
  if (!user) return false
  if (user.planType === "Free") return true
  if (user.trialEndsAtUtc && new Date(user.trialEndsAtUtc) > new Date()) return true
  return user.subscriptionStatus === "Trialing" || user.subscriptionStatus === "Active"
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

function toAuthUser(res: Awaited<ReturnType<typeof apiLogin>>, fallbackEmail: string): AuthUser {
  return {
    email: res.email ?? fallbackEmail,
    displayName: res.displayName,
    role: res.role as UserRole | undefined,
    hasSeenOnboarding: res.hasSeenOnboarding,
    planType: res.planType as BillingPlan | undefined,
    trialEndsAtUtc: res.trialEndsAtUtc,
    subscriptionStatus: res.subscriptionStatus as SubscriptionStatus | undefined,
    subscriptionCurrentPeriodEndUtc: res.subscriptionCurrentPeriodEndUtc,
    preferredLanguage: res.preferredLanguage,
    subtitlesDefaultOn: res.subtitlesDefaultOn,
  }
}

// El idioma preferido vive en BD (por cuenta), no solo en localStorage (por dispositivo): en
// caso de conflicto gana la cuenta, así que cada vez que llega un AuthResult fresco (login,
// registro) se sincroniza el idioma de la interfaz con él, aunque este dispositivo ya tuviera
// otro elegido a mano.
function syncLanguageFromAccount(res: { preferredLanguage?: string }) {
  if (res.preferredLanguage) setLanguage(res.preferredLanguage)
}

export async function login(email: string, password: string) {
  const res = await apiLogin(email, password)
  setState({ token: res.token ?? null, user: toAuthUser(res, email) })
  syncLanguageFromAccount(res)
}

export async function register(email: string, password: string, displayName?: string, inviteCode?: string) {
  const res = await apiRegister(email, password, displayName, inviteCode)
  setState({ token: res.token ?? null, user: toAuthUser(res, email) })
  syncLanguageFromAccount(res)
}

/** Refresca los datos de suscripción del usuario tras volver de Stripe Checkout, sin esperar al
 * próximo refresh natural del token (ver Precios.tsx, `?checkout=success`). `refreshAccessToken`
 * ya deja el localStorage al día; aquí se vuelve a leer y se republica para que los componentes
 * suscritos con useAuth() se enteren al momento (si no, solo lo verían tras recargar). */
export async function refreshSubscriptionState() {
  const ok = await refreshAccessToken()
  if (ok) setState(read())
  return ok
}

export function logout() {
  // Antes el cierre de sesión era puramente local: el refresh token (cookie httpOnly)
  // seguía siendo válido 30 días aunque el usuario "cerrara sesión". Best-effort: no bloquea
  // el cierre visual si la llamada falla (sin red, backend caído...).
  apiLogout().catch(() => {})
  setState({ token: null, user: null })
  clearSaved() // Mi Lista es por-cuenta: se vacía al salir.
  invalidateApiCache() // no dejar datos cacheados de la cuenta anterior.
}

/** Marca el tour de bienvenida como visto: avisa al backend (recordado por cuenta, no por
 * dispositivo) y actualiza el estado local al momento. Reintenta el aviso al backend un par
 * de veces (con margen) antes de rendirse: un fallo puntual de red aquí no se nota en el
 * momento (localmente ya no se repite en esta sesión) pero deja el flag desincronizado y el
 * tour vuelve a salir en el próximo login — por eso vale la pena insistir un poco.
 */
export async function markOnboardingSeenAndSync() {
  if (state.user) setState({ ...state, user: { ...state.user, hasSeenOnboarding: true } }) // optimista

  const delaysMs = [500, 1500]
  for (let attempt = 0; ; attempt++) {
    try {
      await markOnboardingSeen()
      return
    } catch {
      if (attempt >= delaysMs.length) return // se agotaron los reintentos: no crítico
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]))
    }
  }
}

/** Actualiza el nombre visible en el estado local (tras guardarlo en el backend), sin
 * necesidad de recargar ni re-loguear — así el header y demás sitios lo reflejan al momento. */
export function setLocalDisplayName(displayName: string) {
  if (state.user) setState({ ...state, user: { ...state.user, displayName } })
}

/** Hook de sesión: { token, user, isAuthenticated } + acciones. */
export function useAuth() {
  const s = useSyncExternalStore(subscribe, getAuth, getAuth)
  return { token: s.token, user: s.user, isAuthenticated: !!s.token, login, register, logout }
}
