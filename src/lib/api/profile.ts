import { apiGet, apiPatch, apiPost } from "./client"

/** Respuesta de GET /api/users/me. */
export type ProfileResponse = {
  email: string
  displayName?: string | null
  role: string // "User" | "Admin" | "ContentCreator"
  planType: string // "Free" | "TrialThenPaid" | "Discounted"
  trialEndsAtUtc?: string | null
}

/** GET /api/users/me → datos del propio perfil (email, nombre, rol, plan). */
export const getMyProfile = () => apiGet<ProfileResponse>("/api/users/me")

/** PATCH /api/users/me → cambia el nombre visible. */
export const updateProfile = (displayName: string) =>
  apiPatch<{ displayName: string }>("/api/users/me", { displayName })

/** POST /api/users/me/change-password → cambia la contraseña (pide la actual). */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiPost<{ ok: boolean }>("/api/users/me/change-password", { currentPassword, newPassword })
