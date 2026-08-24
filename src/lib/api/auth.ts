import { apiPost, apiPostAuth } from "./client"

/** Respuesta de /api/auth/{login,register,refresh} (espejo de AuthResult del backend). */
export type AuthResponse = {
  ok: boolean
  message?: string
  token?: string
  email?: string
  displayName?: string | null
  role?: string // "User" | "Admin" | "ContentCreator"
  hasSeenOnboarding?: boolean
}

/**
 * POST /api/auth/login → token + datos de usuario. Lanza Error con el mensaje del backend si
 * falla. Con credenciales (cookie httpOnly): el backend manda también el refresh token, que
 * el navegador guarda solo — nunca es visible desde aquí.
 */
export const apiLogin = (email: string, password: string) =>
  apiPostAuth<AuthResponse>("/api/auth/login", { email, password })

/** POST /api/auth/register → crea el usuario y devuelve token. Requiere código de invitación (beta). */
export const apiRegister = (email: string, password: string, displayName?: string, inviteCode?: string) =>
  apiPostAuth<AuthResponse>("/api/auth/register", { email, password, displayName, inviteCode })

/** POST /api/auth/logout → revoca el refresh token en el servidor (no basta con borrarlo solo en el cliente). */
export const apiLogout = () => apiPostAuth<{ ok: boolean }>("/api/auth/logout")

/** POST /api/auth/request-password-reset → envía el email de recuperación (responde ok aunque el email no exista). */
export const requestPasswordReset = (email: string) =>
  apiPost<{ ok: boolean }>("/api/auth/request-password-reset", { email })

/** POST /api/auth/reset-password → canjea el token y fija la nueva contraseña. */
export const resetPassword = (token: string, newPassword: string) =>
  apiPost<{ ok: boolean }>("/api/auth/reset-password", { token, newPassword })

/** POST /api/auth/onboarding-seen → marca el tour de bienvenida (beta) como visto, para no repetirlo. */
export const markOnboardingSeen = () => apiPost<{ ok: boolean }>("/api/auth/onboarding-seen")
