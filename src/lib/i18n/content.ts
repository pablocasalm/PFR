import type { BlockConcepts } from "../api/types"

/**
 * Traducción de CONTENIDO (títulos/descripciones/bloques/conceptos de Clips y Analysis) —
 * distinto del i18n de textos fijos de la interfaz (ver store.ts). El backend siempre manda
 * los dos idiomas ya resueltos (el campo *En nunca está vacío: cae a ES si aún no se tradujo),
 * así que aquí solo se elige cuál mostrar según el idioma activo — nada de fallbacks a mano.
 */

/** Elige el texto en el idioma activo. */
export const pickText = (es: string, en: string | undefined, lang: string): string =>
  lang === "en" && en ? en : es

/** Igual que pickText, para el array paralelo *En (mismo orden/longitud que el ES). */
export const pickList = (es: string[], en: string[] | undefined, lang: string): string[] =>
  lang === "en" && en && en.length === es.length ? en : es

/** Bloque con sus conceptos (Explorar/Clip): nombre de bloque + conceptos en el idioma activo. */
export const pickBlock = (b: BlockConcepts, lang: string) => ({
  block: pickText(b.block, b.blockEn, lang),
  concepts: pickList(b.concepts, b.conceptsEn, lang),
})
