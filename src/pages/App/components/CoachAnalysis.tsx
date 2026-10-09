import { Fragment, useRef, useState } from "react"
import { Check, ChevronDown, Minus, Plus, Trash2, X } from "lucide-react"
import HlsPlayer, { type VideoPlayerHandle } from "../../../lib/player/VideoPlayer"
import { addPriorityLog, deletePriorityLog, setFinalComment } from "../../../lib/api/personalAnalysis"
import type { AnalysisPriority, PersonalAnalysisItem, PriorityLog, PriorityResult } from "../../../lib/api/types"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { useResultLabels } from "./coachResultLabels"
import AnalysisThread from "./AnalysisThread"
import type { ThreadSide } from "../../../lib/api/personalAnalysis"

/**
 * Piezas de un análisis de Coach ya entregado, compartidas por Coach.tsx (análisis actual e
 * historial), MiLista.tsx (grupo de quien ya no tiene Coach) y AdminCoach.tsx (lo que Guille ve
 * del análisis anterior). Un análisis trae una ficha de 1 a 4 prioridades (§"Entregable Coach y
 * checklist del alumno"); los entregados antes de ese formato traen solo un texto libre.
 */

/** "3:45" o "1:02:10" dentro de un texto. Límites de palabra para no partir números más largos. */
const TIME_RE = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g
/** Lo mismo, pero solo si va entre llaves: "{3:45}". Para los textos libres de la ficha, donde
 * quien escribe puede querer poner un paréntesis o una hora sin que se convierta en enlace. */
const BRACED_TIME_RE = /\{\s*(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\s*\}/g

const toSeconds = (h: string | undefined, m: string, s: string) => (h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s)

/**
 * Texto con cada tiempo ("3:45") convertido en un enlace que lleva el vídeo a ese momento. Quien
 * escribe no tiene que marcar nada: basta con poner el minuto — salvo con `braced`, donde solo
 * cuentan los que van entre llaves. Sin `onSeek` (sin vídeo al lado) se quedan como texto.
 */
export const TimedText = ({
  text,
  onSeek,
  braced = false,
  className = "",
}: {
  text: string
  onSeek?: (seconds: number) => void
  /** Solo se enlazan los tiempos escritos entre llaves ("{3:45}"); las llaves no se muestran. */
  braced?: boolean
  className?: string
}) => {
  const parts: React.ReactNode[] = []
  let last = 0
  const label = (match: RegExpMatchArray) => (braced ? match[0].replace(/[{}\s]/g, "") : match[0])
  // Sin vídeo al lado, los tiempos entre llaves se quedan como texto, pero sin las llaves.
  if (onSeek || braced) {
    for (const match of text.matchAll(braced ? BRACED_TIME_RE : TIME_RE)) {
      const index = match.index ?? 0
      if (index > last) parts.push(<Fragment key={`t${last}`}>{text.slice(last, index)}</Fragment>)
      const seconds = toSeconds(match[1], match[2], match[3])
      parts.push(
        !onSeek ? (
          <span key={`m${index}`} className="font-semibold tabular-nums text-white">
            {label(match)}
          </span>
        ) : (
          <button
            key={`m${index}`}
            type="button"
            onClick={() => onSeek(seconds)}
            className="rounded bg-neon-cyan/10 px-1 font-semibold tabular-nums text-neon-cyan underline-offset-2 hover:underline"
          >
            {label(match)}
          </button>
        ),
      )
      last = index + match[0].length
    }
  }
  if (last < text.length) parts.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>)
  return <span className={`whitespace-pre-wrap ${className}`}>{parts}</span>
}

const RESULT_STYLE: Record<PriorityResult, string> = {
  done: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  partial: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  missed: "border-red-400/40 bg-red-400/10 text-red-300",
}
const RESULT_ICON: Record<PriorityResult, typeof Check> = { done: Check, partial: Minus, missed: X }

