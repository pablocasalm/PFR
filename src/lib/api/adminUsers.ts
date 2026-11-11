import { apiGet } from "./client"

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
