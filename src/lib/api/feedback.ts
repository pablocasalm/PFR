import { apiPost } from "./client"

/**
 * Feedback de beta. Envía el mensaje con el contexto (ruta y, si aplica, el contenido)
 * para poder triarlo. Requiere sesión.
 */
export type FeedbackPayload = {
  message: string
  page?: string
  contentType?: "clip" | "analysis"
  contentId?: string
}

export const sendFeedback = (payload: FeedbackPayload) =>
  apiPost<{ ok: boolean }>("/api/feedback", payload)
