import { useMemo } from "react"
import { getBlocks, type BlockOption } from "./api/blocks"
import { useApi } from "./hooks/useApi"

/**
 * Taxonomía de bloques y conceptos con su numeración (Base de conocimiento): "3.2" es el 2.º
 * concepto DEL BLOQUE 3, no el 2.º concepto en general. Sale de GET /api/blocks.
 */
export type ConceptCode = { id: number; code: string; blockNumber: number; conceptNumber: number; block: BlockOption }

export type Taxonomy = {
  blocks: BlockOption[]
  /** Por nombre de concepto en español (la clave que llevan los contenidos). */
  byConcept: Map<string, ConceptCode>
  /** Por nombre de bloque en español. */
  byBlock: Map<string, BlockOption>
}

export const buildTaxonomy = (blocks: BlockOption[]): Taxonomy => {
  const byConcept = new Map<string, ConceptCode>()
  const byBlock = new Map<string, BlockOption>()
  for (const b of blocks) {
    byBlock.set(b.nameEs, b)
    for (const c of b.concepts ?? []) {
      if (!b.number || !c.number) continue
      byConcept.set(c.nameEs, { id: c.id, code: `${b.number}.${c.number}`, blockNumber: b.number, conceptNumber: c.number, block: b })
    }
  }
  return { blocks, byConcept, byBlock }
}

/** Taxonomía numerada (se pide una vez y queda en la caché de useApi). */
export function useTaxonomy(): Taxonomy {
  const { data } = useApi(getBlocks, [], "blocks")
  return useMemo(() => buildTaxonomy(data ?? []), [data])
}

/** Orden de un concepto en la taxonomía (1.1 < 1.2 < 2.1 …); los que no tienen número, al final. */
export const conceptRank = (tax: Taxonomy, concept: string) => {
  const c = tax.byConcept.get(concept)
  return c ? c.blockNumber * 100 + c.conceptNumber : 99999
}
