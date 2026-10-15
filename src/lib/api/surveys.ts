import { apiGet, apiPost } from "./client"
import { API_BASE } from "../config"

/** Respuesta a una pregunta: una opción, varias, o texto. */
export type SurveyAnswer = string | string[]
export type SurveyAnswers = Record<string, SurveyAnswer>

/** GET /api/surveys/{id} → si ya la ha respondido (solo se responde una vez). */
export const getSurveyStatus = (surveyId: string) =>
  apiGet<{ surveyId: string; submitted: boolean; submittedAtUtc: string | null; coachExtra?: boolean }>(`/api/surveys/${surveyId}`)

/** Autorizaciones del testimonio (día 12): independientes, sin marcar de partida. */
export type SurveyConsents = { publishText: boolean; publishName: boolean; contactVideo: boolean }

/** POST /api/surveys/{id} → envía las respuestas (y, en el día 12, el bloque de Coach y las
 * autorizaciones). 409 si ya estaba respondida. */
export const submitSurvey = (surveyId: string, answers: SurveyAnswers, extra?: { coachAnswers?: SurveyAnswers; consents?: SurveyConsents }) =>
  apiPost<{ ok: boolean }>(`/api/surveys/${surveyId}`, { answers, ...extra })

/** Una respuesta tal como la ve el panel de admin. */
export type AdminSurveyResponse = {
  id: number
  email: string
  displayName: string | null
  language: string
  accountCreatedAtUtc: string
  invitedAtUtc: string | null
  sentAtUtc: string | null
  submittedAtUtc: string | null
  answers: Record<string, SurveyAnswer> | null
  consentPublishText?: boolean | null
  consentPublishName?: boolean | null
  consentContactVideo?: boolean | null
}

/** GET /api/admin/surveys/{id}/responses (Admin). */
export const getSurveyResponses = (surveyId: string) => apiGet<AdminSurveyResponse[]>(`/api/admin/surveys/${surveyId}/responses`)

/** Descarga el CSV de una encuesta (Admin). Va con fetch a mano porque la respuesta es un
 * fichero, no JSON. */
export async function downloadSurveyCsv(surveyId: string) {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}/api/admin/surveys/${surveyId}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `encuesta-${surveyId}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
