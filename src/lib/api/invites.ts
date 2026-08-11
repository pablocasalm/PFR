import { apiPost } from "./client"

/**
 * Invitaciones de beta. Quien tiene un código gastado puede solicitar otro por email
 * (§ beta). Si ya existe una cuenta con ese email, el backend responde con error.
 */
export const requestInvite = (email: string) =>
  apiPost<{ ok: boolean; message?: string }>("/api/invite-requests", { email })