export const ResultBadge = ({ result, label }: { result: PriorityResult; label: string }) => {
  const Icon = RESULT_ICON[result]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RESULT_STYLE[result]}`}>
      <Icon className="h-3 w-3" strokeWidth={3} /> {label}
    </span>
  )
}

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{label}</p>
    <div className="text-sm leading-relaxed text-white/85">{children}</div>
  </div>
)

const fmtDay = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long" })

const today = () => new Date().toISOString().slice(0, 10)

/** Aviso de que ha cambiado el seguimiento de una prioridad (alta o baja de una anotación). */
export type LogsChange = (priorityId: number, logs: PriorityLog[]) => void

/** "Tu seguimiento durante el mes" de una prioridad: lo anotado y, si se puede editar, el alta. */
const PriorityTracking = ({
  requestId,
  priority,
  editable,
  onLogsChange,
}: {
  requestId: number
  priority: AnalysisPriority
  editable: boolean
  onLogsChange?: LogsChange
}) => {
  const { t, lang } = useI18n()
  const labels = useResultLabels()
  const [logs, setLogs] = useState<PriorityLog[]>(priority.logs)
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(today())
  const [result, setResult] = useState<PriorityResult | null>(null)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cada cambio se avisa también hacia arriba: el resumen de progreso se calcula con estos datos.
  const update = (next: PriorityLog[]) => {
    setLogs(next)
    onLogsChange?.(priority.id, next)
  }

  const save = async () => {
    if (!result || busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await addPriorityLog(requestId, priority.id, { matchDate: date, result, comment: comment.trim() || undefined })
      update([created, ...logs])
      setAdding(false)
      setResult(null)
      setComment("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("coach.log.error", "No se pudo guardar."))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (log: PriorityLog) => {
    const before = logs
    update(logs.filter((l) => l.id !== log.id))
    try {
      await deletePriorityLog(requestId, log.id)
    } catch {
      update(before)
    }
  }

  if (!editable && logs.length === 0) return null

  return (
    <div className="border-t border-white/10 pt-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{t("coach.log.title", "Tu seguimiento durante el mes")}</p>
      {logs.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {logs.map((log) => (
            // En móvil el comentario baja a su propia línea: al lado de la fecha y la etiqueta
            // quedaba en una columna de dos palabras.
            <li key={log.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {/* Solo el día (a mediodía), para que la zona horaria no lo mueva al anterior. */}
              <span className="w-24 shrink-0 text-xs tabular-nums text-white/50">{fmtDay(`${log.matchDate.slice(0, 10)}T12:00:00`, lang)}</span>
              <ResultBadge result={log.result} label={labels.student[log.result]} />
              {log.comment && <span className="order-last min-w-0 basis-full text-white/75 sm:order-none sm:flex-1 sm:basis-0">{log.comment}</span>}
              {editable && (
                <button onClick={() => remove(log)} className="ml-auto shrink-0 p-0.5 text-white/30 hover:text-red-400" aria-label={t("coach.log.delete", "Borrar anotación")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable &&
        (adding ? (
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-base text-white [color-scheme:dark] focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
              />
              {(["done", "partial", "missed"] as PriorityResult[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  aria-pressed={result === r}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${result === r ? RESULT_STYLE[r] : "border-white/15 text-white/60"}`}
                >
                  {labels.student[r]}
                </button>
              ))}
            </div>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder={t("coach.log.comment-placeholder", "Qué pasó, cuándo te costó (opcional)")}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <div className="flex gap-2">
              <button onClick={save} disabled={!result || busy} className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight disabled:cursor-not-allowed disabled:opacity-60">
                {t("coach.log.save", "Guardar")}
              </button>
              <button onClick={() => setAdding(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70">
                {t("club.personal-analysis.cancel", "Cancelar")}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan">
            <Plus className="h-4 w-4" /> {t("coach.log.add", "Anotar un partido")}
          </button>
        ))}
    </div>
  )
}

