import { apiGet, apiPost } from "./client"
import type { SavedListResponse } from "./types"

/**
 * Mi Lista (§12): contenido guardado por el usuario. Todos los endpoints requieren auth.
 * Sustituye al antiguo "bookmarks" (que solo cubría clips); ahora guarda clips y análisis.
 */

/** GET /api/saved → pantalla Mi Lista (clips y análisis guardados, recientes primero). */
export const getSavedList = () => apiGet<SavedListResponse>("/api/saved")

/** GET /api/saved/ids → claves guardadas ("clip:c1", "analysis:a1") para marcar el estado en tarjetas. */
export const getSavedIds = () => apiGet<string[]>("/api/saved/ids")

/** POST /api/saved/toggle → añade o quita contenido de Mi Lista. Devuelve `{ ok, saved }`. */
export const toggleSaved = (contentType: "clip" | "analysis", contentId: string) =>
  apiPost<{ ok: boolean; saved: boolean }>("/api/saved/toggle", { contentType, contentId })
