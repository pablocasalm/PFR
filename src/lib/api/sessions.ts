import { apiGet, apiDelete } from "./client"
import type { SessionDetail, SessionSummary } from "./types"

/**
 * Sesiones tácticas mensuales grabadas (§Club hub, Fase 2). El frontend define el contrato; el
 * backend se adapta. Publicar vive en admin.ts (createSession), junto al resto del ciclo de
 * subida a Cloudflare que comparte con análisis/clips.
 */

/** GET /api/sessions/{id} → detalle para el visor. */
export const getSessionDetail = (id: string) => apiGet<SessionDetail>(`/api/sessions/${id}`)

/** GET /api/club/sessions → archivo, más reciente primero. */
export const getSessionsArchive = () => apiGet<SessionSummary[]>("/api/club/sessions")

/* ---- Gestión (Admin/ContentCreator) ---- */

/** GET /api/admin/sessions → todas, para gestionarlas. */
export const adminListSessions = () => apiGet<SessionSummary[]>("/api/admin/sessions")

/** DELETE /api/admin/sessions/{id} → borra una sesión (Admin). */
export const deleteSession = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/sessions/${id}`)