/** Una prioridad de la ficha. `editable`: el alumno puede anotar su seguimiento (análisis en curso). */
export const PriorityCard = ({
  requestId,
  index,
  priority,
  editable,
  onSeek,
  onLogsChange,
}: {
  requestId: number
  index: number
  priority: AnalysisPriority
  editable: boolean
  onSeek?: (seconds: number) => void
  onLogsChange?: LogsChange
}) => {
  const { t, lang } = useI18n()
  const labels = useResultLabels()
  return (
    <article className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-cyan text-sm font-bold text-midnight">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold leading-snug text-white">{priority.title}</h3>
          {(priority.block || priority.concepts.length > 0) && (
            <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
              {priority.block && <span className="font-semibold text-white/55">{pickText(priority.block, priority.blockEn ?? undefined, lang)}</span>}
              {priority.concepts.map((c) => (
                <span key={c.id} className="text-neon-cyan/80">
                  #{pickText(c.name, c.nameEn, lang)}
                </span>
              ))}
            </p>
          )}
        </div>
        {priority.reviewResult && <ResultBadge result={priority.reviewResult} label={labels.review[priority.reviewResult]} />}
      </header>

      <FieldRow label={t("coach.priority.situation", "Situación")}>{priority.situation}</FieldRow>
      <FieldRow label={t("coach.priority.decision", "Qué decidir")}>{priority.decision}</FieldRow>
      <FieldRow label={t("coach.priority.check", "Cómo saber si lo haces")}>{priority.check}</FieldRow>
      {priority.moments && (
        <FieldRow label={t("coach.priority.moments", "Míralo en tu vídeo")}>
          <TimedText text={priority.moments} onSeek={onSeek} />
        </FieldRow>
      )}
      {priority.reviewComment && (
        <FieldRow label={t("coach.review.title", "Revisión en tu siguiente análisis")}>{priority.reviewComment}</FieldRow>
      )}

      <PriorityTracking requestId={requestId} priority={priority} editable={editable} onLogsChange={onLogsChange} />
    </article>
  )
}

/** Lista con minutos enlazados: "Lo que ya haces bien" y "Otras observaciones" (una por línea).
 * Aquí el minuto se marca entre llaves, "{12:03}", para no confundirlo con un paréntesis normal. */
const TimedList = ({ title, text, onSeek }: { title: string; text: string; onSeek?: (seconds: number) => void }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{title}</p>
    <ul className="space-y-1.5">
      {text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-white/80">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neon-cyan" />
            <TimedText text={line} onSeek={onSeek} braced />
          </li>
        ))}
    </ul>
  </div>
)

/** "Para Guille, antes de la próxima sesión": comentario final del alumno. */
const FinalComment = ({ analysis, editable }: { analysis: PersonalAnalysisItem; editable: boolean }) => {
  const { t } = useI18n()
  const [text, setText] = useState(analysis.finalComment ?? "")
  const [saved, setSaved] = useState(analysis.finalComment ?? "")
  const [busy, setBusy] = useState(false)

  if (!editable && !saved) return null

  const save = async () => {
    setBusy(true)
    try {
      await setFinalComment(analysis.id, text.trim())
      setSaved(text.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t("coach.final.title", "Para Guille, antes de tu próximo análisis")}</p>
      {editable ? (
        <>
          <p className="mb-2 text-xs text-white/45">{t("coach.final.help", "Qué notas que ha cambiado, qué te sigue costando y qué duda tienes.")}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
          <button
            onClick={save}
            disabled={busy || text.trim() === saved}
            className="mt-2 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight disabled:cursor-not-allowed disabled:opacity-50"
          >
            {text.trim() === saved && saved ? t("coach.final.saved", "Guardado") : t("coach.log.save", "Guardar")}
          </button>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{saved}</p>
      )}
    </div>
  )
}

/**
 * La ficha de un análisis, sin vídeo: prioridades, lo que ya hace bien, otras observaciones y el
 * comentario final. `onSeek` enlaza los minutos al vídeo que tenga al lado quien la usa.
 */
export const AnalysisSheet = ({
  analysis,
  editable,
  onSeek,
  onLogsChange,
}: {
  analysis: PersonalAnalysisItem
  editable: boolean
  onSeek?: (seconds: number) => void
  onLogsChange?: LogsChange
}) => {
  const { t } = useI18n()
  const priorities = analysis.priorities ?? []
  return (
    <div className="space-y-4">
      {priorities.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t("coach.priorities.title", "Tus prioridades del mes")}</p>
          {priorities.map((p, i) => (
            <PriorityCard key={p.id} requestId={analysis.id} index={i} priority={p} editable={editable} onSeek={onSeek} onLogsChange={onLogsChange} />
          ))}
        </>
      )}
      {/* Análisis entregados antes de la ficha: su plan era un texto libre. */}
      {priorities.length === 0 && analysis.deliveredPlanText && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t("coach.priorities.title", "Tus prioridades del mes")}</p>
          <TimedText text={analysis.deliveredPlanText} onSeek={onSeek} className="text-sm leading-relaxed text-white/80" />
        </div>
      )}
      {analysis.strengths && <TimedList title={t("coach.strengths.title", "Lo que ya haces bien")} text={analysis.strengths} onSeek={onSeek} />}
      {analysis.observations && <TimedList title={t("coach.observations.title", "Otras observaciones")} text={analysis.observations} onSeek={onSeek} />}
      {priorities.length > 0 && <FinalComment analysis={analysis} editable={editable} />}
    </div>
  )
}

