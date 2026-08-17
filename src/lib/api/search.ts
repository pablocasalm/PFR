import { apiGet } from "./client"
import type { SearchResponse } from "./types"

/**
 * Pantalla de Resultados (§11). El frontend define el contrato; el backend se adapta.
 * Una única llamada sirve a todos los orígenes: búsqueda, "Ver todo", conceptos y filtros globales.
 *
 * GET /api/search?q&block&concept&level&type&sort&feed
 *  - q: texto libre. El backend lo soporta (match por substring, bidireccional), pero
 *    Search.tsx ya NO lo manda: hace fuzzy matching en cliente con Fuse.js sobre el catálogo
 *    completo, para tolerar plurales/erratas y mostrar resultados parecidos aunque no haya
 *    match exacto (§11.7). Queda disponible para otros posibles consumidores de la API.
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
