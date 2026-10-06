import type { AdminPersonalAnalysisItem, MyPersonalAnalysis } from "../../../lib/api/personalAnalysis"
import type { AnalysisPriority, PersonalAnalysisItem, PriorityLog, PriorityResult } from "../../../lib/api/types"

/**
 * Datos de EJEMPLO de la pantalla Coach, solo en desarrollo (`npm run dev`): permiten ver la
 * ficha, el seguimiento y el progreso sin tener análisis reales. Se activan con `?ejemplo` en
 * la URL de /app/coach:
 *   ?ejemplo            análisis entregado, con historial y seguimiento
 *   ?ejemplo=enviar     lo mismo, y ya toca enviar el partido del mes
 *   ?ejemplo=analisis   partido enviado y en análisis, con el anterior a la vista
 *   ?ejemplo=vacio      alumno que todavía no ha enviado nada
 * El panel de quien analiza (/app/admin/coach?ejemplo) usa COACH_ADMIN_DEMO: una cola con un
 * partido nuevo de una alumna con historial, otro en revisión de un alumno nuevo y dos entregados.
 * En producción `coachDemoMode()` devuelve siempre null.
 */
export type CoachDemoMode = "entregado" | "enviar" | "analisis" | "vacio"

export const coachDemoMode = (): CoachDemoMode | null => {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(window.location.search).get("ejemplo")
  if (value === null) return null
  return value === "enviar" || value === "analisis" || value === "vacio" ? value : "entregado"
}

const VIDEO = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"

let logId = 1000
const logs = (...entries: [string, PriorityResult, string?][]): PriorityLog[] =>
  entries.map(([matchDate, result, comment]) => ({ id: ++logId, matchDate, result, comment: comment ?? null }))

const priority = (id: number, p: Partial<AnalysisPriority> & Pick<AnalysisPriority, "title" | "situation" | "decision" | "check">): AnalysisPriority => ({
  id,
  moments: null,
  blockId: null,
  block: null,
  blockEn: null,
  concepts: [],
  reviewResult: null,
  reviewComment: null,
  logs: [],
  ...p,
})

const analysis = (id: number, deliveredAtUtc: string, o: Partial<PersonalAnalysisItem>): PersonalAnalysisItem =>
  ({
    id,
    status: "Delivered",
    submittedAtUtc: deliveredAtUtc,
    uploadedVideoUrl: VIDEO,
    userNote: null,
    deliveredVideoUrl: VIDEO,
    deliveredPlanText: null,
    deliveredAtUtc,
    cycleEndsAtUtc: "2026-10-28T00:00:00Z",
    playerSide: "left",
    playerHand: "right",
    playerStart: "near",
    playerLook: "Camiseta roja y gorra blanca",
    ...o,
  }) as PersonalAnalysisItem

const october = analysis(103, "2026-10-02T10:00:00Z", {
  priorities: [
    priority(31, {
      title: "Sube a la red después de un buen resto",
      situation: "Restas profundo al revés del rival y te quedas en el fondo esperando la siguiente bola.",
      decision: "Si tu resto pasa de la línea de saque, subid los dos a la vez sin esperar a ver qué hace el rival.",
      check: "De cada 10 restos buenos, subes al menos en 6.",
      moments: "0:23 · 5:32 · 8:10",
      blockId: 2,
      block: "Transiciones",
      blockEn: "Transitions",
      concepts: [
        { id: 1, name: "Subida a la red", nameEn: "Net approach" },
        { id: 2, name: "Resto", nameEn: "Return" },
      ],
      logs: logs(["2026-10-05", "done", "Subí casi siempre, sobre todo con el resto cruzado"], ["2026-10-03", "partial", "Subí, pero tarde"]),
    }),
    priority(32, {
      title: "Cubre el medio cuando tu compañero sale de la pista",
      situation: "A tu compañero le sacan por la pared lateral y tú te quedas pegado a tu lado.",
      decision: "Da dos pasos al centro en cuanto veas que sale: el medio es tuyo hasta que vuelva.",
      check: "No os meten ningún punto por el medio en esa situación.",
      moments: "2:10 · 6:45",
      blockId: 1,
      block: "Defensa",
      blockEn: "Defense",
      concepts: [{ id: 5, name: "Coberturas", nameEn: "Covering" }],
      logs: logs(["2026-10-05", "missed", "Me quedé clavado dos veces"], ["2026-10-03", "partial"]),
    }),
    priority(33, {
      title: "Globo antes que forzar la bajada de pared",
      situation: "Te llega una bola alta tras la pared de fondo y estás lejos de ella.",
      decision: "Si no llegas cómodo, globo al revés del rival y recupera la posición.",
      check: "No regalas puntos intentando bajadas que no tienes.",
      moments: "4:02",
      blockId: 1,
      block: "Defensa",
      blockEn: "Defense",
      concepts: [
        { id: 3, name: "Globo", nameEn: "Lob" },
        { id: 6, name: "Bajada de pared", nameEn: "Wall descent" },
      ],
      logs: logs(["2026-10-05", "done"], ["2026-10-03", "done", "Tres globos buenos"]),
    }),
  ],
  strengths: "Repites la bola al mismo jugador cuando está incómodo {7:10}\nBuena comunicación con tu compañero en el saque",
  observations: "Ojo con tu posición de espera en la red: demasiado pegado {3:20}",
  finalComment: null,
})

