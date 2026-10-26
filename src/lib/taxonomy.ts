import { useMemo } from "react"
import { getBlocks, type BlockOption } from "./api/blocks"
import { useApi } from "./hooks/useApi"

/**
 * Taxonomía de bloques y conceptos con su numeración (Base de conocimiento): "3.2" es el 2.º
 * concepto DEL BLOQUE 3, no el 2.º concepto en general. Sale de GET /api/blocks.
 */
export type ConceptCode = { id: number; code: string; blockNumber: number; conceptNumber: number; block: BlockOption }

/** Concepto por su id, con los nombres en los dos idiomas y el id de su bloque. */
export type ConceptRef = { id: number; nameEs: string; nameEn: string; blockId?: number }

export type Taxonomy = {
  blocks: BlockOption[]
  /** Por nombre de concepto en español (la clave que llevan los contenidos). */
  byConcept: Map<string, ConceptCode>
  /** Por nombre de bloque en español. */
  byBlock: Map<string, BlockOption>
  /** Identificadores (26/10/2026): enlaces y filtros van por número, no por nombre, para no
   * depender del idioma. El nombre solo se usa para enseñarlo. */
  conceptById: Map<number, ConceptRef>
  blockById: Map<number, BlockOption>
  /** Nombre en español → id: para contenidos sin ids y enlaces viejos (?concept=Defensa). */
  conceptIdByName: Map<string, number>
  blockIdByName: Map<string, number>
}

export const buildTaxonomy = (blocks: BlockOption[]): Taxonomy => {
  const byConcept = new Map<string, ConceptCode>()
  const byBlock = new Map<string, BlockOption>()
  const conceptById = new Map<number, ConceptRef>()
  const blockById = new Map<number, BlockOption>()
  const conceptIdByName = new Map<string, number>()
  const blockIdByName = new Map<string, number>()
  for (const b of blocks) {
    byBlock.set(b.nameEs, b)
    if (b.id != null) {
      blockById.set(b.id, b)
      blockIdByName.set(b.nameEs, b.id)
    }
    for (const c of b.concepts ?? []) {
      conceptById.set(c.id, { id: c.id, nameEs: c.nameEs, nameEn: c.nameEn, blockId: b.id })
      conceptIdByName.set(c.nameEs, c.id)
      if (!b.number || !c.number) continue
      byConcept.set(c.nameEs, { id: c.id, code: `${b.number}.${c.number}`, blockNumber: b.number, conceptNumber: c.number, block: b })
    }
  }
  return { blocks, byConcept, byBlock, conceptById, blockById, conceptIdByName, blockIdByName }
}

/** Valor de ?concept= / ?block=: un número, o un nombre en español (enlaces viejos). */
export const resolveTaxonomyParam = (param: string, idByName: Map<string, number>): number | null => {
  if (!param) return null
  if (/^\d+$/.test(param)) return Number(param)
  return idByName.get(param) ?? null
}

/** Enlaces a la búsqueda filtrada: siempre por número (la pantalla pone el nombre en el idioma de cada uno). */
export const conceptSearchHref = (id: number) => `/app/search?concept=${id}`
export const blockSearchHref = (id: number) => `/app/search?block=${id}`

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
