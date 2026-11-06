import { apiPost } from "./client"

/**
 * Métricas internas de uso (no las ve el usuario): avisa al backend de acciones que solo conoce
 * el cliente. El resto (ver vídeos, Coach) lo apunta el backend donde ocurre. El backend guarda
 * una por usuario, tipo y día, salvo "app_open", que se guarda cada vez (entradas por dispositivo).
 */
export type ActivityType = "app_open" | "pricing_view" | "news_email_click"

/** POST /api/activity. Nunca molesta: si falla, no pasa nada. `detail`: solo news_email_click (id de la noticia). */
export const trackActivity = (type: ActivityType, detail?: string) => {
  apiPost<{ ok: boolean }>("/api/activity", { type, detail }).catch(() => {})
}
