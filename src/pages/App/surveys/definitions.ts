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
  options?: { value: string; label: [string, string]; description?: [string, string]; price?: [string, string] }[]
  /** Pregunta de seguimiento ("¿Por qué?"): va pegada a la anterior, sin número propio. */
  followUp?: boolean
  /** Opciones en fila (escala del 1 al 5). */
  inline?: boolean
  /** En selección múltiple: la opción que va sola ("Todavía no lo sé"). */
  exclusive?: string
  placeholder?: [string, string]
}

export type SurveyDefinition = {
  id: string
  title: [string, string]
  subtitle: [string, string]
  questions: SurveyQuestion[]
  /** Día 12: autorizaciones del testimonio al final, si se ha escrito esta pregunta. */
  consentsAfter?: string
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
      followUp: true,
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

const why = (id: string, visibleAfter: string, key: string): SurveyQuestion => ({
  id,
  type: "text",
  followUp: true,
  label: [key, "¿Por qué?"],
  visibleWhen: (a) => !!a[visibleAfter],
})

export const D12: SurveyDefinition = {
  id: "d12",
  title: ["survey.d12.title", "¿Qué te está pareciendo Padel Film Room?"],
  subtitle: ["survey.d12.subtitle", "Seis preguntas. Tu opinión decide cómo seguimos."],
  consentsAfter: "d12_q6",
  questions: [
    {
      id: "d12_q1",
      type: "single",
      required: true,
      label: ["survey.d12.q1", "Si PFR desapareciera mañana, ¿cómo te sentirías?"],
      options: [
        { value: "very", label: ["survey.d12.q1.very", "Muy decepcionado"] },
        { value: "somewhat", label: ["survey.d12.q1.somewhat", "Algo decepcionado"] },
        { value: "not", label: ["survey.d12.q1.not", "Nada decepcionado"] },
        { value: "no_longer_use", label: ["survey.d12.q1.no-longer-use", "Ya no lo uso"] },
      ],
    },
    { id: "d12_q2", type: "text", label: ["survey.d12.q2", "Hasta ahora, ¿qué crees que te puede aportar PFR?"] },
    {
      id: "d12_q3",
      type: "single",
      required: true,
      label: ["survey.d12.q3", "¿Qué mejorarías primero?"],
      options: [
        { value: "more_content", label: ["survey.d12.q3.more-content", "Más contenido o temas"] },
        { value: "find_easier", label: ["survey.d12.q3.find-easier", "Encontrar lo que busco más fácil"] },
        { value: "more_guidance", label: ["survey.d12.q3.more-guidance", "Más guía sobre qué trabajar"] },
        { value: "technical", label: ["survey.d12.q3.technical", "Mejoras técnicas"] },
        { value: "other", label: ["survey.d12.q3.other", "Otra"] },
      ],
    },
    {
      id: "d12_q3_detalle",
      type: "text",
      followUp: true,
      label: ["survey.d12.q3-detail", "¿Por qué? Cuéntanos qué cambiarías en concreto"],
      visibleWhen: (a) => !!a.d12_q3,
      requiredWhen: (a) => a.d12_q3 === "other",
    },
    {
      id: "d12_q4",
      type: "single",
      required: true,
      label: ["survey.d12.q4", "Si tuvieras que elegir hoy, ¿qué plan elegirías?"],
      // Precios en euros de la especificación (sección 7), también en inglés: cuando estén los
      // precios por país, cada uno debería ver el suyo (apuntado en Trello).
      options: [
        {
          value: "essential",
          label: ["survey.d12.q4.essential", "Essential"],
          description: ["survey.d12.q4.essential.desc", "Aprende a leer el juego a tu ritmo. Todos los análisis y clips, explorar por bloques y conceptos, Mi lista y Mi juego."],
          price: ["survey.d12.q4.essential.price", "14,90 €/mes precio fundador. Después, 19,90 €/mes."],
        },
        {
          value: "club",
          label: ["survey.d12.q4.club", "Club"],
          description: [
            "survey.d12.q4.club.desc",
            "Cada mes sabes qué trabajar y por qué. Todo lo de Essential, y además: masterclass mensual con Guille y Andrea a partir de las dudas de los miembros, El plan del mes, envío de dudas y archivo de masterclasses.",
          ],
          price: ["survey.d12.q4.club.price", "24,90 €/mes precio fundador. Después, 29,90 €/mes."],
        },
        {
          value: "coach",
          label: ["survey.d12.q4.coach", "Coach"],
          description: [
            "survey.d12.q4.coach.desc",
            "Tu partido, analizado por un exjugador profesional. Todo lo de Club, y además: envías hasta 20 minutos de un partido tuyo y Guille te devuelve un análisis en vídeo con un plan de acción personalizado. 5 plazas.",
          ],
          price: ["survey.d12.q4.coach.price", "74,90 €/mes precio fundador. Después, 89,90 €/mes."],
        },
        { value: "none", label: ["survey.d12.q4.none", "Ninguno por ahora"] },
      ],
    },
    why("d12_q4_motivo", "d12_q4", "survey.why"),
    {
      id: "d12_q5",
      type: "single",
      required: true,
      label: ["survey.d12.q5", "¿Te ha sido útil El plan del mes, o habrías preferido ir por tu cuenta?"],
      options: [
        { value: "helped", label: ["survey.d12.q5.helped", "Me ha ayudado a saber qué trabajar"] },
        { value: "partly", label: ["survey.d12.q5.partly", "Me ha servido en parte"] },
        { value: "own_way", label: ["survey.d12.q5.own-way", "Prefiero ir por mi cuenta"] },
        { value: "not_seen", label: ["survey.d12.q5.not-seen", "No lo he visto"] },
      ],
    },
    why("d12_q5_motivo", "d12_q5", "survey.why"),
    { id: "d12_q6", type: "text", label: ["survey.d12.q6", "¿Qué le dirías a otro jugador que estuviera pensando en utilizar PFR?"] },
  ],
}

const yesSomewhatNo = (prefix: string) => [
  { value: "yes", label: [`${prefix}.yes`, "Sí"] as [string, string] },
  { value: "somewhat", label: [`${prefix}.somewhat`, "Más o menos"] as [string, string] },
  { value: "no", label: [`${prefix}.no`, "No"] as [string, string] },
]

const wouldPay = (prefix: string) => [
  { value: "clearly", label: [`${prefix}.clearly`, "Sí, claramente"] as [string, string] },
  { value: "probably", label: [`${prefix}.probably`, "Probablemente"] as [string, string] },
  { value: "doubts", label: [`${prefix}.doubts`, "Tengo dudas"] as [string, string] },
  { value: "no", label: [`${prefix}.no`, "No"] as [string, string] },
]

/** Bloque extra del día 12 para quien tiene Coach y al menos un análisis entregado (se guarda
 * como su propia encuesta, coach_extra). Obligatorias las de selección; el texto, opcional. */
export const COACH_EXTRA: SurveyDefinition = {
  id: "coach_extra",
  title: ["survey.coach.title", "Tu experiencia con Coach"],
  subtitle: ["survey.coach.subtitle", "Unas preguntas más sobre tu análisis personalizado."],
  questions: [
    {
      id: "c_q1_envio",
      type: "single",
      required: true,
      label: ["survey.coach.q1", "¿Qué tal te resultó enviar el vídeo?"],
      options: [
        { value: "very_easy", label: ["survey.coach.q1.very-easy", "Muy fácil"] },
        { value: "some_doubts", label: ["survey.coach.q1.some-doubts", "Bien, con alguna duda"] },
        { value: "hard", label: ["survey.coach.q1.hard", "Complicado"] },
      ],
    },
    {
      id: "c_q1_detalle",
      type: "text",
      followUp: true,
      label: ["survey.coach.q1-detail", "¿Qué te costó? (grabar, subir, formato, peso)"],
      visibleWhen: (a) => !!a.c_q1_envio && a.c_q1_envio !== "very_easy",
    },
    { id: "c_q2_claridad_entrega", type: "single", required: true, label: ["survey.coach.q2-clarity", "¿Te quedó claro cuándo recibirías el análisis?"], options: yesSomewhatNo("survey.coach.opt") },
    {
      id: "c_q2_espera",
      type: "single",
      required: true,
      label: ["survey.coach.q2-wait", "¿El tiempo de espera te pareció razonable?"],
      options: [
        { value: "yes", label: ["survey.coach.opt.yes", "Sí"] },
        { value: "long_ok", label: ["survey.coach.q2-wait.long-ok", "Largo pero aceptable"] },
        { value: "too_long", label: ["survey.coach.q2-wait.too-long", "Demasiado largo"] },
      ],
    },
    {
      id: "c_q3_utilidad",
      type: "single",
      required: true,
      inline: true,
      label: ["survey.coach.q3-usefulness", "¿Cuánto te ha servido el análisis de Guille?"],
      help: ["survey.coach.q3-usefulness.help", "De 1 (nada) a 5 (muchísimo)."],
      options: ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: [`survey.scale.${n}`, n] as [string, string] })),
    },
    {
      id: "c_q3_reconoce",
      type: "single",
      required: true,
      label: ["survey.coach.q3-recognise", "¿Has reconocido situaciones que te pasan en tus partidos?"],
      options: [
        { value: "yes", label: ["survey.coach.opt.yes", "Sí"] },
        { value: "some", label: ["survey.coach.opt.some-f", "Alguna"] },
        { value: "no", label: ["survey.coach.opt.no", "No"] },
      ],
    },
    { id: "c_q3_comentario", type: "text", label: ["survey.coach.q3-comment", "¿Qué fue lo más útil y qué echaste en falta?"] },
    { id: "c_q4_tres_cosas", type: "text", label: ["survey.coach.q4-three", "¿Qué tres cosas vas a trabajar este mes?"] },
    { id: "c_q4_facil", type: "single", required: true, label: ["survey.coach.q4-easy", "¿Te resulta fácil llevar el plan a pista?"], options: yesSomewhatNo("survey.coach.opt") },
    {
      id: "c_q4_clips",
      type: "single",
      required: true,
      label: ["survey.coach.q4-clips", "¿Te han servido los clips recomendados?"],
      options: [
        { value: "yes", label: ["survey.coach.opt.yes", "Sí"] },
        { value: "some", label: ["survey.coach.opt.some-m", "Algunos"] },
        { value: "no", label: ["survey.coach.opt.no", "No"] },
      ],
    },
    {
      id: "c_q5_frecuencia",
      type: "single",
      required: true,
      label: ["survey.coach.q5", "¿Con qué frecuencia lo usarías?"],
      options: [
        { value: "monthly", label: ["survey.coach.q5.monthly", "Cada mes"] },
        { value: "every_2_3", label: ["survey.coach.q5.every-2-3", "Cada dos o tres meses"] },
        { value: "occasionally", label: ["survey.coach.q5.occasionally", "Solo de vez en cuando"] },
      ],
    },
    { id: "c_q6_pago_fundador", type: "single", required: true, label: ["survey.coach.q6-founder", "¿Pagarías 74,90 € al mes por este análisis?"], options: wouldPay("survey.coach.pay") },
    { id: "c_q6_pago_estandar", type: "single", required: true, label: ["survey.coach.q6-standard", "¿Y 89,90 € al mes?"], options: wouldPay("survey.coach.pay") },
    {
      id: "c_q6_que_falta",
      type: "text",
      followUp: true,
      label: ["survey.coach.q6-missing", "¿Qué te haría falta para que mereciera la pena?"],
      visibleWhen: (a) => ["doubts", "no"].includes(a.c_q6_pago_fundador as string) || ["doubts", "no"].includes(a.c_q6_pago_estandar as string),
    },
  ],
}

/** Las que se pueden abrir desde su enlace (/app/encuesta/:id). */
export const SURVEYS: Record<string, SurveyDefinition> = { [D4.id]: D4, [D12.id]: D12 }

/** Las que se ven en el panel (incluye el bloque de Coach). */
export const ADMIN_SURVEYS: Record<string, SurveyDefinition> = { ...SURVEYS, [COACH_EXTRA.id]: COACH_EXTRA }

/** Versión del texto de las tres autorizaciones (igual que en el backend). */
export const CONSENT_TEXT_VERSION = "v1"

export const isVisible = (q: SurveyQuestion, a: SurveyAnswers) => !q.visibleWhen || q.visibleWhen(a)

export const isRequired = (q: SurveyQuestion, a: SurveyAnswers) => !!q.required || !!q.requiredWhen?.(a)

export const isAnswered = (value: SurveyAnswers[string] | undefined) =>
  Array.isArray(value) ? value.length > 0 : typeof value === "string" && value.trim().length > 0
