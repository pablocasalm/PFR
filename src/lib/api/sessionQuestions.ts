import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

/**
 * Preguntas para la próxima sesión grabada (§Club hub, Fase 3). El frontend define el
 * contrato; el backend se adapta.
 */

/** Dónde se trató una pregunta: masterclass, capítulo y segundo del vídeo (tarjetas #74-#76). */
export type QuestionCoveredIn = {
  sessionId: number
  sessionTitle: string
  sessionTitleEn: string | null
  month: string // "yyyy-MM"
  chapterTitle: string
  chapterTitleEn: string | null
  startSeconds: number
}

export type MySessionQuestion = { id: number; message: string; createdAtUtc: string; answered: boolean; coveredIn?: QuestionCoveredIn | null }

/** GET /api/club/questions → las preguntas que ha mandado el usuario actual. */
export const getMyQuestions = () => apiGet<MySessionQuestion[]>("/api/club/questions")

/** POST /api/club/questions → envía una pregunta nueva. */
export const sendQuestion = (message: string) => apiPost<MySessionQuestion>("/api/club/questions", { message })

/* ---- Gestión (solo Admin) ---- */

export type AdminSessionQuestion = Omit<MySessionQuestion, "coveredIn"> & {
  userId: number
  userEmail: string | null
  userName: string | null
  chapterId: number | null
  sessionId: number | null
  notifiedAtUtc: string | null
}
export type AdminQuestionCounts = { pending: number; answered: number }
/** Masterclasses con sus capítulos, para elegir dónde se trató cada pregunta. */
export type AdminQuestionSession = { id: number; title: string; month: string; chapters: { id: number; title: string; startSeconds: number }[] }
export type AdminQuestionList = { items: AdminSessionQuestion[]; sessions: AdminQuestionSession[]; counts: AdminQuestionCounts }

/** GET /api/admin/questions → todas, con quién las mandó. */
export const adminListQuestions = () => apiGet<AdminQuestionList>("/api/admin/questions")

/** PATCH /api/admin/questions/{id} → la asocia al capítulo que la trata; null = vuelve a pendiente. */
export const setQuestionChapter = (id: number, chapterId: number | null) =>
  apiPatch<{ ok: boolean; answered: boolean; chapterId: number | null }>(`/api/admin/questions/${id}`, { chapterId })

/** POST /api/admin/questions/notify → email "tu pregunta se trató" a quien tenga preguntas de esa
 * masterclass sin avisar. Devuelve a cuántas personas. */
export const notifyQuestions = (sessionId: number) => apiPost<{ ok: boolean; people: number }>("/api/admin/questions/notify", { sessionId })

/** DELETE /api/admin/questions/{id} → elimina una pregunta. */
export const deleteQuestion = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/questions/${id}`)
