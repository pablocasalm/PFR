import { apiGet } from "./client"

/** Concepto dentro de su bloque: `number` es su posición en el bloque ("3.2" = 2.º del bloque 3). */
export type BlockConceptOption = { id: number; nameEs: string; nameEn: string; number: number }

/** Un bloque de la taxonomía, en los dos idiomas, con su número (1–8) y sus conceptos en orden. */
export type BlockOption = { id?: number; nameEs: string; nameEn: string; number?: number; concepts?: BlockConceptOption[] }

/** GET /api/blocks → bloques tácticos (ES+EN), en el orden de la taxonomía. */
export const getBlocks = () => apiGet<BlockOption[]>("/api/blocks")
