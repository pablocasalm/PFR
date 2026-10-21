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
  /** Clips de este concepto que ya ha visto enteros (Mi Juego). */
  watched?: number
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

/** POST /api/starter-test/dismiss → cerró el banner de Inicio (solo métricas: vuelve a salir en la próxima visita). */
export const dismissStarterTest = () => apiPost<{ ok: boolean }>("/api/starter-test/dismiss")

/** POST /api/saved/concepts/{id} → «Seguir este concepto» (guardado a mano). */
export const followConcept = (id: number) => apiPost<{ ok: boolean }>(`/api/saved/concepts/${id}`)

/** DELETE /api/saved/concepts/{id} → quitar un concepto de «Conceptos para trabajar». */
export const removeSavedConcept = (id: number) => apiDelete<{ ok: boolean }>(`/api/saved/concepts/${id}`)

/** Eventos del test que solo conoce la app (métricas internas). Nunca molesta: si falla, nada. */
export type TestEvent = "test_iniciado" | "test_abandonado" | "test_ver_clips" | "test_ir_explorar"
export const trackTestEvent = (type: TestEvent, detail?: string) => {
  apiPost<{ ok: boolean }>("/api/activity", { type, detail }).catch(() => {})
}

export type CountRow = { key: string; count: number }
export type StarterTestSummary = {
  /** Personas que lo han terminado (cuenta su última respuesta del periodo). */
  responses: number
  people: { started: number; completed: number; abandoned: number; watchedClips: number; wentToExplore: number }
  /** Paso ("1"|"2"|"3") en el que salieron quienes lo dejaron. */
  abandonStep: CountRow[]
  gameLevel: CountRow[]
  playtomicLevel: CountRow[]
  frequency: CountRow[]
  phrases: CountRow[]
  concepts: { id: number; nameEs: string; nameEn: string | null; count: number }[]
  origin: CountRow[]
  language: CountRow[]
}

/** GET /api/admin/starter-test/summary (Admin) → datos de las gráficas. `days` 0 = desde el principio. */
export const getStarterTestSummary = (days: number, excludeTeam: boolean) =>
  apiGet<StarterTestSummary>(`/api/admin/starter-test/summary?days=${days}&excludeTeam=${excludeTeam}`)

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
