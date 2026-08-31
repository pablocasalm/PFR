/**
 * Tipos de datos del frontend. El frontend define el contrato; el backend se adapta.
 * Estos tipos modelan lo que la UI necesita (no necesariamente lo que el backend expone hoy).
 */

// ---------------------------------------------------------------------------
// Modelo de contenido unificado (clip o análisis completo)
// ---------------------------------------------------------------------------

export type ContentType = "clip" | "analysis"

/** Conceptos de un contenido agrupados por bloque (§8.3): para colorear los del bloque actual. */
export type BlockConcepts = { block: string; concepts: string[] }

/** Tarjeta de contenido común a Inicio, Explorar, Resultados y Mi Lista. */
export type ContentItem = {
  id: string
  type: ContentType
  title: string
  thumbnailUrl: string
  durationSeconds: number
  concepts: string[] // unión plana (para contextos sin bloque: Inicio, Mi Lista, Resultados)
  blocks?: BlockConcepts[] // conceptos por bloque (para el coloreado en Explorar)
  description?: string // solo en clips (Resultados: se prefiere a "tournament")
  // Metadatos opcionales (sobre todo en análisis)
  players?: string // "Chingotto, Galán, Lebrón, Stupa"
  tournament?: string // texto compuesto: "Premier Padel P2 · Génova 2024 · Cuartos de final"
  block?: string // bloque táctico principal (contexto)
  level?: string // "intermedio" | "avanzado" (filtro §8.2; opcional, no siempre visible)
  progress?: number // 0-100, para "continúa viendo" / "vistos recientemente"
  completed?: boolean // solo en items de historial: si ya se marcó como visto
}

/** Concepto popular (chip con contador), para Inicio y Explorar. */
export type PopularConcept = { name: string; clipCount: number }

/** Comentario (plano en el MVP). `likes` opcional según diseño. */
export type Comment = {
  id: string
  user: string
  initials?: string
  ago: string // etiqueta legible: "Hace 2 h"
  text: string
  likes?: number
}

/** Referencia al análisis del que procede un clip (sección "Aparece en"). */
export type AppearsIn = {
  analysisId: string
  title: string // partido/equipos
  event?: string // torneo
  thumbnailUrl?: string
}

/** Capítulo de un análisis completo. */
export type Chapter = {
  startSeconds: number
  title: string
  concept?: string
  clipId?: string // si el capítulo existe también como clip independiente
}

// ---------------------------------------------------------------------------
// Detalle de contenido (Página de Clip / Página de Análisis)
// ---------------------------------------------------------------------------

export type ClipDetail = {
  id: string
  type: "clip"
  title: string
  description: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  concepts: string[] // todos los conceptos del clip (§9.3: se muestran todos)
  blocks: string[] // bloques del clip (chips clicables §9.2)
  resumeSeconds?: number // punto donde retomar (§7.2)
  appearsIn?: AppearsIn | null
  related: ContentItem[]
  comments: Comment[]
  likes?: number
  savedByMe?: boolean
  likedByMe?: boolean
}

export type AnalysisDetail = {
  id: string
  type: "analysis"
  title: string
  description: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  players?: string
  tournament?: string
  concepts: string[]
  resumeSeconds?: number // punto donde retomar (§7.2/§10.1)
  chapters: Chapter[]
  related: ContentItem[]
  comments: Comment[]
  likes?: number
  savedByMe?: boolean
  likedByMe?: boolean
}

// ---------------------------------------------------------------------------
// Respuestas con forma de pantalla (BFF) — definidas por el frontend
// ---------------------------------------------------------------------------

/** GET /api/home → todo lo que necesita la pantalla Inicio. */
export type HomeResponse = {
  hero: ContentItem | null
  continueWatching: ContentItem[]
  newThisWeek: ContentItem[]
  popularConcepts: PopularConcept[]
  mostViewedThisWeek: ContentItem[]
}

/** Sección de Explorar: un bloque táctico con sus conceptos y clips. */
export type ExploreSection = {
  block: string
  concepts: string[]
  clips: ContentItem[]
}

/** GET /api/explore → biblioteca táctica (bloques + análisis completos). */
export type ExploreResponse = {
  sections: ExploreSection[]
  analyses: ContentItem[]
}

/** Pestaña de la pantalla de Resultados (tipo + contador). */
export type SearchTab = { key: string; label: string; count: number }

/** GET /api/search?q= → Pantalla de Resultados. */
export type SearchResponse = {
  query: string
  total: number
  tabs: SearchTab[]
  results: ContentItem[]
}

/** GET /api/saved → pantalla Mi Lista (clips y análisis guardados). Requiere auth. */
export type SavedListResponse = {
  clips: ContentItem[]
  analyses: ContentItem[]
  // recentlyViewed se añadirá con el historial de visionado (§14.11)
}
