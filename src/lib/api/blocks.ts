import { apiGet } from "./client"

/** Un bloque de la taxonomía, en los dos idiomas. */
export type BlockOption = { nameEs: string; nameEn: string }

/** GET /api/blocks → bloques tácticos (ES+EN), en el orden de la taxonomía. */
export const getBlocks = () => apiGet<BlockOption[]>("/api/blocks")
