import type { SurveyAnswers } from "../../../lib/api/surveys"

/**
 * Encuestas de la beta, según la especificación de Andrea (versión 2, 15/10/2026). Ids, opciones
 * y qué es obligatorio deben coincidir con el backend (PFR_API/Services/Surveys/SurveyDefinitions.cs),
 * que valida lo mismo. Los textos van como claves de traducción con el español de respaldo.
 */

export type SurveyQuestionType = "single" | "multi" | "text"

export type SurveyQuestion = {
  id: string
  type: SurveyQuestionType
  /** Clave y texto en español de la pregunta. */
  label: [string, string]
  /** Texto encima de la pregunta (contexto). */
  intro?: [string, string]
  /** Texto de ayuda debajo de la pregunta. */
  help?: [string, string]
  required?: boolean
  requiredWhen?: (a: SurveyAnswers) => boolean
  visibleWhen?: (a: SurveyAnswers) => boolean
  options?: { value: string; label: [string, string] }[]
  /** En selección múltiple: la opción que va sola ("Todavía no lo sé"). */
  exclusive?: string
  placeholder?: [string, string]
}

export type SurveyDefinition = {
  id: string
  title: [string, string]
  subtitle: [string, string]
  questions: SurveyQuestion[]
}

const d4q3 = (a: SurveyAnswers) => a.d4_q3 as string | undefined

export const D4: SurveyDefinition = {
  id: "d4",
  title: ["survey.d4.title", "¿Qué tal tus primeros días?"],
  subtitle: ["survey.d4.subtitle", "Cuatro preguntas, menos de 2 minutos."],
  questions: [
    {
      id: "d4_q1",
      type: "single",
      required: true,
      label: ["survey.d4.q1", "Con lo que has visto hasta ahora, ¿crees que el contenido de PFR puede ayudarte en tu juego?"],
      options: [
        { value: "a_lot", label: ["survey.d4.q1.a-lot", "Sí, mucho"] },
        { value: "some", label: ["survey.d4.q1.some", "Sí, algo"] },
        { value: "unsure", label: ["survey.d4.q1.unsure", "Todavía no lo tengo claro"] },
        { value: "no", label: ["survey.d4.q1.no", "No lo creo"] },
      ],
    },
    {
      id: "d4_q2",
      type: "multi",
      required: true,
      exclusive: "unknown",
      label: ["survey.d4.q2", "¿Qué partes te están resultando más útiles?"],
      help: ["survey.d4.q2.help", "Puedes marcar varias."],
      options: [
        { value: "clips", label: ["survey.d4.q2.clips", "Clips por bloques o conceptos (vídeos cortos)"] },
        { value: "analyses", label: ["survey.d4.q2.analyses", "Análisis de partido (vídeos largos)"] },
        { value: "masterclasses", label: ["survey.d4.q2.masterclasses", "Masterclasses"] },
        { value: "monthly_plan", label: ["survey.d4.q2.monthly-plan", "El plan del mes"] },
        { value: "my_game", label: ["survey.d4.q2.my-game", "Mi juego"] },
        { value: "my_list", label: ["survey.d4.q2.my-list", "Mi lista"] },
        { value: "texts", label: ["survey.d4.q2.texts", "Los textos explicativos"] },
        { value: "unknown", label: ["survey.d4.q2.unknown", "Todavía no lo sé"] },
      ],
    },
    {
      id: "d4_q3",
      type: "single",
      required: true,
      label: ["survey.d4.q3", "¿Algo te ha frenado o confundido?"],
      options: [
        { value: "all_clear", label: ["survey.d4.q3.all-clear", "No, todo claro"] },
        { value: "where_to_start", label: ["survey.d4.q3.where-to-start", "No sabía por dónde empezar"] },
        { value: "cant_find", label: ["survey.d4.q3.cant-find", "No encontraba lo que buscaba"] },
        { value: "broken", label: ["survey.d4.q3.broken", "Algo no funcionaba"] },
        { value: "other", label: ["survey.d4.q3.other", "Otro"] },
      ],
    },
    {
      id: "d4_q3_detalle",
      type: "text",
      label: ["survey.d4.q3-detail", "Cuéntanos qué pasó"],
      visibleWhen: (a) => !!d4q3(a) && d4q3(a) !== "all_clear",
      requiredWhen: (a) => d4q3(a) === "broken" || d4q3(a) === "other",
    },
    {
      id: "d4_q4",
      type: "text",
      intro: ["survey.d4.q4.intro", "Estamos preparando la próxima masterclass con las dudas de los miembros de Club."],
      label: ["survey.d4.q4", "¿Qué situación o duda táctica te gustaría que Guille resolviera?"],
      help: [
        "survey.d4.q4.help",
        "Intenta que sea una situación concreta que te pasa en partido. Recuerda que desde el apartado Club puedes enviar tus dudas cuando quieras.",
      ],
    },
  ],
}

/** Las que se pueden abrir hoy. El día 12 y el bloque de Coach se añaden aquí cuando estén. */
export const SURVEYS: Record<string, SurveyDefinition> = { [D4.id]: D4 }

export const isVisible = (q: SurveyQuestion, a: SurveyAnswers) => !q.visibleWhen || q.visibleWhen(a)

export const isRequired = (q: SurveyQuestion, a: SurveyAnswers) => !!q.required || !!q.requiredWhen?.(a)

export const isAnswered = (value: SurveyAnswers[string] | undefined) =>
  Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0
