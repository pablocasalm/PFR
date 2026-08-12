import { apiPost, apiGet, apiDelete } from "./client"

/**
 * Invitaciones de beta. Quien tiene un código gastado puede solicitar otro por email
 * (§ beta). Si ya existe una cuenta con ese email, el backend responde con error.
 */
export const requestInvite = (email: string) =>
  apiPost<{ ok: boolean; message?: string }>("/api/invite-requests", { email })

/** Invitación generada por el admin: email al que se emitió, su código y el link de registro. */
export type GeneratedInvite = { email: string; code: string; link: string }

/** POST /api/admin/invites (Admin) → genera un código por email, lo envía y devuelve el mapeo. */
export const generateInvites = (emails: string[]) =>
  apiPost<GeneratedInvite[]>("/api/admin/invites", { emails })

/** Un código de invitación con su estado (para la gestión del admin). */
export type InviteCode = {
  id: number
  code: string
  email: string
  used: boolean
  usedAtUtc: string | null
  createdAtUtc: string
  link: string
}

/** GET /api/admin/invites (Admin) → todos los códigos generados, con su estado. */
export const listInvites = () => apiGet<InviteCode[]>("/api/admin/invites")

/** DELETE /api/admin/invites/{id} (Admin) → elimina un código. */
export const deleteInvite = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/invites/${id}`)
