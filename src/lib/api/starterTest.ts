import { apiDelete, apiGet, apiGetBlob, apiPost } from "./client"

/**
 * Test inicial «¿Por dónde empiezo?» (documento de Andrea del 20/10/2026). La recomendación la
 * calcula el servidor (solo con las frases de la pregunta 3) y guarda los conceptos en Mi Lista.
 */

/** Concepto para trabajar: nombre, código de la taxonomía ("3.2"), bloque y nº de clips. */
export type ConceptCard = {
  id: number
  nameEs: string
  nameEn: string
  code: string | null
  blockEs: string | null
  blockEn: string | null
  clipCount: number
  /** "test" si lo puso el test; null si lo guardó el usuario. */
  source: string | null
}

export type StarterTestStatus = { completed: boolean; dismissed: boolean; concepts: ConceptCard[] }

export type GameLevel = "new" | "friends" | "amateur" | "tournaments"
export type PlaytomicLevel = "none" | "lt1" | "1.0" | "1.5" | "2.5" | "3.5" | "4.5" | "5.5"
export type Frequency = "1" | "2-3" | "4+"
export type Phrase = "lose_net" | "defend_back" | "when_net" | "lobs" | "rush" | "volleys" | "partner" | "read" | "unsure"
/** Desde dónde se empezó el test. */
export type TestOrigin = "how_it_works" | "home_banner" | "my_list" | "account"

export type StarterTestAnswers = {
  gameLevel: GameLevel
  playtomicLevel: PlaytomicLevel
  frequency: Frequency
  phrases: Phrase[]
  origin: TestOrigin
}

/** GET /api/starter-test → hecho o no, banner cerrado y conceptos para trabajar. */
export const getStarterTestStatus = () => apiGet<StarterTestStatus>("/api/starter-test")

/** POST /api/starter-test → recomienda y guarda en Mi Lista. */
export const submitStarterTest = (answers: StarterTestAnswers) =>
  apiPost<{ unsure: boolean; concepts: ConceptCard[] }>("/api/starter-test", answers)

/** POST /api/starter-test/dismiss → cierra el banner de Inicio para siempre. */
export const dismissStarterTest = () => apiPost<{ ok: boolean }>("/api/starter-test/dismiss")

/** DELETE /api/saved/concepts/{id} → quitar un concepto de «Conceptos para trabajar». */
export const removeSavedConcept = (id: number) => apiDelete<{ ok: boolean }>(`/api/saved/concepts/${id}`)

/** Eventos del test que solo conoce la app (métricas internas). Nunca molesta: si falla, nada. */
export type TestEvent = "test_iniciado" | "test_abandonado" | "test_ver_clips" | "test_ir_explorar"
export const trackTestEvent = (type: TestEvent, detail?: string) => {
  apiPost<{ ok: boolean }>("/api/activity", { type, detail }).catch(() => {})
}

/** GET /api/admin/starter-test/export (Admin) → CSV con todas las respuestas. */
export async function downloadStarterTestCsv() {
  const blob = await apiGetBlob("/api/admin/starter-test/export")
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `test-inicial-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
