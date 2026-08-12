import { apiPost } from "./client"

/** Respuesta de /api/auth/{login,register} (espejo de AuthResult del backend). */
export type AuthResponse = {
  ok: boolean
  message?: string
  token?: string
  email?: string
  displayName?: string | null
  role?: string // "User" | "Admin" | "ContentCreator"
}

/** POST /api/auth/login → token + datos de usuario. Lanza Error con el mensaje del backend si falla. */
export const apiLogin = (email: string, password: string) =>
  apiPost<AuthResponse>("/api/auth/login", { email, password })

/** POST /api/auth/register → crea el usuario y devuelve token. Requiere código de invitación (beta). */
export const apiRegister = (email: string, password: string, displayName?: string, inviteCode?: string) =>
  apiPost<AuthResponse>("/api/auth/register", { email, password, displayName, inviteCode })

/** POST /api/auth/request-password-reset → envía el email de recuperación (responde ok aunque el email no exista). */
export const requestPasswordReset = (email: string) =>
  apiPost<{ ok: boolean }>("/api/auth/request-password-reset", { email })

/** POST /api/auth/reset-password → canjea el token y fija la nueva contraseña. */
export const resetPassword = (token: string, newPassword: string) =>
  apiPost<{ ok: boolean }>("/api/auth/reset-password", { token, newPassword })
