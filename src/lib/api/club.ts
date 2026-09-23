import { apiGet, apiPost, apiDelete } from "./client"
import type { MonthlyPick } from "./types"

/** Igual que MonthlyPick, con la fecha de publicación — solo la ve el admin en el histórico. */
export type AdminMonthlyPick = MonthlyPick & { publishedAtUtc: string }

/**
 * Hub "Club" (§Stripe 3 planes, Fase 1: Recomendado del mes). El frontend define el contrato;
 * el backend se adapta.
 */

/** GET /api/club/monthly-pick → el último publicado, o null si todavía no hay ninguno. El
 * backend responde 204 en ese caso — apiFetch, sin body que parsear, devuelve `{}` (no `null`,
 * ver client.ts), así que se detecta por la ausencia de `id` en vez de comprobar la propia
 * respuesta directamente. */
export const getMonthlyPick = async (): Promise<MonthlyPick | null> => {
  const data = await apiGet<Partial<MonthlyPick>>("/api/club/monthly-pick")
  return data.id != null ? (data as MonthlyPick) : null
}

/* ---- Gestión (solo Admin) ---- */

export type CreateMonthlyPickInput = {
  month: string // "yyyy-MM"
  note?: string
  noteEn?: string
  items: { contentType: "clip" | "analysis"; contentId: string }[]
  conceptIds: number[]
}

/** GET /api/admin/monthly-picks → histórico completo, más reciente primero. */
export const adminListMonthlyPicks = () => apiGet<AdminMonthlyPick[]>("/api/admin/monthly-picks")

/** POST /api/admin/monthly-picks → publica la selección de un mes. */
export const createMonthlyPick = (input: CreateMonthlyPickInput) =>
  apiPost<AdminMonthlyPick>("/api/admin/monthly-picks", input)

/** DELETE /api/admin/monthly-picks/{id} → borra una selección publicada. */
export const deleteMonthlyPick = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/monthly-picks/${id}`)
