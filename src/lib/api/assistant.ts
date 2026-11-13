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
