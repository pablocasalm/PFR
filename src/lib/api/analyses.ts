import { apiGet } from "./client"
import type { AnalysisDetail } from "./types"

/**
 * GET /api/analyses/{id} → detalle de un análisis completo (forma: AnalysisDetail).
 * El backend debe adaptarse a este contrato.
 */
export const getAnalysisDetail = (id: string) => apiGet<AnalysisDetail>(`/api/analyses/${id}`)
