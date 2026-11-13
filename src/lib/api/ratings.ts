import { apiGet, apiPost } from "./client"

/**
 * Valoración de la plataforma (estrellas de 1 a 5 y texto opcional). Cuándo se pide lo decide el
 * backend (RatingPrompt): tras unos días de uso, y si no responde, cada vez más espaciado hasta que
 * lo haga. Una vez enviada queda fija.
 */

/** GET /api/rating/prompt → si ahora toca pedirla. */
export const getRatingPrompt = () => apiGet<{ show: boolean }>("/api/rating/prompt")

/** POST /api/rating/event → "shown" al enseñarla, "later" con «Más tarde» o al cerrarla. Nunca molesta. */
export const sendRatingEvent = (action: "shown" | "later") => {
  apiPost<{ ok: boolean }>("/api/rating/event", { action }).catch(() => {})
}

export type RatingSubmission = {
  stars: number
  comment?: string
  language: string
  /** Solo con 4-5 estrellas y texto. */
  consentPublishText?: boolean
  consentPublishName?: boolean
}

/** POST /api/rating → envía la valoración (409 si ya la había enviado). */
export const submitRating = (body: RatingSubmission) => apiPost<{ ok: boolean }>("/api/rating", body)

export type AdminRatingGroup = { key: string; count: number; average: number | null }

export type AdminRatingsSummary = {
  count: number
  average: number | null
  distribution: { stars: number; count: number }[]
  byTier: AdminRatingGroup[]
  byStatus: AdminRatingGroup[]
  /** Personas a las que se les ha enseñado alguna vez. */
  shown: number
  /** Se les ha enseñado y aún no han respondido. */
  pending: number
  /** De esas, las que han pulsado «Más tarde» o la han cerrado. */
  snoozed: number
  withComment: number
  consentText: number
}

export type AdminRating = {
  id: number
  userId: number
  email: string
  displayName: string | null
  stars: number
  comment: string | null
  language: string | null
  tier: string | null
  accountStatus: string | null
  activeDays: number | null
  timesShown: number
  firstShownAtUtc: string | null
  submittedAtUtc: string
  consentPublishText: boolean | null
  consentPublishName: boolean | null
  isTeam: boolean
}

/** GET /api/admin/ratings (Admin). */
export const getAdminRatings = (excludeTeam: boolean) =>
  apiGet<{ summary: AdminRatingsSummary; items: AdminRating[] }>(`/api/admin/ratings?excludeTeam=${excludeTeam}`)
