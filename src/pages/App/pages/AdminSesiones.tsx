import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, ChevronLeft, ChevronRight, Clapperboard, Crown, ListChecks, MessageCircleQuestion, Plus, Trash2, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  createDirectUpload,
  uploadToCloudflare,
  uploadCaptions,
  readVideoDuration,
  createPublishToken,
  waitForVideoReady,
  createSession,
  type PublishChapterInput,
} from "../../../lib/api/admin"
import { adminListSessions, deleteSession } from "../../../lib/api/sessions"
import { adminListMonthlyPicks, createMonthlyPick, deleteMonthlyPick, type AdminMonthlyPick } from "../../../lib/api/club"
import { adminListQuestions } from "../../../lib/api/sessionQuestions"
import type { SessionSummary } from "../../../lib/api/types"
import { useAuth, isAdmin } from "../../../lib/auth/store"
import SidePanel from "../../../lib/ui/SidePanel"
import FileDrop from "../components/FileDrop"
import PlanEditor from "../components/PlanEditor"
import { emptySituation, isSituationComplete, isSituationEmpty, MIN_SITUATIONS, MAX_SITUATIONS, type SituationDraft } from "../components/planDraft"
import AdminPreguntas from "./AdminPreguntas"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminSesiones — gestión del Club en una sola pantalla (de cara al usuario, "masterclasses").
 * Es una portada del mes con tres tarjetas, y cada una abre su propio panel lateral:
 *  - Masterclass: vídeo, título y capítulos (§Club hub, Fase 2).
 *  - El plan del mes: situaciones + clips (PlanEditor, panel ancho).
 *  - Preguntas: lo que mandan los usuarios (AdminPreguntas, incrustada).
 * "Publicar" está en la portada y lo publica todo junto (una vez al mes). Debajo, los meses ya
 * publicados, para borrarlos.
 *
 * Si el mes elegido ya tiene masterclass publicada, la tarjeta lo indica y solo queda publicar
 * su plan — sirve tanto para añadir el plan más tarde como para reintentarlo si falló al
 * guardarse justo después de subir el vídeo (el plan se conserva en pantalla).
 *
 * La subida sigue el mismo ciclo de Cloudflare que "Paso 1: Análisis" de Publicar.tsx, recortado:
 * sin torneo y sin paso 2 de clips — un único vídeo, con Mes en vez de fecha automática.
 *
 * Permisos: la pantalla la abre Admin o ContentCreator (subir la masterclass), pero el plan del
 * mes y las preguntas son solo de Admin en el backend — a un ContentCreator no se le muestran.
 */

type Panel = "masterclass" | "plan" | "questions"

type ChapterDraft = { time: string; title: string; titleEn: string }
const emptyChapter = (): ChapterDraft => ({ time: "", title: "", titleEn: "" })

/** "mm:ss" o "hh:mm:ss" → segundos. null si el formato no es válido. Igual que Publicar.tsx. */
const parseTimeToSeconds = (text: string): number | null => {
  const parts = text.trim().split(":").map((p) => p.trim())
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null
  return parts.map(Number).reduce((acc, n) => acc * 60 + n, 0)
}

const currentMonth = () => new Date().toISOString().slice(0, 7) // "yyyy-MM"

