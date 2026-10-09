/**
 * Tipos de datos del frontend. El frontend define el contrato; el backend se adapta.
 * Estos tipos modelan lo que la UI necesita (no necesariamente lo que el backend expone hoy).
 */

// ---------------------------------------------------------------------------
// Modelo de contenido unificado (clip o análisis completo)
// ---------------------------------------------------------------------------

export type ContentType = "clip" | "analysis"

/** Conceptos de un contenido agrupados por bloque (§8.3): para colorear los del bloque actual.
 * `concepts`/`block` son la clave canónica (ES, se usan para filtrar/buscar); los `*En` son el
 * mismo dato, mismo orden, solo para mostrar cuando el idioma activo es inglés. */
export type BlockConcepts = { block: string; blockEn: string; concepts: string[]; conceptsEn: string[] }

/** Tarjeta de contenido común a Inicio, Explorar, Resultados y Mi Lista. */
export type ContentItem = {
  id: string
  type: ContentType
  title: string
  titleEn: string // = title si aún no hay traducción (nunca vacío)
  thumbnailUrl: string
  durationSeconds: number
  concepts: string[] // unión plana (ES, clave de filtros/búsqueda)
  conceptsEn: string[] // mismo orden/longitud que concepts, solo para mostrar
  blocks?: BlockConcepts[] // conceptos por bloque (para el coloreado en Explorar)
  description?: string // solo en clips (Resultados: se prefiere a "tournament")
  descriptionEn?: string
  // Metadatos opcionales (sobre todo en análisis)
  players?: string // "Chingotto, Galán, Lebrón, Stupa"
  tournament?: string // texto compuesto: "Premier Padel P2 · Génova 2024 · Cuartos de final"
  block?: string // bloque táctico principal (ES, clave de filtros)
  blockEn?: string // mismo bloque principal, solo para mostrar
  level?: string // "intermedio" | "avanzado" (filtro §8.2; opcional, no siempre visible)
  progress?: number // 0-100, para "continúa viendo" / "vistos recientemente"
  completed?: boolean // solo en items de historial: si ya se marcó como visto
  hasEnglishVersion?: boolean // true si tiene vídeo doblado al inglés (HeyGen)
}

/** Concepto popular (chip con contador), para Inicio y Explorar. */
export type PopularConcept = { name: string; nameEn: string; clipCount: number }

/** Nombre de concepto en los dos idiomas, sin contador — para MonthlyPick (§Club hub). */
export type ConceptName = { name: string; nameEn: string }

/** GET /api/club/monthly-pick → "Recomendado del mes" vigente (§Club hub, Fase 1). */
export type MonthlyPick = {
  id: number
  month: string // "yyyy-MM"
  note?: string | null
  noteEn?: string | null
  items: ContentItem[]
  concepts: ConceptName[]
  /** §El plan del mes: entre 2 y 4 situaciones. Si viene vacío o no viene (planes publicados
   * antes de este formato), Club cae a la lista plana de `items`. */
  situations?: PlanSituation[]
  /** Masterclass de la que sale el plan ("Viene de la masterclass de este mes"). */
  sessionId?: number | null
}

/** Una situación de "El plan del mes" (§Club): qué reconocer y sus clips. El progreso ("3 de 8 vistos") se calcula en el front a
 * partir de `completed` de cada clip — misma regla de "visto" que el resto de la app. */
export type PlanSituation = {
  id: number
  title: string
  titleEn?: string | null
  shortTitle: string // etiqueta corta para las pestañas de Inicio
  shortTitleEn?: string | null
  recognize: string // "Qué reconocer"
  recognizeEn?: string | null
  clips: ContentItem[]
}

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
  titleEn: string
  event?: string // torneo
  thumbnailUrl?: string
}

/** Capítulo de un análisis completo. */
export type Chapter = {
  startSeconds: number
  title: string
  titleEn?: string
  clipId?: string // si el capítulo existe también como clip independiente
}

// ---------------------------------------------------------------------------
// Detalle de contenido (Página de Clip / Página de Análisis)
// ---------------------------------------------------------------------------

