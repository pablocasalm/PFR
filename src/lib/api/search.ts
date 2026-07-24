import { apiGet } from "./client"
import type { SearchResponse } from "./types"

/** GET /api/search?q= → Pantalla de Resultados (forma definida por el frontend). */
export const getSearch = (query: string) =>
  apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`)
