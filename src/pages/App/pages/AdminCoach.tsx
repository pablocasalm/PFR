import { useEffect, useRef, useState } from "react"
import { Sparkles, History, ChevronDown, CheckCircle2, Send, Trash2, Plus, Pencil, X } from "lucide-react"
import {
  adminListPersonalAnalysis,
  adminMarkInReview,
  adminDeliverPersonalAnalysis,
  adminUpdateAnalysisSheet,
  adminDeletePersonalAnalysis,
  type AdminPersonalAnalysisItem,
  type DeliverPriorityInput,
} from "../../../lib/api/personalAnalysis"
import { createDirectUpload, uploadToCloudflare, readVideoDuration, createPublishToken, waitForVideoReady, getConcepts, type ConceptOption } from "../../../lib/api/admin"
import { getBlocks, type BlockOption } from "../../../lib/api/blocks"
import type { AnalysisPriority, PersonalAnalysisItem, PriorityResult } from "../../../lib/api/types"
import { COACH_ADMIN_DEMO, coachDemoMode } from "../components/coachDemo"
import { AnalysisSheet, ResultBadge } from "../components/CoachAnalysis"
import { useResultLabels } from "../components/coachResultLabels"
import FileDrop from "../components/FileDrop"
import HlsPlayer, { type VideoPlayerHandle } from "../../../lib/player/VideoPlayer"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminCoach — cola de análisis tácticos personalizados (§Club hub, Fase 5, plan Coach, solo
 * Admin). Nuevo → En revisión → Entregado. Al entregar se rellena la ficha (entre 1 y 4
 * prioridades etiquetadas con bloque y conceptos, lo que ya hace bien y otras observaciones) y,
 * si el alumno tiene un análisis anterior, se revisa cómo le ha ido con sus prioridades. Una
 * ficha ya entregada se puede corregir ("Editar ficha"). La entrega reutiliza el ciclo de subida de admin.ts
 * (Guille sí puede pedir token de publicación) — la subida del propio usuario, en cambio, no
 * pasa por ahí (ver personalAnalysis.ts).
 */

