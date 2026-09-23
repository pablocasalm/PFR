import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

/**
 * Preguntas para la próxima sesión grabada (§Club hub, Fase 3). El frontend define el
 * contrato; el backend se adapta.
 */

export type MySessionQuestion = { id: number; message: string; createdAtUtc: string; answered: boolean }

/** GET /api/club/questions → las preguntas que ha mandado el usuario actual. */
export const getMyQuestions = () => apiGet<MySessionQuestion[]>("/api/club/questions")

/** POST /api/club/questions → envía una pregunta nueva. */
export const sendQuestion = (message: string) => apiPost<MySessionQuestion>("/api/club/questions", { message })

/* ---- Gestión (solo Admin) ---- */

export type AdminSessionQuestion = MySessionQuestion & { userId: number; userEmail: string | null; userName: string | null }
export type AdminQuestionCounts = { pending: number; answered: number }
export type AdminQuestionList = { items: AdminSessionQuestion[]; counts: AdminQuestionCounts }

/** GET /api/admin/questions → todas, con quién las mandó. */
export const adminListQuestions = () => apiGet<AdminQuestionList>("/api/admin/questions")

/** PATCH /api/admin/questions/{id} → marca/desmarca como respondida. */
export const setQuestionAnswered = (id: number, answered: boolean) =>
  apiPatch<{ ok: boolean; answered: boolean }>(`/api/admin/questions/${id}`, { answered })

/** DELETE /api/admin/questions/{id} → elimina una pregunta. */
export const deleteQuestion = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/questions/${id}`)