/** Vídeo del análisis + su ficha, con los minutos del texto enlazados al vídeo. */
export const DeliveredAnalysisView = ({
  analysis,
  editable = false,
  onLogsChange,
  thread,
}: {
  analysis: PersonalAnalysisItem
  editable?: boolean
  onLogsChange?: LogsChange
  /** Si se pasa, bajo la ficha va el hilo de mensajes de ese análisis, abierto desde ese lado. */
  thread?: ThreadSide
}) => {
  const playerRef = useRef<VideoPlayerHandle>(null)
  if (!analysis.deliveredVideoUrl) return null
  return (
    // En escritorio, vídeo a la izquierda (fijo al hacer scroll) y ficha a la derecha: apilados,
    // había que bajar para leer y volver a subir cada vez que se pulsaba un minuto.
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-5 lg:space-y-0">
      <div className="overflow-hidden rounded-xl border border-white/10 lg:sticky lg:top-24">
        <HlsPlayer ref={playerRef} src={analysis.deliveredVideoUrl} aspect="16:9" />
      </div>
      <div className="space-y-4">
        <AnalysisSheet analysis={analysis} editable={editable} onLogsChange={onLogsChange} onSeek={(seconds) => playerRef.current?.seekExact(seconds)} />
        {thread && <AnalysisThread requestId={analysis.id} side={thread} messageCount={analysis.messageCount} unread={analysis.unreadMessages} />}
      </div>
    </div>
  )
}

/**
 * Lista de análisis entregados, del más reciente al más antiguo: una fila por análisis con su
 * fecha de entrega, que se despliega para ver el vídeo y su ficha (solo lectura). El vídeo solo
 * se monta al abrir la fila, para no cargar varios reproductores a la vez.
 */
export const PastAnalysesList = ({ items, thread }: { items: PersonalAnalysisItem[]; thread?: ThreadSide }) => {
  const { t, lang } = useI18n()
  const [openId, setOpenId] = useState<number | null>(null)
  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long", year: "numeric" }) : ""

  return (
    <ul className="space-y-2">
      {items
        .filter((item) => item.deliveredVideoUrl)
        .map((item) => {
          const open = item.id === openId
          return (
            <li key={item.id} className={`rounded-xl border bg-white/[0.02] ${open ? "border-neon-cyan/30" : "border-white/10"}`}>
              <button onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-medium text-white">{t("coach.history.delivered-on", "Análisis del {date}", { date: fmt(item.deliveredAtUtc) })}</span>
                {thread && (item.unreadMessages ?? 0) > 0 && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-neon-cyan" aria-hidden />}
                <ChevronDown className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="px-4 pb-4">
                  <DeliveredAnalysisView analysis={item} thread={thread} />
                </div>
              )}
            </li>
          )
        })}
    </ul>
  )
}
