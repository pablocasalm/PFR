import { apiGet, apiPost, apiPatch, apiDelete } from "./client"
import type { PersonalAnalysisItem } from "./types"

/**
 * Análisis táctico personalizado (§Club hub, Fase 5, plan Coach). El frontend define el
 * contrato; el backend se adapta.
 *
 * La subida NO usa el token de publicación de admin.ts (eso significa "puedo publicar
 * catálogo") — el usuario sube un vídeo privado suyo con su JWT normal, por eso este módulo
 * tiene su propio direct-upload/status en vez de reutilizar los de admin.ts.
 */

export const createDirectUpload = (name: string, size: number) =>
  apiPost<{ uploadURL: string; uid: string }>("/api/club/personal-analysis/direct-upload", { name, size })

export const getUploadStatus = (uid: string) =>
  apiGet<{ state: string; ready: boolean }>(`/api/club/personal-analysis/videos/${uid}/status`)

/** Igual que waitForVideoReady en admin.ts, sobre el endpoint de status propio de esta sección. */
export async function waitForVideoReady(uid: string, opts?: { timeoutMs?: number; intervalMs?: number }): Promise<void> {
  const timeoutMs = opts?.timeoutMs ?? 5 * 60 * 1000
  const intervalMs = opts?.intervalMs ?? 3000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const status = await getUploadStatus(uid).catch(() => null)
    if (status?.ready) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

export type MyPersonalAnalysis = { canSubmit: boolean; request: PersonalAnalysisItem | null }

/** GET /api/club/personal-analysis → tu última solicitud (o null) + si puedes enviar otra. */
export const getMyPersonalAnalysis = () => apiGet<MyPersonalAnalysis>("/api/club/personal-analysis")

/** POST /api/club/personal-analysis → envía el partido ya subido. */
export const submitPersonalAnalysis = (uid: string, durationSeconds: number, note?: string) =>
  apiPost<PersonalAnalysisItem>("/api/club/personal-analysis", { uid, durationSeconds, note })

/* ---- Gestión (solo Admin) ---- */

export type AdminPersonalAnalysisItem = PersonalAnalysisItem & { userId: number; userEmail: string | null; userName: string | null }
export type AdminPersonalAnalysisCounts = { submitted: number; inReview: number; delivered: number }
export type AdminPersonalAnalysisList = { items: AdminPersonalAnalysisItem[]; counts: AdminPersonalAnalysisCounts }

/** GET /api/admin/personal-analysis → cola completa, con quién la mandó. */
export const adminListPersonalAnalysis = () => apiGet<AdminPersonalAnalysisList>("/api/admin/personal-analysis")

/** PATCH /api/admin/personal-analysis/{id} → marca como "en revisión". */
export const adminMarkInReview = (id: number) => apiPatch<{ ok: boolean; status: string }>(`/api/admin/personal-analysis/${id}`, {})

/** POST /api/admin/personal-analysis/{id}/deliver → entrega el análisis (vídeo + plan de acción). */
export const adminDeliverPersonalAnalysis = (id: number, uid: string, planText: string) =>
  apiPost<{ ok: boolean }>(`/api/admin/personal-analysis/${id}/deliver`, { uid, planText })

/** DELETE /api/admin/personal-analysis/{id} → elimina una solicitud. */
export const adminDeletePersonalAnalysis = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/personal-analysis/${id}`)
