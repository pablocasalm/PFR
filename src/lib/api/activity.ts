import { apiPost } from "./client"

/**
 * Métricas internas de uso (no las ve el usuario): avisa al backend de acciones que solo conoce
 * el cliente. El resto (ver vídeos, Coach) lo apunta el backend donde ocurre. El backend guarda
 * una por usuario, tipo y día, así que llamarlo de más no duplica nada.
 */
export type ActivityType = "app_open" | "pricing_view"

/** POST /api/activity. Nunca molesta: si falla, no pasa nada. */
export const trackActivity = (type: ActivityType) => {
  apiPost<{ ok: boolean }>("/api/activity", { type }).catch(() => {})
}
