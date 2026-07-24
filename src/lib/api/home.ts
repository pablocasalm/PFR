import { apiGet } from "./client"
import type { HomeResponse } from "./types"

/**
 * GET /api/home → datos de la pantalla Inicio (endpoint con forma de pantalla / BFF).
 * El backend debe implementarlo según el contrato definido por el frontend (HomeResponse).
 */
export const getHome = () => apiGet<HomeResponse>("/api/home")
