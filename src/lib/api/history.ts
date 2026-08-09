import { apiGet, apiPost } from "./client"
import type { ContentItem } from "./types"

/**
 * Historial de visionado (§6/§7.2/§13). Requiere sesión.
 * El reproductor llama a saveProgress; Inicio ("Continúa viendo") y Mi Juego leen de aquí.
 */

export const saveProgress = (
  contentType: "clip" | "analysis",
  contentId: string,
  positionSeconds: number,
  durationSeconds: number,
) =>
  apiPost<{ ok: boolean; saved: boolean; completed?: boolean }>("/api/history/progress", {
    contentType,
    contentId,
    positionSeconds,
    durationSeconds,
  })

/** GET /api/history/recent → vistos recientemente (§12.4). */
export const getRecent = () => apiGet<ContentItem[]>("/api/history/recent")

/** Stats de Mi Juego (§13). */
export type MiJuegoStats = {
  minutes: number
  clipsViewed: number
  analysesViewed: number
  concepts: { name: string; count: number }[]
  blocks: { name: string; count: number }[]
}

export const getStats = () => apiGet<MiJuegoStats>("/api/history/stats")
