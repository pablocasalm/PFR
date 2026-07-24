import { apiGet } from "./client"
import type { ClipDetail } from "./types"

/**
 * GET /api/clips/{id} → detalle de un clip (forma definida por el frontend: ClipDetail).
 * El backend debe adaptarse a este contrato.
 */
export const getClipDetail = (id: string) => apiGet<ClipDetail>(`/api/clips/${id}`)
