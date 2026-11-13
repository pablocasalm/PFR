import { apiGet, apiPost } from "./client"
import type { ContentItem } from "./types"

/** Tipos de aviso del muñeco (fase 0, sin IA). El texto sale de "assistant.notice.{kind}". */
export type AssistantNoticeKind = "resume_analysis" | "new_session" | "monthly_pick" | "welcome_back" | "saved_unwatched" | "generic_new"

export type AssistantNotice = {
  key: string
  kind: AssistantNoticeKind
  /** Valores para el texto: count, concept/conceptEn, title/titleEn… */
  params: Record<string, string>
  href?: string | null
  /** Tarjeta real (p. ej. el análisis a medias, con su progreso). */
  item?: ContentItem | null
}

export type AssistantNoticeAction = "shown" | "click" | "dismiss"

/** GET /api/assistant/notice → el aviso que toca, o null si no hay (204). */
export const getAssistantNotice = () =>
  apiGet<AssistantNotice | Record<string, never>>("/api/assistant/notice").then((res) => ("key" in res ? (res as AssistantNotice) : null))

/** POST /api/assistant/notice. Nunca molesta: si falla, no pasa nada. */
export const recordAssistantNotice = (notice: AssistantNotice, action: AssistantNoticeAction) => {
  apiPost<{ ok: boolean }>("/api/assistant/notice", { key: notice.key, kind: notice.kind, action }).catch(() => {})
}

/** Mensajes del chat usados este mes y el límite del plan (null = Essential, sin chat). */
export type AssistantUsage = { used: number; limit: number | null; available: boolean }

export type AssistantChatReply = {
  conversationId: number
  message: string
  /** Clips recomendados, ya comprobados contra la base de datos. */
  items: ContentItem[]
  outOfScope: boolean
  /** Duda de cuenta, pagos o una incidencia: se ofrece enviar la conversación a Soporte. */
  support: boolean
  usage: AssistantUsage
}

/** GET /api/assistant/usage */
export const getAssistantUsage = () => apiGet<AssistantUsage>("/api/assistant/usage")

/** POST /api/assistant/chat. Errores: 429 code "assistant_limit", 503 code "assistant_unavailable". */
export const sendAssistantMessage = (message: string, language: string, conversationId: number | null) =>
  apiPost<AssistantChatReply>("/api/assistant/chat", { message, language, conversationId })

/** POST /api/assistant/support → manda la conversación por email a hello@ para contestar a la persona. */
export const sendAssistantSupport = (conversationId: number) =>
  apiPost<{ ok: boolean }>("/api/assistant/support", { conversationId })

// ── Administración (pestaña «Asistente» de Métricas) ──

export type AdminAssistantNotices = {
  since: string
  /** Por tipo de aviso, sin las cuentas del equipo. */
  summary: { kind: AssistantNoticeKind; shown: number; clicked: number; dismissed: number }[]
  panel: {
    opens: number
    openUsers: number
    questions: { question: string; count: number; users: number }[]
    upgradeClicks: number
    upgradeClickUsers: number
    upgradedAfterClick: number
  }
  latest: {
    id: number
    userId: number
    email: string
    planTier: string
    isTeam: boolean
    key: string
    kind: AssistantNoticeKind
    shownAtUtc: string
    clickedAtUtc: string | null
    dismissedAtUtc: string | null
  }[]
}

export type AdminAssistantMessage = {
  role: "user" | "assistant"
  text: string
  concepts: string | null
  clipIds: string | null
  droppedIds: string | null
  confidence: "alta" | "media" | "baja" | null
  outOfScope: boolean
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  createdAtUtc: string
}

export type AdminAssistantConversations = {
  since: string
  summary: {
    conversations: number
    replies: number
    lowConfidence: number
    outOfScope: number
    withDropped: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
  }
  conversations: {
    id: number
    userId: number
    email: string
    isTeam: boolean
    language: string
    planTier: string
    startedAtUtc: string
    lastMessageAtUtc: string
    messages: AdminAssistantMessage[]
  }[]
}

/** GET /api/admin/assistant/notices?days=N (solo Admin). */
export const getAdminAssistantNotices = (days: number) => apiGet<AdminAssistantNotices>(`/api/admin/assistant/notices?days=${days}`)

/** GET /api/admin/assistant/conversations?days=N (solo Admin). */
export const getAdminAssistantConversations = (days: number) =>
  apiGet<AdminAssistantConversations>(`/api/admin/assistant/conversations?days=${days}`)
