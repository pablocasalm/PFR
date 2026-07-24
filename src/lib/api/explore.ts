import { apiGet } from "./client"
import type { ExploreResponse } from "./types"

/** GET /api/explore → biblioteca táctica (forma definida por el frontend). */
export const getExplore = () => apiGet<ExploreResponse>("/api/explore")