const september = analysis(102, "2026-09-03T10:00:00Z", {
  priorities: [
    priority(21, {
      title: "Restar al medio contra pareja que sube rápido",
      situation: "Los rivales suben muy rápido después del saque.",
      decision: "Resta bajo y al medio para generar duda entre los dos.",
      check: "El primer golpe del rival en la red sale hacia arriba.",
      blockId: 3,
      block: "Saque y resto",
      blockEn: "Serve and return",
      concepts: [{ id: 2, name: "Resto", nameEn: "Return" }],
      reviewResult: "done",
      reviewComment: "Muy bien: ya restas al medio casi siempre y les cuesta volear.",
      logs: logs(["2026-09-20", "done"], ["2026-09-12", "done"], ["2026-09-06", "partial"]),
    }),
    priority(22, {
      title: "Bandeja a la reja en vez de al centro",
      situation: "Te tiran un globo corto y bandejas al centro, donde te esperan.",
      decision: "Busca la reja del jugador de revés.",
      check: "Tras tu bandeja, seguís en la red.",
      blockId: 4,
      block: "Ataque",
      blockEn: "Attack",
      concepts: [{ id: 7, name: "Bandeja", nameEn: "Bandeja" }],
      reviewResult: "partial",
      reviewComment: "Mejor dirección, pero todavía la dejas corta cuando retrocedes mucho.",
      logs: logs(["2026-09-20", "partial"], ["2026-09-12", "missed"]),
    }),
  ],
  strengths: "Buen primer saque al cristal",
  finalComment: "Noto que resto mucho mejor. La bandeja me sigue costando cuando me tiran el globo profundo.",
})

const august = analysis(101, "2026-08-04T10:00:00Z", {
  priorities: [
    priority(11, {
      title: "Posición de espera más atrás en defensa",
      situation: "Esperas pegado a la línea de saque y las bolas rápidas te pasan.",
      decision: "Un paso por detrás de la línea, y entra a la bola.",
      check: "Devuelves las bolas rápidas al cuerpo sin agobio.",
      blockId: 1,
      block: "Defensa",
      blockEn: "Defense",
      concepts: [{ id: 8, name: "Posicionamiento", nameEn: "Positioning" }],
      reviewResult: "done",
      reviewComment: "Conseguido, se nota mucho.",
      logs: logs(["2026-08-22", "done"], ["2026-08-10", "partial"]),
    }),
    priority(12, {
      title: "Volea de revés profunda",
      situation: "Tu volea de revés se queda a media pista.",
      decision: "Acompaña más la bola y busca los pies.",
      check: "El rival golpea por detrás de la línea de saque.",
      blockId: 4,
      block: "Ataque",
      blockEn: "Attack",
      concepts: [{ id: 9, name: "Volea", nameEn: "Volley" }],
      reviewResult: "missed",
      reviewComment: "Sigue quedándose corta; lo retomamos más adelante.",
      logs: logs(["2026-08-22", "missed"]),
    }),
  ],
})

const pending = analysis(104, "2026-10-06T09:00:00Z", {
  status: "InReview",
  submittedAtUtc: "2026-10-06T09:00:00Z",
  deliveredVideoUrl: null,
  deliveredAtUtc: null,
  userNote: "Mirad sobre todo mis subidas a la red",
})

export const COACH_DEMO: Record<CoachDemoMode, MyPersonalAnalysis> = {
  entregado: { canSubmit: false, request: october, history: [september, august], currentPeriodEndsAtUtc: "2026-10-28T00:00:00Z" },
  enviar: {
    canSubmit: true,
    request: october,
    history: [september, august],
    currentPeriodEndsAtUtc: "2026-11-28T00:00:00Z",
    lastPlayerProfile: { playerSide: "left", playerHand: "right" },
  },
  analisis: { canSubmit: false, request: pending, history: [october, september, august], currentPeriodEndsAtUtc: "2026-10-28T00:00:00Z" },
  vacio: { canSubmit: true, request: null, history: [], currentPeriodEndsAtUtc: "2026-10-28T00:00:00Z" },
}

const marta = { userId: 9001, userEmail: "marta.garcia@ejemplo.com", userName: "Marta García" }
const carlos = { userId: 9002, userEmail: "carlos.ruiz@ejemplo.com", userName: "Carlos Ruiz" }

/** Cola de ejemplo del panel de admin, en el orden en que la devuelve el backend. */
export const COACH_ADMIN_DEMO: AdminPersonalAnalysisItem[] = [
  {
    ...analysis(204, "2026-10-06T09:00:00Z", {
      status: "Submitted",
      deliveredVideoUrl: null,
      deliveredAtUtc: null,
      userNote: "Mirad sobre todo mis subidas a la red, creo que sigo llegando tarde.",
      matchContext: "Liga del club, ganamos 6-4 7-5",
    }),
    ...marta,
    // Su análisis anterior, con lo que ha ido anotando y su comentario final.
    previous: { ...october, finalComment: "Subo más a la red, pero cuando el resto es paralelo dudo. Cubrir el medio me sigue costando: me doy cuenta tarde." },
  },
  {
    ...analysis(205, "2026-10-04T18:30:00Z", {
      status: "InReview",
      deliveredVideoUrl: null,
      deliveredAtUtc: null,
      playerSide: "right",
      playerHand: "left",
      playerStart: "far",
      playerLook: "Camiseta negra, pala amarilla",
      matchContext: "Amistoso",
      userNote: null,
    }),
    ...carlos,
    previous: null,
  },
  { ...october, ...marta, previous: null },
  { ...september, ...marta, previous: null },
]
