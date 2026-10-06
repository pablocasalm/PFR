import { apiGet, apiPost, apiPatch, apiDelete } from "./client"
import type { PersonalAnalysisItem, PlayerSide, PriorityLog, PriorityResult } from "./types"

/**
 * Análisis táctico personalizado (§Club hub, Fase 5, plan Coach). El frontend define el
 * contrato; el backend se adapta.
 *
 * La subida NO usa el token de publicación de admin.ts (eso significa "puedo publicar
 * catálogo") — el usuario sube un vídeo privado suyo con su JWT normal, por eso este módulo
 * tiene su propio direct-upload/status en vez de reutilizar los de admin.ts.
 */

export const createDirectUpload = (name: string, size: number, durationSeconds?: number) =>
  apiPost<{ uploadURL: string; uid: string }>("/api/club/personal-analysis/direct-upload", { name, size, durationSeconds })

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

export type MyPersonalAnalysis = {
  canSubmit: boolean
  request: PersonalAnalysisItem | null
  /** Análisis ya entregados anteriores al actual, del más reciente al más antiguo. */
  history?: PersonalAnalysisItem[]
  /** Fin del periodo de facturación en curso: hasta cuándo se puede enviar el partido de este mes. */
  currentPeriodEndsAtUtc?: string | null
  /** Lado y mano del último envío, para traerlos ya rellenos en el siguiente. */
  lastPlayerProfile?: { playerSide?: PlayerSide | null; playerHand?: PlayerSide | null } | null
}

/** Un análisis ya entregado, tal como lo ve quien ya no tiene Coach (grupo de Mi Lista): solo
 * el vídeo de Guille y sus prioridades, sin el vídeo original ni el formulario de envío. */
export type DeliveredAnalysis = PersonalAnalysisItem

/** GET /api/my-analyses → análisis de Coach entregados al usuario. A diferencia del resto de
 * este módulo, no exige el plan Coach (sí una suscripción activa de cualquier plan): es lo que
 * conserva quien baja de Coach a Club o Starter. */
export const getMyDeliveredAnalyses = () => apiGet<DeliveredAnalysis[]>("/api/my-analyses")

/** GET /api/club/personal-analysis → tu última solicitud (o null) + si puedes enviar otra. */
export const getMyPersonalAnalysis = () => apiGet<MyPersonalAnalysis>("/api/club/personal-analysis")

/** Quién es el jugador en el vídeo — obligatorio al enviar, para que Guille sepa a quién mirar. */
export type PlayerInfo = {
  playerSide: PlayerSide
  playerHand: PlayerSide
  playerStart: "near" | "far"
  playerLook: string
  matchContext?: string
}

/** POST /api/club/personal-analysis → envía el partido ya subido. */
export const submitPersonalAnalysis = (uid: string, durationSeconds: number, player: PlayerInfo, note?: string) =>
  apiPost<PersonalAnalysisItem>("/api/club/personal-analysis", { uid, durationSeconds, note, ...player })

/** Pantalla Coach con datos de ejemplo (`?ejemplo`, solo en desarrollo — ver coachDemo.ts): lo
 * que el alumno anota no se manda a ningún sitio, porque esos análisis no existen. */
const isDemo = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has("ejemplo")

/** POST …/{id}/priorities/{priorityId}/logs → el alumno anota un partido en una prioridad. */
export const addPriorityLog = (requestId: number, priorityId: number, log: { matchDate: string; result: PriorityResult; comment?: string }) =>
  isDemo() ? Promise.resolve<PriorityLog>({ id: Date.now(), ...log }) : apiPost<PriorityLog>(`/api/club/personal-analysis/${requestId}/priorities/${priorityId}/logs`, log)

/** DELETE …/{id}/logs/{logId} → borra una anotación propia. */
export const deletePriorityLog = (requestId: number, logId: number) =>
  isDemo() ? Promise.resolve({ ok: true }) : apiDelete<{ ok: boolean }>(`/api/club/personal-analysis/${requestId}/logs/${logId}`)

/** PATCH …/{id}/final-comment → comentario final del alumno para Guille. */
export const setFinalComment = (requestId: number, text: string) =>
  isDemo()
    ? Promise.resolve({ ok: true, finalComment: text })
    : apiPatch<{ ok: boolean; finalComment: string | null }>(`/api/club/personal-analysis/${requestId}/final-comment`, { text })