/** "2026-10" → "octubre de 2026" / "October 2026". Si no es un mes válido, se devuelve tal cual. */
const monthLabel = (month: string, lang: string): string => {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return month
  return new Date(y, m - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" })
}

/** "2026-12" + 1 → "2027-01". */
const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** Primera letra en mayúscula, para usar el mes como título ("Octubre de 2026"). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const fmt = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"

const labelCls = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-white/50"

type Tone = "todo" | "ready" | "done"
const TONE: Record<Tone, string> = {
  todo: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  ready: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  done: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
}

/** Tarjeta de la portada: un bloque del mes, con su estado y el botón que abre su panel. */
const StatusCard = ({
  icon: Icon,
  title,
  tone,
  badge,
  headline,
  detail,
  action,
  onAction,
}: {
  icon: LucideIcon
  title: string
  tone: Tone
  badge: string
  headline: string
  detail?: string
  action?: string
  onAction?: () => void
}) => (
  <section className={`flex flex-col rounded-2xl border bg-white/[0.02] p-5 transition ${tone === "ready" ? "border-neon-cyan/30" : "border-white/10"}`}>
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </span>
      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE[tone]}`}>{badge}</span>
    </div>
    <p className="mt-5 line-clamp-2 font-display text-xl font-bold leading-snug text-white">{headline}</p>
    <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-white/55">{detail}</p>
    {action && (
      <button
        onClick={onAction}
        className="mt-4 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 py-2.5 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/15"
      >
        {action}
      </button>
    )}
  </section>
)

const AdminSesiones = () => {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const admin = isAdmin(user)
  // `?tab=questions`: enlace antiguo de /app/admin/preguntas — abre directamente ese panel.
  const [params, setParams] = useSearchParams()
  const [panel, setPanel] = useState<Panel | null>(() => (params.get("tab") === "questions" && admin ? "questions" : null))

  const [file, setFile] = useState<File | null>(null)
  const [fileEn, setFileEn] = useState<File | null>(null)
  const [captionsEn, setCaptionsEn] = useState<File | null>(null)
  const [month, setMonth] = useState(currentMonth())
  const [title, setTitle] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [chapters, setChapters] = useState<ChapterDraft[]>([])

  // El plan del mes (solo Admin). Si todas las situaciones están vacías, se publica solo la masterclass.
  const [planNote, setPlanNote] = useState("")
  const [planNoteEn, setPlanNoteEn] = useState("")
  const [situations, setSituations] = useState<SituationDraft[]>(() => [emptySituation(), emptySituation()])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)

  const [items, setItems] = useState<SessionSummary[]>([])
  const [plans, setPlans] = useState<AdminMonthlyPick[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await adminListSessions())
      if (admin) setPlans(await adminListMonthlyPicks())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.load", "No se pudo cargar el histórico."))
    } finally {
      setLoading(false)
    }
  }
  const refreshQuestions = () => {
    if (admin) adminListQuestions().then((res) => setPendingQuestions(res.counts.pending)).catch(() => {})
  }
  useEffect(() => {
    refresh()
    refreshQuestions()
  }, [])

  const closePanel = () => {
    if (panel === "questions") {
      refreshQuestions() // puede haber marcado preguntas como respondidas dentro del panel
      if (params.get("tab")) setParams({}, { replace: true })
    }
    setPanel(null)
  }

  const updateChapter = (i: number, patch: Partial<ChapterDraft>) =>
    setChapters((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addChapter = () => setChapters((cs) => [...cs, emptyChapter()])
  const removeChapter = (i: number) => setChapters((cs) => cs.filter((_, idx) => idx !== i))

  const reset = () => {
    setFile(null)
    setFileEn(null)
    setCaptionsEn(null)
    setTitle("")
    setTitleEn("")
    setDescription("")
    setDescriptionEn("")
    setChapters([])
  }

  const resetPlan = () => {
    setPlanNote("")
    setPlanNoteEn("")
    setSituations([emptySituation(), emptySituation()])
  }

  const selectedMonth = month.trim()
  const publishedSession = items.find((s) => s.month === selectedMonth)
  const publishedPlan = plans.find((p) => p.month === selectedMonth)
  const hasPlan = admin && !situations.every(isSituationEmpty)
  const completeSituations = situations.filter(isSituationComplete).length
  const planComplete = hasPlan && completeSituations === situations.length && situations.length >= MIN_SITUATIONS && situations.length <= MAX_SITUATIONS
  const namedChapters = chapters.filter((c) => c.title.trim()).length

  /** Mensaje de error si el plan está a medias; null si está completo (o no hay plan). */
  const planProblem = (): string | null =>
    hasPlan && !planComplete
      ? t(
          "admin-sesiones.error.plan-incomplete",
          "El plan del mes está a medias: cada situación necesita título, etiqueta corta, \"qué reconocer\" y al menos un clip.",
        )
      : null

  const savePlan = (sessionId: number, planMonth: string) =>
    createMonthlyPick({
      month: planMonth,
      note: planNote.trim() || undefined,
      noteEn: planNoteEn.trim() || undefined,
      sessionId,
      situations: situations.map((s) => ({
        title: s.title.trim(),
        titleEn: s.titleEn.trim() || undefined,
        shortTitle: s.shortTitle.trim(),
        shortTitleEn: s.shortTitleEn.trim() || undefined,
        recognize: s.recognize.trim(),
        recognizeEn: s.recognizeEn.trim() || undefined,
        clipIds: s.clips.map((c) => c.id),
      })),
    })

  /** El mes ya tiene masterclass: solo se publica su plan (añadirlo más tarde, o reintento). */
  const publishPlanOnly = async (session: SessionSummary) => {
    setError(null)
    setNotice(null)
    if (!hasPlan) return setError(t("admin-sesiones.error.no-plan", "Monta el plan del mes antes de publicarlo."))
    const problem = planProblem()
    if (problem) return setError(problem)
    setBusy(true)
    try {
      await savePlan(session.id, session.month)
      setNotice(t("admin-sesiones.plan-published", "Plan del mes publicado."))
      resetPlan()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.plan", "No se pudo publicar el plan del mes."))
    } finally {
      setBusy(false)
    }
  }

  const publishSession = async () => {
    setError(null)
    setNotice(null)
    if (!selectedMonth) return setError(t("admin-sesiones.error.no-month", "Indica el mes (yyyy-MM)."))
    if (!file) return setError(t("admin-sesiones.error.no-video", "Sube el vídeo de la masterclass."))
    if (!title.trim()) return setError(t("admin-sesiones.error.no-title", "La masterclass necesita un título."))

    const chapterInputs: PublishChapterInput[] = []
    for (const ch of chapters) {
      if (!ch.title.trim()) continue
      const startSeconds = parseTimeToSeconds(ch.time)
      if (startSeconds === null)
        return setError(t("admin-sesiones.error.bad-time", "Formato de tiempo inválido en el capítulo \"{title}\" (usa mm:ss).", { title: ch.title.trim() }))
      chapterInputs.push({ startSeconds, title: ch.title.trim(), titleEn: ch.titleEn.trim() || undefined })
    }
    // El plan se valida ANTES de subir nada: si está a medias, mejor avisar ya que después de
    // varios minutos de subida.
    const problem = planProblem()
    if (problem) return setError(problem)

    setBusy(true)
    setProgress({ label: t("admin-sesiones.progress.video", "Subiendo masterclass…"), percent: 0 })
    try {
      const publishToken = await createPublishToken()

      // Se suben los dos vídeos (ES y EN) seguidos, sin esperar a que Cloudflare procese el
      // primero antes de lanzar el segundo — ver Publicar.tsx para la explicación completa.
      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(title || file.name, file.size, publishToken, dur)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("admin-sesiones.progress.video", "Subiendo masterclass…"), percent: p }))

      let uidEn: string | undefined
      if (fileEn) {
        const labelEn = t("admin-sesiones.progress.video-en", "Subiendo doblaje en inglés…")
        setProgress({ label: labelEn, percent: 0 })
        const durEn = await readVideoDuration(fileEn)
        const upEn = await createDirectUpload(`${title || file.name} (EN)`, fileEn.size, publishToken, durEn)
        await uploadToCloudflare(upEn.uploadURL, fileEn, (p) => setProgress({ label: labelEn, percent: p }))
        uidEn = upEn.uid
      }

      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await Promise.all([waitForVideoReady(up.uid), ...(uidEn ? [waitForVideoReady(uidEn)] : [])])

      if (captionsEn) {
        setProgress({ label: t("publicar.progress.captions", "Subiendo subtítulos…"), percent: 100 })
        const targets = [uploadCaptions(up.uid, captionsEn, publishToken)]
        if (uidEn) targets.push(uploadCaptions(uidEn, captionsEn, publishToken))
        await Promise.all(targets)
      }

      setProgress({ label: t("publicar.progress.creating", "Creando contenido…"), percent: 100 })
      const created = await createSession(
        {
          uid: up.uid,
          uidEn,
          month: selectedMonth,
          title,
          titleEn: titleEn.trim() || undefined,
          description,
          descriptionEn: descriptionEn.trim() || undefined,
          durationSeconds: dur,
          chapters: chapterInputs,
        },
        publishToken,
      )

      reset()
      if (hasPlan) {
        try {
          await savePlan(created.sessionId, selectedMonth)
          resetPlan()
          setNotice(t("admin-sesiones.published-with-plan", "Masterclass y plan del mes publicados."))
        } catch (err) {
          // La masterclass ya está publicada: el plan se conserva en pantalla y, al refrescar, el
          // mes aparece con masterclass publicada — el botón pasa a publicar solo el plan.
          const reason = err instanceof Error ? err.message : ""
          setError(
            t("admin-sesiones.error.plan-after-session", "La masterclass se ha publicado, pero el plan del mes no se pudo guardar. Revísalo y vuelve a publicarlo.") +
              (reason ? ` (${reason})` : ""),
          )
        }
      } else {
        setNotice(t("admin-sesiones.published", "Masterclass publicada."))
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.publish", "No se pudo publicar la masterclass."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const removePlan = async (pick: AdminMonthlyPick) => {
    if (!window.confirm(t("admin-recomendado.confirm-delete", "¿Borrar el plan de {month}?", { month: monthLabel(pick.month, lang) }))) return
    try {
      await deleteMonthlyPick(pick.id)
      setPlans((prev) => prev.filter((x) => x.id !== pick.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-recomendado.error.delete", "No se pudo borrar."))
    }
  }

  const remove = async (s: SessionSummary) => {
    if (!window.confirm(t("admin-sesiones.confirm-delete", "¿Borrar la masterclass \"{title}\"?", { title: s.title }))) return
    try {
      await deleteSession(s.id)
      setItems((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.delete", "No se pudo borrar."))
    }
  }

  const label = monthLabel(selectedMonth, lang)
  // Meses ya publicados (masterclass y/o plan), del más reciente al más antiguo.
  const months = [...new Set([...items.map((s) => s.month), ...plans.map((p) => p.month)])].sort().reverse()
  const currentPlanId = plans[0]?.id // GET /api/club/monthly-pick sirve el último publicado

  const publishLabel = busy
    ? t("admin-sesiones.publishing", "Publicando...")
    : publishedSession
      ? t("admin-sesiones.publish-plan", "Publicar el plan de {month}", { month: label })
      : hasPlan
        ? t("admin-sesiones.publish-both", "Publicar masterclass y plan de {month}", { month: label })
        : t("admin-sesiones.publish", "Publicar la masterclass de {month}", { month: label })
  // Con masterclass ya publicada, el botón solo tiene sentido si hay un plan montado.
  const showPublish = !publishedSession || hasPlan

  const doneBtn = (
    <button onClick={closePanel} className="w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110">
      {t("admin-sesiones.panel-done", "Listo")}
    </button>
  )

  return (
    <main className="w-full py-8">
      {/* Cabecera: de qué mes es la portada */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
            <Crown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neon-cyan">{t("admin-sesiones.eyebrow", "Gestión del Club")}</p>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{capitalize(label)}</h1>
          </div>
        </div>
        {/* Mes anterior / siguiente: flechas propias en vez de <input type="month">, que pinta el
            mes en el idioma del navegador (no en el de la app) y no existe en Safari/Firefox de
            escritorio. El mes elegido ya se lee en el título, en el idioma de la app. */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button onClick={() => setMonth(shiftMonth(selectedMonth, -1))} disabled={busy} aria-label={t("onboarding.prev", "Atrás")} className="rounded-lg p-2 text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[2.5rem] px-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
            {t("admin-sesiones.field.month-short", "Mes")}
          </span>
          <button onClick={() => setMonth(shiftMonth(selectedMonth, 1))} disabled={busy} aria-label={t("onboarding.next", "Siguiente")} className="rounded-lg p-2 text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Las tres tarjetas del mes */}
      <div className={`grid gap-4 ${admin ? "lg:grid-cols-3" : "max-w-md"}`}>
        {publishedSession ? (
          <StatusCard
            icon={Clapperboard}
            title={t("admin-sesiones.card.masterclass", "Masterclass")}
            tone="done"
            badge={t("admin-sesiones.badge.published", "Publicada")}
            headline={publishedSession.title}
            detail={t("admin-sesiones.card.published-on", "Publicada el {date}", { date: fmt(publishedSession.publishedAtUtc, lang) })}
          />
        ) : (
          <StatusCard
            icon={Clapperboard}
            title={t("admin-sesiones.card.masterclass", "Masterclass")}
            tone={file && title.trim() ? "ready" : "todo"}
            badge={file && title.trim() ? t("admin-sesiones.badge.ready", "Lista") : t("admin-sesiones.badge.todo", "Pendiente")}
            headline={title.trim() || t("admin-sesiones.card.no-video", "Sin subir")}
            detail={
              file
                ? `${file.name} · ${t("admin-sesiones.chapters-count", "{count} capítulos", { count: namedChapters })}`
                : t("admin-sesiones.card.masterclass-help", "El vídeo de este mes, su título y sus capítulos.")
            }
            action={file || title.trim() ? t("admin-sesiones.action.edit", "Editar") : t("admin-sesiones.action.upload", "Subir masterclass")}
            onAction={() => setPanel("masterclass")}
          />
        )}

        {admin && (
          <StatusCard
            icon={ListChecks}
            title={t("admin-sesiones.card.plan", "El plan del mes")}
            tone={planComplete ? "ready" : hasPlan ? "todo" : publishedPlan ? "done" : "todo"}
            badge={
              planComplete
                ? t("admin-sesiones.badge.ready-plan", "Listo")
                : hasPlan
                  ? t("admin-sesiones.badge.draft", "A medias")
                  : publishedPlan
                    ? t("admin-sesiones.badge.published-plan", "Publicado")
                    : t("admin-sesiones.badge.todo", "Pendiente")
            }
            headline={
              hasPlan
                ? t("admin-sesiones.card.situations", "{done} de {total} situaciones", { done: completeSituations, total: situations.length })
                : publishedPlan
                  ? t("admin-sesiones.card.situations-published", "{count} situaciones", { count: publishedPlan.situations?.length ?? 0 })
                  : t("admin-sesiones.card.no-plan", "Sin montar")
            }
            detail={
              hasPlan
                ? situations.map((s) => s.shortTitle.trim() || s.title.trim()).filter(Boolean).join(" · ") ||
                  t("admin-sesiones.card.plan-draft", "Completa cada situación con sus clips.")
                : publishedPlan
                  ? (publishedPlan.situations ?? []).map((s) => s.shortTitle).join(" · ")
                  : t("admin-sesiones.card.plan-help", "Entre {min} y {max} situaciones con sus clips. Se ve en Club y en Inicio.", { min: MIN_SITUATIONS, max: MAX_SITUATIONS })
            }
            action={
              hasPlan
                ? t("admin-sesiones.action.continue", "Seguir montando")
                : publishedPlan
                  ? t("admin-sesiones.action.new-plan", "Montar uno nuevo")
                  : t("admin-sesiones.action.build", "Montar el plan")
            }
            onAction={() => setPanel("plan")}
          />
        )}

        {admin && (
          <StatusCard
            icon={MessageCircleQuestion}
            title={t("admin-preguntas.title", "Preguntas")}
            tone={pendingQuestions ? "todo" : "done"}
            badge={pendingQuestions ? t("admin-sesiones.badge.pending-questions", "Sin responder") : t("admin-sesiones.badge.up-to-date", "Al día")}
            headline={
              pendingQuestions == null
                ? "—"
                : pendingQuestions === 1
                  ? t("admin-sesiones.card.questions-one", "1 pendiente")
                  : t("admin-sesiones.card.questions", "{count} pendientes", { count: pendingQuestions })
            }
            detail={t("admin-sesiones.card.questions-help", "Lo que los miembros preguntan para las próximas masterclasses.")}
            action={t("admin-sesiones.action.view", "Ver preguntas")}
            onAction={() => setPanel("questions")}
          />
        )}
      </div>

      {/* Publicar: todo junto, desde la portada */}
      <div className="mt-6 space-y-3">
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}
        {progress && (
          <div>
            <p className="mb-1 text-xs text-white/50">{progress.label}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}
        {showPublish && (
          <button
            onClick={() => (publishedSession ? publishPlanOnly(publishedSession) : publishSession())}
            disabled={busy}
            className="w-full rounded-xl bg-neon-cyan py-3.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {publishLabel}
          </button>
        )}
      </div>

      {/* Meses ya publicados */}
      <div className="mt-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white/70">{t("admin-sesiones.published-heading", "Meses publicados")}</h2>
        {loading ? (
          <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
        ) : months.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">{t("admin-sesiones.none", "Todavía no has publicado ninguna masterclass.")}</p>
        ) : (
          <ul className="space-y-3">
            {months.map((m) => (
              <li key={m} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex sm:gap-6">
                <p className="mb-3 shrink-0 font-display text-base font-bold text-white sm:mb-0 sm:w-44">{capitalize(monthLabel(m, lang))}</p>
                <div className="min-w-0 flex-1 space-y-2">
                  {items.filter((s) => s.month === m).map((s) => (
                    <div key={`s-${s.id}`} className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm text-white/85">
                        <Clapperboard className="mr-2 inline h-3.5 w-3.5 text-neon-cyan" />
                        {s.title}
                        <span className="ml-2 text-xs text-white/40">{fmt(s.publishedAtUtc, lang)}</span>
                      </p>
                      <button onClick={() => remove(s)} aria-label={t("admin-sesiones.delete-aria", "Borrar masterclass \"{title}\"", { title: s.title })} className="shrink-0 rounded-lg p-1.5 text-white/40 transition hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {plans.filter((p) => p.month === m).map((p) => (
                    <div key={`p-${p.id}`} className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm text-white/65">
                        <ListChecks className="mr-2 inline h-3.5 w-3.5 text-neon-cyan" />
                        {(p.situations?.length ?? 0) > 0
                          ? p.situations!.map((sit) => `${sit.shortTitle} (${sit.clips.length})`).join(" · ")
                          : p.items.map((item) => item.title).join(" · ")}
                        {p.id === currentPlanId && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-0.5 text-[11px] font-medium text-neon-lime">
                            <Check className="h-3 w-3" /> {t("admin-sesiones.plan-current", "Visible ahora")}
                          </span>
                        )}
                      </p>
                      <button onClick={() => removePlan(p)} aria-label={t("admin-recomendado.delete-aria", "Borrar plan de {month}", { month: monthLabel(p.month, lang) })} className="shrink-0 rounded-lg p-1.5 text-white/40 transition hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Panel: masterclass */}
      {panel === "masterclass" && (
        <SidePanel
          title={t("admin-sesiones.panel.masterclass", "Masterclass de {month}", { month: label })}
          subtitle={t("admin-sesiones.panel.masterclass-help", "Se publica desde la portada, junto con el plan del mes.")}
          onClose={closePanel}
          footer={doneBtn}
        >
          <div className="space-y-5">
            <FileDrop file={file} onFile={setFile} label={t("admin-sesiones.field.video", "Vídeo de la masterclass")} />

            <div>
              <label className={labelCls}>{t("admin-sesiones.field.title", "Título de la masterclass")}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t("publicar.field.description", "Descripción")}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
            </div>

            {/* Capítulos: misma lógica que Publicar.tsx (minuto escrito a mano). */}
            <div>
              <label className={labelCls}>{t("publicar.chapters", "Capítulos (opcional)")}</label>
              <div className="space-y-2">
                {chapters.map((ch, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                    <div className="flex items-center gap-2">
                      <input value={ch.time} onChange={(e) => updateChapter(i, { time: e.target.value })} placeholder="mm:ss" className={`${inputCls} w-24 shrink-0 text-center tabular-nums`} />
                      <input value={ch.title} onChange={(e) => updateChapter(i, { title: e.target.value })} placeholder={t("publicar.field.chapter-title", "Título del capítulo")} className={`${inputCls} flex-1`} />
                      <button onClick={() => removeChapter(i)} className="shrink-0 p-1.5 text-white/40 transition hover:text-red-400" aria-label={t("publicar.remove-chapter", "Quitar capítulo")}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input value={ch.titleEn} onChange={(e) => updateChapter(i, { titleEn: e.target.value })} placeholder={t("publicar.field.chapter-title-en", "Título en inglés (opcional)")} className={`${inputCls} mt-2`} />
                  </div>
                ))}
                <button onClick={addChapter} className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
                  <Plus className="h-4 w-4" /> {t("publicar.add-chapter", "Añadir capítulo")}
                </button>
              </div>
            </div>

            <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-white/70">{t("admin-sesiones.english", "Versión en inglés (opcional)")}</summary>
              <div className="mt-4 space-y-3">
                <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder={t("publicar.field.analysis-title-en", "Título en inglés (opcional)")} className={inputCls} />
                <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder={t("publicar.field.description-en", "Descripción en inglés (opcional)")} rows={3} className={inputCls} />
                <FileDrop file={fileEn} onFile={setFileEn} label={t("publicar.field.en-video", "Vídeo en inglés (HeyGen)")} hint={t("common.optional", "Opcional")} />
                <FileDrop
                  file={captionsEn}
                  onFile={setCaptionsEn}
                  label={t("publicar.field.en-captions", "Subtítulos en inglés (.srt o .vtt)")}
                  accept=".srt,.vtt,text/vtt,application/x-subrip"
                  hint={t("publicar.captions-hint", "Se aplican al vídeo en español y, si lo subes, también al doblado en inglés")}
                />
              </div>
            </details>
          </div>
        </SidePanel>
      )}

      {/* Panel ancho: el plan del mes */}
      {panel === "plan" && admin && (
        <SidePanel
          wide
          title={t("admin-sesiones.panel.plan", "El plan de {month}", { month: label })}
          subtitle={t("admin-sesiones.panel.plan-help", "Elige una situación y pulsa los clips del catálogo para añadirlos. Se publica desde la portada.")}
          onClose={closePanel}
          footer={
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-white/60">
                {t("admin-sesiones.card.situations", "{done} de {total} situaciones", { done: completeSituations, total: situations.length })}{" "}
                {t("admin-sesiones.complete-suffix", "completas")}
              </p>
              <button onClick={closePanel} className="rounded-lg bg-neon-cyan px-8 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110">
                {t("admin-sesiones.panel-done", "Listo")}
              </button>
            </div>
          }
        >
          <PlanEditor note={planNote} noteEn={planNoteEn} onNote={setPlanNote} onNoteEn={setPlanNoteEn} situations={situations} onChange={setSituations} />
        </SidePanel>
      )}

      {/* Panel: preguntas */}
      {panel === "questions" && admin && (
        <SidePanel
          title={t("admin-preguntas.title", "Preguntas")}
          subtitle={t("admin-preguntas.subtitle", "Lo que los usuarios de Club/Coach preguntan para las próximas masterclasses.")}
          onClose={closePanel}
        >
          <AdminPreguntas embedded />
        </SidePanel>
      )}
    </main>
  )
}

export default AdminSesiones
