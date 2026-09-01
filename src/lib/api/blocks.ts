import { apiGet } from "./client"

/** GET /api/blocks → nombres de bloques tácticos (ES), en el orden de la taxonomía. */
export const getBlocks = () => apiGet<string[]>("/api/blocks")
