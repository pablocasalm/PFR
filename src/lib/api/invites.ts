import { apiPost, apiGet, apiDelete } from "./client"

/**
 * Invitaciones de beta. Quien tiene un código gastado puede solicitar otro por email
 * (§ beta). Si ya existe una cuenta con ese email, o una invitación sin usar, el backend
 * responde con error — el mensaje viene ya en `language`.
 */
export const requestInvite = (email: string, language: string) =>
  apiPost<{ ok: boolean; message?: string }>("/api/invite-requests", { email, language })

/** GET /api/invites/{code} (público) → email e idioma de una invitación sin usar. La pantalla
 * de registro lo usa para rellenar el email: el enlace de invitación ya no lo lleva en la URL.
 * Si la invitación ha caducado responde 410 (ApiError con status 410). */
export const getInviteInfo = (code: string) =>
  apiGet<{ email: string; language: string }>(`/api/invites/${encodeURIComponent(code)}`)

/** Categoría de facturación (independiente del rol) — base para cuando esté Stripe conectado. */
export type BillingPlan = "Free" | "TrialThenPaid" | "Discounted"

/** Invitación generada por el admin: email al que se emitió, su código y el link de registro. */
export type GeneratedInvite = { email: string; code: string; link: string; planType: BillingPlan; language: string }

/** POST /api/admin/invites (Admin) → genera un código por email, lo envía (en `language`) y devuelve el mapeo. */
export const generateInvites = (emails: string[], language: string) =>
  apiPost<GeneratedInvite[]>("/api/admin/invites", { emails, language })

/** Un código de invitación con su estado (para la gestión del admin). */
export type InviteCode = {
  id: number
  code: string
  email: string
  used: boolean
  usedAtUtc: string | null
  createdAtUtc: string
  /** Hasta cuándo se puede canjear (las de la lista de espera: 7 días). Null = no caduca. */
  expiresAtUtc: string | null
  /** "activated" (ya creó su cuenta), "pending" o "expired" (7 días sin crear la contraseña). */
  status: InviteStatus
  /** Recordatorios enviados (0, 1 o 2: a los 3 y a los 6 días). */
  remindersSent: number
  planType: BillingPlan
  language: string
  link: string
}

export type InviteStatus = "activated" | "pending" | "expired"

/** POST /api/admin/invites/test-emails (Admin) → la invitación y los dos recordatorios, con un
 * código de prueba, solo a esa dirección. No crea ninguna invitación. */
export const sendInviteTestEmails = (to: string, language: string) =>
  apiPost<{ ok: boolean; sent: number }>("/api/admin/invites/test-emails", { to, language })

/** GET /api/admin/invites (Admin) → todos los códigos generados, con su estado. */
export const listInvites = () => apiGet<InviteCode[]>("/api/admin/invites")

/** DELETE /api/admin/invites/{id} (Admin) → elimina un código. */
export const deleteInvite = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/invites/${id}`)

/** Solicitud de acceso pendiente (formulario público de la landing o "pedir otro código"). */
export type InviteRequestItem = {
  id: number
  email: string
  createdAtUtc: string
  /** "es"/"en": el de la landing al apuntarse o el del botón del email; null si no se sabe. */
  language: string | null
  /** Cuándo se le envió el email de acceso anticipado (null = todavía no). */
  announcedAtUtc: string | null
  /** Primer clic en el botón de confirmación de ese email (null = sin confirmar). */
  confirmedAtUtc: string | null
}

/** GET /api/admin/invite-requests (Admin) → solicitudes pendientes (sin atender todavía). */
export const listInviteRequests = () => apiGet<InviteRequestItem[]>("/api/admin/invite-requests")

/** DELETE /api/admin/invite-requests/{id} (Admin) → descarta una solicitud sin invitar (pruebas, email mal escrito). */
export const deleteInviteRequest = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/invite-requests/${id}`)

/** Resultado de enviar el email de acceso anticipado: cuántos salieron y cuántos se saltaron (ya avisados). */
export type AnnounceResult = { ok: boolean; test: boolean; sent: number; skipped: number }

/** POST /api/admin/invite-requests/announce (Admin) → envío de prueba del email de acceso anticipado a una sola dirección. */
export const sendAnnounceTest = (testTo: string) =>
  apiPost<AnnounceResult>("/api/admin/invite-requests/announce", { testTo })

/** POST /api/admin/invite-requests/announce (Admin) → envío real del email de acceso anticipado a esas solicitudes. */
export const sendAnnounce = (ids: number[]) =>
  apiPost<AnnounceResult>("/api/admin/invite-requests/announce", { ids })
