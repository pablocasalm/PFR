import { apiGet, apiPatch, apiPost } from "./client"
import type { DiscountCodeInfo } from "./billing"
import type { PlanTier } from "../auth/store"

/** Estado de una cuenta, en claro (ver AdminUsersController en el backend). */
export type AdminUserStatus = "trial" | "paying" | "free" | "canceling" | "past_due" | "no_access" | "incomplete"

/** Una cuenta en Panel → Usuarios (solo lectura). */
export type AdminUser = {
  id: number
  email: string
  displayName: string | null
  createdAtUtc: string
  planType: string // "Free" | "TrialThenPaid" | "Discounted"
  tier: string // "Starter" | "Club" | "Coach"
  status: AdminUserStatus
  subscriptionStatus: string
  trialEndsAtUtc: string | null
  currentPeriodEndUtc: string | null
  pendingCancel: boolean
  pendingTier: string | null
  pendingChangeAtUtc: string | null
  founderPrice: boolean
  language: string
  lastActiveAtUtc: string | null
  country: string | null
  device: string | null
  arrivedBy: "pricing" | "invite" | "waitlist"
  origin: string | null
  utmMedium: string | null
  utmCampaign: string | null
  stripeCustomerId: string | null
  /** Código de descuento con el que se suscribió (el último), o null. */
  discountCode?: string | null
  /** Meses regalados como compensación (ver giftMonth). */
  giftedMonths?: number
  minutes: number
  surveys: string[]
  isTeam: boolean
}

/** Una página de cuentas: `total` con todos los filtros; `all` y `counts` (por estado) solo
 * con `hideTeam`, para los botones de estado. */
export type AdminUsersPage = {
  total: number
  all: number
  counts: Partial<Record<AdminUserStatus, number>>
  items: AdminUser[]
}

export type AdminUsersQuery = {
  skip: number
  take: number
  q?: string
  status?: AdminUserStatus | "all"
  plan?: string
  hideTeam?: boolean
}

/** GET /api/admin/users (Admin) → cuentas de 25 en 25, las más nuevas primero, ya filtradas. */
export const getAdminUsers = ({ skip, take, q, status, plan, hideTeam = true }: AdminUsersQuery) => {
  const params = new URLSearchParams({ skip: String(skip), take: String(take), hideTeam: String(hideTeam) })
  if (q?.trim()) params.set("q", q.trim())
  if (status && status !== "all") params.set("status", status)
  if (plan && plan !== "all") params.set("plan", plan)
  return apiGet<AdminUsersPage>(`/api/admin/users?${params}`)
}

// ── Códigos de descuento (Panel → Usuarios → Códigos, 11/11/2026) ─────────────────────────────

/** Un código con cuántas personas se han suscrito con él (según nuestra base de datos). */
export type AdminDiscountCode = { code: DiscountCodeInfo; users: number }

export type CreateDiscountCode = {
  code: string
  percentOff: number
  duration: "once" | "repeating" | "forever"
  durationInMonths?: number | null
  tiers: PlanTier[]
  firstTimeOnly: boolean
  maxRedemptions?: number | null
  expiresAtUtc?: string | null
  collaboratorId?: number | null
}

/** Quién se ha suscrito con un código. */
export type DiscountCodeUser = {
  userId: number
  email: string
  displayName: string | null
  tier: string
  /** "app" (casilla o enlace) o "checkout" (escrito en el pago de Stripe). */
  source: "app" | "checkout"
  createdAtUtc: string
}

export const getDiscountCodes = () => apiGet<AdminDiscountCode[]>("/api/admin/discount-codes")
export const createDiscountCode = (body: CreateDiscountCode) => apiPost<AdminDiscountCode>("/api/admin/discount-codes", body)
export const setDiscountCodeActive = (id: string, active: boolean) =>
  apiPost<{ code: DiscountCodeInfo }>(`/api/admin/discount-codes/${encodeURIComponent(id)}/active`, { active })
/** «Editar»: Stripe no deja cambiar un código, así que se desactiva y se crea otro con el mismo texto. */
export const replaceDiscountCode = (id: string, body: CreateDiscountCode) =>
  apiPost<AdminDiscountCode>(`/api/admin/discount-codes/${encodeURIComponent(id)}/replace`, body)

/** Un mes gratis (compensación): su próxima factura sale a 0 € y luego sigue pagando normal. */
export const giftMonth = (userId: number) => apiPost<{ ok: boolean }>(`/api/admin/users/${userId}/gift-month`, {})

export const getDiscountCodeUsers = (code: string) =>
  apiGet<DiscountCodeUser[]>(`/api/admin/discount-codes/${encodeURIComponent(code)}/users`)

// ── Colaboradores de los códigos (11/11/2026) ─────────────────────────────────────────────────

export type CollaboratorType = "person" | "company" | "media" | "club" | "other"

export type Collaborator = {
  id: number
  name: string
  type: CollaboratorType
  /** Web, perfil o red social, en texto libre. */
  link: string | null
  email: string | null
  notes: string | null
  userId: number | null
  /** Email de su cuenta en PFR, si tiene. */
  userEmail: string | null
  createdAtUtc: string
}

/** Un colaborador con cuántas personas se han suscrito con alguno de sus códigos. */
export type AdminCollaborator = { collaborator: Collaborator; users: number }

export type CollaboratorBody = {
  name: string
  type: CollaboratorType
  link?: string | null
  email?: string | null
  notes?: string | null
  /** Email de su cuenta en PFR (opcional). */
  userEmail?: string | null
}

export const getCollaborators = () => apiGet<AdminCollaborator[]>("/api/admin/collaborators")
export const createCollaborator = (body: CollaboratorBody) => apiPost<{ id: number; name: string }>("/api/admin/collaborators", body)
export const updateCollaborator = (id: number, body: CollaboratorBody) =>
  apiPatch<{ id: number; name: string }>(`/api/admin/collaborators/${id}`, body)