const fmt = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  Submitted: { label: "Nuevo", cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  InReview: { label: "En revisión", cls: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  Delivered: { label: "Entregado", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"

const MIN_PRIORITIES = 1
const MAX_PRIORITIES = 4

/** `id`: la prioridad ya existe (se está editando una ficha entregada); sin él, es nueva. */
type PriorityDraft = { key: number; id?: number; title: string; situation: string; decision: string; check: string; moments: string[]; blockId: string; conceptIds: number[] }
let draftKey = 0
const emptyPriority = (): PriorityDraft => ({ key: ++draftKey, title: "", situation: "", decision: "", check: "", moments: [], blockId: "", conceptIds: [] })
const isPriorityComplete = (p: PriorityDraft) => !!p.title.trim() && !!p.situation.trim() && !!p.decision.trim() && !!p.check.trim()

/** Un minuto del vídeo: "5:32" o "1:02:10". */
const MOMENT_RE = /^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/
const MOMENT_SEP = " · "

const toDraft = (p: AnalysisPriority): PriorityDraft => ({
  key: ++draftKey,
  id: p.id,
  title: p.title,
  situation: p.situation,
  decision: p.decision,
  check: p.check,
  moments: (p.moments ?? "").match(/(?:\d{1,2}:)?[0-5]?\d:[0-5]\d/g) ?? [],
  blockId: p.blockId != null ? String(p.blockId) : "",
  conceptIds: p.concepts.map((c) => c.id),
})

const toInput = (p: PriorityDraft): DeliverPriorityInput => ({
  id: p.id,
  title: p.title.trim(),
  situation: p.situation.trim(),
  decision: p.decision.trim(),
  check: p.check.trim(),
  moments: p.moments.length > 0 ? p.moments.join(MOMENT_SEP) : undefined,
  blockId: p.blockId ? Number(p.blockId) : undefined,
  conceptIds: p.conceptIds,
})

/** Campo con su nombre siempre a la vista y una línea que dice qué escribir: con solo el texto
 * de ayuda dentro de la caja, al rellenarla ya no se sabía qué campo era cuál. */
const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <p className="text-sm font-semibold text-white">{label}</p>
    {hint && <p className="text-xs leading-snug text-white/50">{hint}</p>}
    <div className="mt-1.5">{children}</div>
  </div>
)

/** Minutos del vídeo analizado donde se ve la prioridad: se añaden de uno en uno y quedan como
 * etiquetas, en vez de un texto libre con un formato que había que adivinar. */
const MomentsInput = ({ value, onChange }: { value: string[]; onChange: (moments: string[]) => void }) => {
  const { t } = useI18n()
  const [text, setText] = useState("")
  const [invalid, setInvalid] = useState(false)

  const add = () => {
    // Se aceptan varios de golpe ("0:23, 5:32 13:23").
    const parts = text.split(/[\s,;·]+/).filter(Boolean)
    if (parts.length === 0) return
    if (!parts.every((part) => MOMENT_RE.test(part))) return setInvalid(true)
    onChange([...value, ...parts.filter((part) => !value.includes(part))])
    setText("")
    setInvalid(false)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((moment) => (
          <span key={moment} className="flex items-center gap-1 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold tabular-nums text-neon-cyan">
            {moment}
            <button type="button" onClick={() => onChange(value.filter((m) => m !== moment))} aria-label={t("admin-coach.moments.remove", "Quitar {moment}", { moment })} className="text-neon-cyan/60 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setInvalid(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          inputMode="numeric"
          placeholder="5:32"
          aria-label={t("admin-coach.moments.input", "Minuto del vídeo")}
          className={`${inputCls} !w-24 tabular-nums`}
        />
        <button type="button" onClick={add} disabled={!text.trim()} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 disabled:opacity-40">
          {t("admin-coach.moments.add", "Añadir")}
        </button>
      </div>
      {invalid && <p className="mt-1 text-xs text-red-300">{t("admin-coach.moments.invalid", "Escríbelo como minuto:segundos, por ejemplo 5:32.")}</p>}
    </>
  )
}

/** Una prioridad de la ficha que rellena Guille (o quien la prepare) al entregar. */
const PriorityEditor = ({
  index,
  draft,
  blocks,
  concepts,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number
  draft: PriorityDraft
  blocks: BlockOption[]
  concepts: ConceptOption[]
  canRemove: boolean
  onChange: (changes: Partial<PriorityDraft>) => void
  onRemove: () => void
}) => {
  const { t } = useI18n()
  const [conceptQuery, setConceptQuery] = useState("")
  const q = conceptQuery.trim().toLowerCase()
  // Seleccionados siempre a la vista; del resto, solo los que coinciden con lo escrito (el
  // catálogo entero de conceptos no cabe en pantalla).
  const shown = concepts.filter((c) => draft.conceptIds.includes(c.id) || (q !== "" && c.nameEs.toLowerCase().includes(q)))
  const toggleConcept = (id: number) =>
    onChange({ conceptIds: draft.conceptIds.includes(id) ? draft.conceptIds.filter((x) => x !== id) : [...draft.conceptIds, id] })

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-base font-bold text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neon-cyan text-xs font-bold text-midnight">{index + 1}</span>
          {t("admin-coach.priority", "Prioridad {n}", { n: index + 1 })}
        </p>
        {canRemove && (
          <button onClick={onRemove} className="text-white/40 hover:text-red-400" aria-label={t("admin-coach.remove-priority", "Quitar prioridad")}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Field label={t("admin-coach.priority.title-label", "Título")} hint={t("admin-coach.priority.title-hint", "Una frase corta que pueda recordar en pista.")}>
        <input value={draft.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} placeholder={t("admin-coach.priority.title-example", "Sube a la red después de un buen resto")} className={inputCls} />
      </Field>
      <Field label={t("coach.priority.situation", "Situación")} hint={t("admin-coach.priority.situation-hint", "¿En qué momento del partido le pasa?")}>
        <textarea value={draft.situation} onChange={(e) => onChange({ situation: e.target.value })} maxLength={1000} rows={2} placeholder={t("admin-coach.priority.situation-example", "Restas profundo al revés del rival y te quedas en el fondo esperando.")} className={inputCls} />
      </Field>
      <Field label={t("coach.priority.decision", "Qué decidir")} hint={t("admin-coach.priority.decision-hint", "¿Qué tiene que hacer cuando se vea en esa situación?")}>
        <textarea value={draft.decision} onChange={(e) => onChange({ decision: e.target.value })} maxLength={1000} rows={2} placeholder={t("admin-coach.priority.decision-example", "Si el resto pasa de la línea de saque, subid los dos a la vez.")} className={inputCls} />
      </Field>
      <Field label={t("coach.priority.check", "Cómo saber si lo haces")} hint={t("admin-coach.priority.check-hint", "Una señal que pueda comprobar él mismo después de un partido.")}>
        <textarea value={draft.check} onChange={(e) => onChange({ check: e.target.value })} maxLength={1000} rows={2} placeholder={t("admin-coach.priority.check-example", "De cada 10 restos buenos, subes al menos en 6.")} className={inputCls} />
      </Field>
      <Field
        label={t("admin-coach.priority.moments-label", "Dónde se ve en el vídeo (opcional)")}
        hint={t("admin-coach.priority.moments-hint", "Los minutos del vídeo analizado donde aparece. El alumno pulsa un minuto y el vídeo salta a ese momento.")}
      >
        <MomentsInput value={draft.moments} onChange={(moments) => onChange({ moments })} />
      </Field>

      {/* Bloque y conceptos del catálogo: para poder seguir mes a mes en qué se trabaja. */}
      <Field label={t("admin-coach.priority.tags-label", "Bloque y conceptos (opcional)")} hint={t("admin-coach.priority.tags-hint", "Para ver mes a mes en qué está trabajando.")}>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={draft.blockId} onChange={(e) => onChange({ blockId: e.target.value })} className={inputCls} aria-label={t("admin-coach.priority.block", "Bloque")}>
            <option value="">{t("admin-coach.priority.no-block", "Sin bloque")}</option>
            {blocks.filter((b) => b.id != null).map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameEs}
              </option>
            ))}
          </select>
          <input value={conceptQuery} onChange={(e) => setConceptQuery(e.target.value)} placeholder={t("admin-coach.priority.concept-search", "Buscar conceptos para etiquetar…")} className={inputCls} />
        </div>
        {shown.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {shown.map((c) => {
              const on = draft.conceptIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleConcept(c.id)}
                  aria-pressed={on}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${on ? "border-neon-cyan/50 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/60"}`}
                >
                  #{c.nameEs}
                </button>
              )
            })}
          </div>
        )}
      </Field>
    </div>
  )
}

const SIDE_LABEL: Record<string, string> = { right: "derecha", left: "revés" }
const HAND_LABEL: Record<string, string> = { right: "diestro", left: "zurdo" }
const START_LABEL: Record<string, string> = { near: "empieza cerca de la cámara", far: "empieza lejos de la cámara" }

/** Lo que el alumno verá de la ficha que se acaba de guardar — solo para el modo de ejemplo. */
type SavedSheet = Partial<PersonalAnalysisItem>

const RequestCard = ({
  item,
  blocks,
  concepts,
  demo,
  onMarkInReview,
  onSaved,
  onRemove,
}: {
  item: AdminPersonalAnalysisItem
  blocks: BlockOption[]
  concepts: ConceptOption[]
  /** Datos de ejemplo (?ejemplo, solo en desarrollo): guardar no sube ni manda nada. */
  demo: boolean
  onMarkInReview: (item: AdminPersonalAnalysisItem) => void
  /** Entregado o editado. `sheet` solo viene en el modo de ejemplo. */
  onSaved: (item: AdminPersonalAnalysisItem, sheet?: SavedSheet) => void
  onRemove: (item: AdminPersonalAnalysisItem) => void
}) => {
  const { t, lang } = useI18n()
  const labels = useResultLabels()
  const isDelivered = item.status === "Delivered"
  // Los minutos de la ficha entregada llevan al vídeo analizado, igual que los ve el alumno.
  const analysisPlayer = useRef<VideoPlayerHandle>(null)
  // El formulario de la ficha sirve para entregar (pendientes) y para corregir (entregados).
  const [formOpen, setFormOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [priorities, setPriorities] = useState<PriorityDraft[]>(() => [emptyPriority()])
  const [strengths, setStrengths] = useState("")
  const [observations, setObservations] = useState("")
  // Revisión de las prioridades del análisis anterior del alumno (id de prioridad → resultado/comentario).
  const [review, setReview] = useState<Record<number, { result?: PriorityResult; comment: string }>>({})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const previous = item.previous
  // Al corregir una entrega el vídeo es opcional: sin elegir otro, se queda el que ya hay.
  const canSave = (!!file || demo || isDelivered) && priorities.length >= MIN_PRIORITIES && priorities.every(isPriorityComplete)

  const openForm = () => {
    if (isDelivered) {
      const existing = item.priorities ?? []
      setPriorities(existing.length > 0 ? existing.map(toDraft) : [emptyPriority()])
      setStrengths(item.strengths ?? "")
      setObservations(item.observations ?? "")
      setFile(null)
      setError(null)
    }
    setFormOpen(true)
  }

  const removePriority = (p: PriorityDraft) => {
    // Una prioridad ya entregada puede tener seguimiento del alumno, que se borraría con ella.
    if (p.id != null && !window.confirm(t("admin-coach.confirm-remove-priority", "Si quitas esta prioridad se borra también lo que el alumno haya anotado en ella. ¿Quitarla?"))) return
    setPriorities((prev) => prev.filter((x) => x.key !== p.key))
  }

  const uploadVideo = async (video: File) => {
    setProgress({ label: t("admin-coach.progress.video", "Subiendo el análisis…"), percent: 0 })
    const publishToken = await createPublishToken()
    const dur = await readVideoDuration(video)
    const up = await createDirectUpload(video.name, video.size, publishToken, dur)
    await uploadToCloudflare(up.uploadURL, video, (p) => setProgress({ label: t("admin-coach.progress.video", "Subiendo el análisis…"), percent: p }))
    setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
    await waitForVideoReady(up.uid)
    return up.uid
  }

  const save = async () => {
    if (!canSave || busy) return
    if (demo) {
      // Ejemplo: la ficha se queda solo en pantalla, con el vídeo de muestra.
      const existing = item.priorities ?? []
      onSaved(item, {
        deliveredVideoUrl: item.deliveredVideoUrl ?? item.uploadedVideoUrl,
        strengths: strengths.trim() || null,
        observations: observations.trim() || null,
        priorities: priorities.map((p, i) => {
          const block = blocks.find((b) => String(b.id) === p.blockId)
          const input = toInput(p)
          return {
            ...existing.find((x) => x.id === p.id),
            id: p.id ?? item.id * 10 + i,
            title: input.title,
            situation: input.situation,
            decision: input.decision,
            check: input.check,
            moments: input.moments ?? null,
            blockId: input.blockId ?? null,
            block: block?.nameEs ?? null,
            blockEn: block?.nameEn ?? null,
            concepts: concepts.filter((c) => p.conceptIds.includes(c.id)).map((c) => ({ id: c.id, name: c.nameEs, nameEn: c.nameEn ?? c.nameEs })),
            logs: existing.find((x) => x.id === p.id)?.logs ?? [],
          }
        }),
      })
      setFormOpen(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const sheet = { priorities: priorities.map(toInput), strengths: strengths.trim() || undefined, observations: observations.trim() || undefined }
      if (isDelivered) {
        await adminUpdateAnalysisSheet(item.id, { ...sheet, uid: file ? await uploadVideo(file) : undefined })
      } else {
        if (!file) return
        await adminDeliverPersonalAnalysis(item.id, {
          ...sheet,
          uid: await uploadVideo(file),
          previousReview: Object.entries(review)
            .filter(([, r]) => r.result)
            .map(([id, r]) => ({ priorityId: Number(id), result: r.result!, comment: r.comment.trim() || undefined })),
        })
      }
      setFormOpen(false)
      onSaved(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.deliver", "No se pudo entregar el análisis."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const player = [
    item.playerSide && `Juega en ${SIDE_LABEL[item.playerSide]}`,
    item.playerHand && HAND_LABEL[item.playerHand],
    item.playerStart && START_LABEL[item.playerStart],
  ].filter(Boolean)

  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short" })
  const captionCls = "mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50"

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[item.status]?.cls}`}>
          {STATUS_META[item.status]?.label ?? item.status}
        </span>
        <span className="text-xs text-white/50">{item.userEmail ?? item.userName ?? `#${item.userId}`}</span>
        <span className="ml-auto text-xs text-white/40">{fmt(item.submittedAtUtc, lang)}</span>
        <button
          onClick={() => onRemove(item)}
          aria-label={t("admin-coach.delete-aria", "Eliminar solicitud")}
          className="flex items-center text-white/40 transition hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quién es en el vídeo (lo rellena el alumno al enviar) */}
      {(player.length > 0 || item.playerLook) && (
        <div className="mb-3 rounded-lg border border-neon-cyan/20 bg-neon-cyan/[0.05] px-3 py-2 text-sm text-white/85">
          {player.length > 0 && <p className="font-medium">{player.join(" · ")}</p>}
          {item.playerLook && <p className="text-white/70">{item.playerLook}</p>}
          {item.matchContext && <p className="mt-1 text-xs text-white/50">{item.matchContext}</p>}
        </div>
      )}
      {item.userNote && <p className="mb-3 whitespace-pre-wrap text-sm text-white/80">{item.userNote}</p>}

      {/* Pendiente: el partido del alumno. Entregado: su partido y el vídeo analizado, lado a lado. */}
      {isDelivered && item.deliveredVideoUrl ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className={captionCls}>{t("admin-coach.video.student", "Vídeo del alumno")}</p>
            <div className="overflow-hidden rounded-lg border border-white/10">
              <HlsPlayer src={item.uploadedVideoUrl} aspect="16:9" />
            </div>
          </div>
          <div className="min-w-0">
            <p className={captionCls}>{t("admin-coach.video.analysis", "Vídeo analizado")}</p>
            <div className="overflow-hidden rounded-lg border border-neon-cyan/25">
              <HlsPlayer ref={analysisPlayer} src={item.deliveredVideoUrl} aspect="16:9" />
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <HlsPlayer src={item.uploadedVideoUrl} aspect="16:9" />
        </div>
      )}

      {/* Ya entregado: su ficha, con el seguimiento que haya ido anotando el alumno */}
      {isDelivered && !formOpen && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="mb-3 flex justify-end">
            <button onClick={openForm} className="flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition hover:text-white">
              <Pencil className="h-3.5 w-3.5" />
              {t("admin-coach.edit-sheet", "Editar ficha")}
            </button>
          </div>
          <AnalysisSheet analysis={item} editable={false} onSeek={(seconds) => analysisPlayer.current?.seekExact(seconds)} />
        </div>
      )}

      {!isDelivered && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
          {item.status === "Submitted" && (
            <button
              onClick={() => onMarkInReview(item)}
              className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
            >
              {t("admin-coach.mark-in-review", "Marcar como en revisión")}
            </button>
          )}
          <button
            onClick={() => (formOpen ? setFormOpen(false) : openForm())}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1.5 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/15"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("admin-coach.deliver", "Entregar")}
          </button>
        </div>
      )}

      {formOpen && (
        <div className="mt-3 space-y-5 border-t border-white/5 pt-4">
          {/* Análisis anterior del alumno: lo que se le pidió, lo que ha ido anotando y su
              comentario final — y la revisión de cada prioridad, que se guarda con la entrega. */}
          {!isDelivered && previous && (previous.priorities ?? []).length > 0 && (
            <div className="space-y-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-200">{t("admin-coach.previous.title", "Su análisis anterior: revisa cómo ha ido")}</p>
              {previous.finalComment && (
                <p className="whitespace-pre-wrap rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/85">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-white/45">{t("admin-coach.previous.final", "Su comentario para ti")}</span>
                  {previous.finalComment}
                </p>
              )}
              {(previous.priorities ?? []).map((p, i) => {
                const r = review[p.id] ?? { comment: "" }
                return (
                  <div key={p.id} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-sm font-semibold text-white">
                      {i + 1}. {p.title}
                    </p>
                    {p.logs.length > 0 ? (
                      <ul className="space-y-1">
                        {p.logs.map((log) => (
                          <li key={log.id} className="flex items-start gap-2 text-xs text-white/70">
                            <span className="w-12 shrink-0 pt-0.5 tabular-nums text-white/45">{day(log.matchDate)}</span>
                            <ResultBadge result={log.result} label={labels.student[log.result]} />
                            <span className="pt-0.5">{log.comment}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-white/40">{t("admin-coach.previous.no-logs", "No ha anotado ningún partido.")}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {(["done", "partial", "missed"] as PriorityResult[]).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setReview((prev) => ({ ...prev, [p.id]: { ...r, result: res } }))}
                          aria-pressed={r.result === res}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${r.result === res ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/60"}`}
                        >
                          {labels.review[res]}
                        </button>
                      ))}
                    </div>
                    <input
                      value={r.comment}
                      onChange={(e) => setReview((prev) => ({ ...prev, [p.id]: { ...r, comment: e.target.value } }))}
                      maxLength={1000}
                      placeholder={t("admin-coach.previous.comment", "Comentario de la revisión (opcional)")}
                      className={inputCls}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <FileDrop
            file={file}
            onFile={setFile}
            label={isDelivered ? t("admin-coach.field.video-replace", "Sustituir el vídeo analizado (opcional: si no eliges otro, se queda el que hay)") : t("admin-coach.field.video", "Vídeo analizado y comentado")}
          />

          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">
                {t("admin-coach.priorities", "Prioridades del mes (entre {min} y {max})", { min: MIN_PRIORITIES, max: MAX_PRIORITIES })}
              </p>
              <p className="mt-1 text-xs text-white/50">{t("admin-coach.priorities-help", "Lo que el alumno tiene que trabajar este mes. Cada una es una ficha que verá junto a su vídeo y en la que irá anotando sus partidos.")}</p>
            </div>
            {priorities.map((p, i) => (
              <PriorityEditor
                key={p.key}
                index={i}
                draft={p}
                blocks={blocks}
                concepts={concepts}
                canRemove={priorities.length > MIN_PRIORITIES}
                onChange={(changes) => setPriorities((prev) => prev.map((x) => (x.key === p.key ? { ...x, ...changes } : x)))}
                onRemove={() => removePriority(p)}
              />
            ))}
            {priorities.length < MAX_PRIORITIES && (
              <button onClick={() => setPriorities((prev) => [...prev, emptyPriority()])} className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan">
                <Plus className="h-4 w-4" /> {t("admin-coach.add-priority", "Añadir prioridad")}
              </button>
            )}
          </div>

          <Field
            label={t("admin-coach.strengths-label", "Lo que ya hace bien (opcional)")}
            hint={t("admin-coach.lines-hint-braces", "Una por línea. Para enlazar un momento del vídeo, escribe el minuto entre llaves: {12:03}. El alumno podrá pulsarlo.")}
          >
            <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} maxLength={2000} rows={3} placeholder={t("admin-coach.strengths-example-braces", "Repites la bola al mismo jugador cuando está incómodo {12:03}")} className={inputCls} />
          </Field>
          <Field label={t("admin-coach.observations-label", "Otras observaciones (opcional)")} hint={t("admin-coach.observations-hint-braces", "Cosas que has visto y que no son prioridad este mes. Una por línea; el minuto, entre llaves: {0:40}.")}>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} maxLength={2000} rows={3} placeholder={t("admin-coach.observations-example-braces", "Segundo saque demasiado corto {0:40}")} className={inputCls} />
          </Field>

          {error && <p className="text-xs text-red-300">{error}</p>}
          {progress && (
            <div>
              <p className="mb-1 text-xs text-white/50">{progress.label}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={!canSave || busy}
              className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isDelivered
                ? busy
                  ? t("club.personal-analysis.saving", "Guardando…")
                  : t("club.personal-analysis.save", "Guardar cambios")
                : busy
                  ? t("admin-coach.delivering", "Entregando…")
                  : t("admin-coach.confirm-deliver", "Confirmar entrega")}
            </button>
            {isDelivered && (
              <button onClick={() => setFormOpen(false)} disabled={busy} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 disabled:opacity-60">
                {t("club.personal-analysis.cancel", "Cancelar")}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

const AdminCoach = () => {
  const { t } = useI18n()
  const [items, setItems] = useState<AdminPersonalAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const demo = coachDemoMode() !== null
  const refresh = async () => {
    if (demo) {
      setItems(COACH_ADMIN_DEMO)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await adminListPersonalAnalysis()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.load", "No se pudo cargar la cola."))
    } finally {
      setLoading(false)
    }
  }
  // Catálogo para etiquetar las prioridades con su bloque y sus conceptos.
  const [blocks, setBlocks] = useState<BlockOption[]>([])
  const [concepts, setConcepts] = useState<ConceptOption[]>([])
  useEffect(() => {
    refresh()
    getBlocks().then(setBlocks).catch(() => {})
    getConcepts().then(setConcepts).catch(() => {})
  }, [])

  const pending = items.filter((i) => i.status !== "Delivered")
  const delivered = items.filter((i) => i.status === "Delivered")

  const markInReview = async (item: AdminPersonalAnalysisItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "InReview" } : i))) // optimista
    if (demo) return
    try {
      await adminMarkInReview(item.id)
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))) // revierte
      setError(err instanceof Error ? err.message : t("admin-coach.error.update", "No se pudo actualizar."))
    }
  }

  // Tras entregar o corregir se recarga la cola; en el ejemplo, el cambio se queda en pantalla.
  const markSaved = (item: AdminPersonalAnalysisItem, sheet?: Partial<PersonalAnalysisItem>) => {
    if (!demo) return void refresh()
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...sheet, status: "Delivered", deliveredAtUtc: i.deliveredAtUtc ?? new Date().toISOString(), previous: null } : i)),
    )
    setHistoryOpen(true)
  }

  const remove = async (item: AdminPersonalAnalysisItem) => {
    if (!window.confirm(t("admin-coach.confirm-delete", "¿Eliminar esta solicitud?"))) return
    try {
      if (!demo) await adminDeletePersonalAnalysis(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.delete", "No se pudo eliminar."))
    }
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-coach.title", "Análisis personalizado")}</h1>
          <p className="text-sm text-white/60">{t("admin-coach.subtitle", "Partidos que suben los usuarios de Coach, para analizar y entregar.")}</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-white/40">{t("admin-coach.no-pending", "No hay partidos pendientes.")}</p>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <RequestCard key={item.id} item={item} blocks={blocks} concepts={concepts} onMarkInReview={markInReview} demo={demo} onSaved={markSaved} onRemove={remove} />
          ))}
        </div>
      )}

      {!loading && delivered.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
          >
            <History className="h-4 w-4" />
            {t("admin-coach.history", "Entregados")} ({delivered.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="mt-4 space-y-4">
              {delivered.map((item) => (
                <RequestCard key={item.id} item={item} blocks={blocks} concepts={concepts} onMarkInReview={markInReview} demo={demo} onSaved={markSaved} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default AdminCoach
