import { apiGet } from "./client"

/** Periodo del panel: últimos 7 o 30 días, o desde el inicio (0). */
export type MetricsDays = 7 | 30 | 0

export type MetricsFilters = {
  days: MetricsDays
  /** "all" o el día (yyyy-MM-dd) de la oleada. */
  wave: string
  /** "all" | "Starter" | "Club" | "Coach". */
  tier: string
  excludeTeam: boolean
}

export type MetricsPerson = {
  userId: number
  email: string
  displayName: string | null
  wave: string | null
  activatedAtUtc: string
  /** Día de la prueba (1–14) si sigue en ella; null si no. */
  trialDay: number | null
  trialEndsAtUtc: string | null
  lastActiveAtUtc: string | null
  activeDays: number
  minutes: number
  surveys: string[]
  tier: string
  status: string
  planType: string
  hasAccess: boolean
  /** Tiene acceso y lleva 3 días o más sin entrar. */
  atRisk: boolean
}

export type AdminMetrics = {
  generatedAtUtc: string
  days: number
  waves: { date: string; invited: number }[]
  summary: {
    withAccess: number
    trialing: number
    paying: number
    active7: number
    active7Previous: number
    minutes: number
    minutesPrevious: number | null
    conversionConverted: number
    conversionBase: number
  }
  /** Embudo de los invitados de la beta de la oleada elegida (no depende del plan ni del periodo). */
  funnel: {
    invited: number
    activated: number
    expired: number
    watched: number
    activeWeek1: number
    surveyD4: number
    surveyD4Sent: number
    surveyD12: number
    surveyD12Sent: number
    paid: number
  }
  people: MetricsPerson[]
}

/** GET /api/admin/metrics (Admin). */
export const getAdminMetrics = (f: MetricsFilters) =>
  apiGet<AdminMetrics>(`/api/admin/metrics?days=${f.days}&wave=${encodeURIComponent(f.wave)}&tier=${f.tier}&excludeTeam=${f.excludeTeam}`)

export type ContentStat = { id: string; title: string; titleEn: string | null; people: number; completed: number; minutes: number }
export type KeyCount = { key: string; count: number }

/** Métricas v2: actividad por día, contenido más visto y lista de espera. */
export type MetricsInsights = {
  generatedAtUtc: string
  days: MetricsDays
  /** Un día por fila (Madrid, yyyy-MM-dd); con `days=0`, los últimos 90. */
  daily: { day: string; people: number; minutes: number }[]
  content: {
    clips: ContentStat[]
    analyses: ContentStat[]
    sessions: ContentStat[]
    concepts: { id: number; nameEs: string; nameEn: string | null; people: number }[]
  }
  waitlist: {
    total: number
    inPeriod: number
    daily: { day: string; count: number }[]
    funnel: { signedUp: number; confirmed: number; invited: number; activated: number }
    source: KeyCount[]
    country: KeyCount[]
    device: KeyCount[]
    language: KeyCount[]
  }
}

/** GET /api/admin/metrics/insights (Admin). No le afectan la oleada ni el plan. */
export const getMetricsInsights = (days: MetricsDays, excludeTeam: boolean) =>
  apiGet<MetricsInsights>(`/api/admin/metrics/insights?days=${days}&excludeTeam=${excludeTeam}`)