/** PATCH /api/club/personal-analysis/{id} → corrige un envío propio (vídeo y/o nota) mientras
 * siga en cola ("Submitted"); el backend lo rechaza en cuanto pasa a "en revisión". Todo
 * opcional: solo se manda lo que se quiere cambiar. */
export const editPersonalAnalysis = (id: number, changes: { uid?: string; durationSeconds?: number; note?: string } & Partial<PlayerInfo>) =>
  apiPatch<PersonalAnalysisItem>(`/api/club/personal-analysis/${id}`, changes)

/* ---- Gestión (solo Admin) ---- */

/** `previous`: el análisis entregado anterior del mismo alumno (sus prioridades, su seguimiento y
 * su comentario final), para que Guille empiece revisando cómo ha ido. Solo viene en pendientes. */
export type AdminPersonalAnalysisItem = PersonalAnalysisItem & {
  userId: number
  userEmail: string | null
  userName: string | null
  previous: PersonalAnalysisItem | null
}
type AdminPersonalAnalysisRow = { item: PersonalAnalysisItem; userId: number; userEmail: string | null; userName: string | null; previous: PersonalAnalysisItem | null }
export type AdminPersonalAnalysisCounts = { submitted: number; inReview: number; delivered: number }
export type AdminPersonalAnalysisList = { items: AdminPersonalAnalysisItem[]; counts: AdminPersonalAnalysisCounts }

/** GET /api/admin/personal-analysis → cola completa, con quién la mandó. */
export const adminListPersonalAnalysis = async (): Promise<AdminPersonalAnalysisList> => {
  const res = await apiGet<{ items: (AdminPersonalAnalysisRow | AdminPersonalAnalysisItem)[]; counts: AdminPersonalAnalysisCounts }>("/api/admin/personal-analysis")
  // El backend anterior a la ficha devolvía cada fila ya plana, sin `item` ni `previous`: se
  // acepta también, para que el panel no se rompa si el frontend se despliega antes.
  return {
    counts: res.counts,
    items: res.items.map((row) => ("item" in row ? { ...row.item, userId: row.userId, userEmail: row.userEmail, userName: row.userName, previous: row.previous } : { ...row, previous: null })),
  }
}

/** PATCH /api/admin/personal-analysis/{id} → marca como "en revisión". */
export const adminMarkInReview = (id: number) => apiPatch<{ ok: boolean; status: string }>(`/api/admin/personal-analysis/${id}`, {})

export type DeliverPriorityInput = {
  /** Solo al corregir una ficha ya entregada: la prioridad que se modifica. Sin él, es nueva. */
  id?: number
  title: string
  situation: string
  decision: string
  check: string
  moments?: string
  blockId?: number
  conceptIds: number[]
}

export type DeliverAnalysisInput = {
  uid: string
  /** Entre 1 y 4 prioridades. */
  priorities: DeliverPriorityInput[]
  strengths?: string
  observations?: string
  /** Revisión de las prioridades del análisis anterior del alumno. */
  previousReview: { priorityId: number; result: PriorityResult; comment?: string }[]
}

/** POST /api/admin/personal-analysis/{id}/deliver → entrega el análisis (vídeo + ficha). */
export const adminDeliverPersonalAnalysis = (id: number, input: DeliverAnalysisInput) =>
  apiPost<{ ok: boolean }>(`/api/admin/personal-analysis/${id}/deliver`, input)

/** PATCH /api/admin/personal-analysis/{id}/sheet → corrige la ficha de un análisis ya entregado.
 * Las prioridades que traen `id` se modifican conservando el seguimiento del alumno y la revisión;
 * las que no, se crean; las que ya no vienen, se borran. `uid` solo si se sustituye el vídeo. */
export const adminUpdateAnalysisSheet = (id: number, input: Omit<DeliverAnalysisInput, "uid" | "previousReview"> & { uid?: string }) =>
  apiPatch<{ ok: boolean }>(`/api/admin/personal-analysis/${id}/sheet`, input)

/** DELETE /api/admin/personal-analysis/{id} → elimina una solicitud. */
export const adminDeletePersonalAnalysis = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/personal-analysis/${id}`)
