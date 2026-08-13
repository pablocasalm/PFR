import { apiPost, apiGet, apiDelete, apiPatch } from "./client"

/**
 * Feedback de beta. Envía el mensaje con el contexto (ruta y, si aplica, el contenido)
 * para poder triarlo. Requiere sesión.
 */
export type FeedbackType = "bug" | "idea" | "other"

export type FeedbackPayload = {
  message: string
  type?: FeedbackType
  page?: string
  contentType?: "clip" | "analysis"
  contentId?: string
}

export const sendFeedback = (payload: FeedbackPayload) =>
  apiPost<{ ok: boolean }>("/api/feedback", payload)

/* ---- Gestión (solo Admin) ---- */

export type FeedbackStatus = "new" | "in_progress" | "resolved"

/** Un reporte con su contexto y quién lo envió (para el panel de admin). */
export type FeedbackItem = {
  id: number
  message: string
  type: FeedbackType
  status: FeedbackStatus
  page: string | null
  contentType: string | null
  contentId: string | null
  userAgent: string | null
  adminNote: string | null
  userId: number
  userEmail: string | null
  userName: string | null
  createdAtUtc: string
  resolvedAtUtc: string | null
}

export type FeedbackCounts = { new: number; inProgress: number; resolved: number }

export type FeedbackList = { items: FeedbackItem[]; counts: FeedbackCounts }

/** GET /api/admin/feedback → reportes (con filtros opcionales) + contadores por estado. */
export const listFeedback = (filters?: { status?: FeedbackStatus; type?: FeedbackType }) => {
  const qs = new URLSearchParams()
  if (filters?.status) qs.set("status", filters.status)
  if (filters?.type) qs.set("type", filters.type)
  const suffix = qs.toString() ? `?${qs}` : ""
  return apiGet<FeedbackList>(`/api/admin/feedback${suffix}`)
}

/** PATCH /api/admin/feedback/{id} → cambia estado y/o nota interna. */
export const updateFeedback = (id: number, patch: { status?: FeedbackStatus; adminNote?: string }) =>
  apiPatch<{ ok: boolean; status: FeedbackStatus; resolvedAtUtc: string | null; adminNote: string | null }>(
    `/api/admin/feedback/${id}`,
    patch,
  )

/** DELETE /api/admin/feedback/{id} → elimina un reporte. */
export const deleteFeedback = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/feedback/${id}`)