export type ClipDetail = {
  id: string
  type: "clip"
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  videoUrlEn?: string | null // vídeo doblado al inglés (HeyGen); null/undefined si no existe
  concepts: string[] // todos los conceptos del clip (§9.3: se muestran todos)
  conceptsEn: string[] // mismo orden/longitud que concepts
  blocks: string[] // bloques del clip (chips clicables §9.2)
  blocksEn: string[] // mismo orden/longitud que blocks
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
  titleEn: string
  description: string
  descriptionEn: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  videoUrlEn?: string | null // vídeo doblado al inglés (HeyGen); null/undefined si no existe
  players?: string
  tournament?: string
  concepts: string[]
  conceptsEn: string[] // mismo orden/longitud que concepts
  resumeSeconds?: number // punto donde retomar (§7.2/§10.1)
  chapters: Chapter[]
  related: ContentItem[]
  comments: Comment[]
  likes?: number
  savedByMe?: boolean
  likedByMe?: boolean
}

/**
 * Sesión táctica mensual grabada (§Club hub, Fase 2). Sin concepts/blocks/related — no forma
 * parte del catálogo táctico. §Fase n+2 (pendiente a propósito): "clips/análisis relacionados"
 * se añadirá aquí como `related?: ContentItem[]` cuando se decida esa pantalla, sin romper nada
 * de lo de ahora.
 */
export type SessionSummary = {
  id: number
  month: string // "yyyy-MM"
  title: string
  titleEn: string
  thumbnailUrl: string
  durationSeconds: number
  publishedAtUtc: string
  completed: boolean
}

/** Análisis táctico personalizado (§Club hub, Fase 5, plan Coach). */
export type PersonalAnalysisStatus = "Submitted" | "InReview" | "Delivered"

export type PersonalAnalysisItem = {
  id: number
  status: PersonalAnalysisStatus
  submittedAtUtc: string
  uploadedVideoUrl: string
  userNote?: string | null
  deliveredVideoUrl?: string | null
  /** Formato anterior (texto libre). Los análisis nuevos traen `priorities`. */
  deliveredPlanText?: string | null
  deliveredAtUtc?: string | null
  cycleEndsAtUtc?: string | null
  // Quién es el jugador en el vídeo (obligatorio al enviar).
  playerSide?: PlayerSide | null // lado en el que juega
  playerHand?: PlayerSide | null // mano dominante
  playerStart?: "near" | "far" | null // dónde empieza respecto a la cámara
  playerLook?: string | null // cómo reconocerle
  matchContext?: string | null
  // Ficha de prioridades (§"Entregable Coach y checklist del alumno").
  priorities?: AnalysisPriority[]
  strengths?: string | null // "Lo que ya haces bien", una por línea
  observations?: string | null // "Otras observaciones", una por línea
  finalComment?: string | null // comentario final del alumno para Guille
  // Hilo de mensajes con quien analiza: cuántos hay y cuántos sin leer para quien pregunta.
  messageCount?: number
  unreadMessages?: number
  finalCommentAtUtc?: string | null
}

export type PlayerSide = "right" | "left"

/** Cómo le fue al alumno con una prioridad: lo hizo, a medias o no le salió. La misma escala
 * sirve para su seguimiento partido a partido y para la revisión de Guille en el análisis siguiente. */
export type PriorityResult = "done" | "partial" | "missed"

export type PriorityLog = { id: number; matchDate: string; result: PriorityResult; comment?: string | null }

/** Una prioridad de la ficha de un análisis de Coach. */
export type AnalysisPriority = {
  id: number
  title: string
  situation: string
  decision: string // "Qué decidir"
  check: string // "Cómo saber si lo haces"
  moments?: string | null // "Míralo en tu vídeo": minutos en texto, se enlazan al vídeo
  blockId?: number | null
  block?: string | null
  blockEn?: string | null
  concepts: { id: number; name: string; nameEn: string }[]
  reviewResult?: PriorityResult | null // revisión de Guille en el análisis siguiente
  reviewComment?: string | null
  logs: PriorityLog[] // seguimiento del alumno durante el mes
}

export type SessionDetail = {
  id: number
  month: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  videoUrlEn?: string | null
  resumeSeconds: number
  chapters: Chapter[]
  likes: number
  likedByMe: boolean
  comments: Comment[]
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
  blockEn: string
  concepts: string[]
  conceptsEn: string[] // mismo orden/longitud que concepts
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
