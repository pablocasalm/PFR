import { apiGet } from "./client"
import type { SearchResponse } from "./types"

/**
 * Pantalla de Resultados (§11). El frontend define el contrato; el backend se adapta.
 * Una única llamada sirve a todos los orígenes: búsqueda, "Ver todo", conceptos y filtros globales.
 *
 * GET /api/search?q&block&concept&level&type&sort&feed
 *  - q: texto libre (título, jugador, torneo, partido, concepto/bloque escritos).
 *  - block: bloque táctico (nombre de la taxonomía).
 *  - concept: concepto (#) aplicado como filtro.
 *  - level: "intermedio" | "avanzado" (vacío = todos).
 *  - type: "clip" | "analysis" (vacío = ambos).
 *  - sort: "relevance" | "recent" | "views" | "duration".
 *  - feed: "new" (nuevo esta semana) | "popular" (más vistos esta semana).
 */
export type SearchParams = {
  q?: string
  block?: string
  concept?: string
  level?: string
  type?: string
  sort?: string
  feed?: string
}

export const getSearch = (params: SearchParams) => {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value)
  }
  const q = qs.toString()
  return apiGet<SearchResponse>(`/api/search${q ? `?${q}` : ""}`)
}
