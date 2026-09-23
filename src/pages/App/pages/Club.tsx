import { useState } from "react"
import { Crown, Play, Send, UploadCloud, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getMonthlyPick } from "../../../lib/api/club"
import { getSessionsArchive } from "../../../lib/api/sessions"
import { getMyQuestions, sendQuestion, type MySessionQuestion } from "../../../lib/api/sessionQuestions"
import {
  getMyPersonalAnalysis,
  createDirectUpload,
  waitForVideoReady,
  submitPersonalAnalysis,
  type MyPersonalAnalysis,
} from "../../../lib/api/personalAnalysis"
import { readVideoDuration, uploadToCloudflare } from "../../../lib/api/admin"
import type { SessionSummary } from "../../../lib/api/types"
import { formatDuration, hueFor } from "../../../lib/format"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard, { Thumb } from "../components/ContentCard"
import WatchedBadge from "../components/WatchedBadge"
import FileDrop from "../components/FileDrop"
import HlsPlayer from "../../../lib/player/VideoPlayer"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Club — hub de las funciones de los planes Club/Coach (§Stripe 3 planes). El acceso ya lo
 * filtra RequireFeature en el router; aquí se asume que quien llega tiene el tier necesario.
 *
 * Fase 1: "Recomendado del mes". Fase 2: Sesiones grabadas. Fase 3: Preguntas para la sesión.
 * Fase 5: Mi análisis (Coach).
 */

/** "Mi análisis" — solo Coach. Sube el propio partido, ve el estado, y el análisis entregado. */
const PersonalAnalysisSection = () => {
  const { t, lang } = useI18n()
  const { data } = useApi(getMyPersonalAnalysis, [], "my-personal-analysis")
  const [override, setOverride] = useState<MyPersonalAnalysis | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = override ?? data
  const request = current?.request ?? null
  const canSubmit = current?.canSubmit ?? false

  const submit = async () => {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: 0 })
    try {
      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(file.name, file.size)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: p }))
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(up.uid)
      const created = await submitPersonalAnalysis(up.uid, dur, note.trim() || undefined)
      setOverride({ canSubmit: false, request: created })
      setFile(null)
      setNote("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("club.personal-analysis.error", "No se pudo enviar el partido."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "long" })

  return (
    <section className="rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.03] p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-white">
        <Sparkles className="h-4 w-4 text-neon-cyan" />
        {t("club.personal-analysis.title", "Mi análisis personalizado")}
      </h2>

      {/* Último entregado, si lo hay */}
      {request?.status === "Delivered" && request.deliveredVideoUrl && (
        <div className="mb-5 space-y-3">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <HlsPlayer src={request.deliveredVideoUrl} aspect="16:9" />
          </div>
          {request.deliveredPlanText && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-white/50">{t("club.personal-analysis.plan", "Plan de acción")}</p>
              <p className="whitespace-pre-wrap text-sm text-white/80">{request.deliveredPlanText}</p>
            </div>
          )}
        </div>
      )}

      {/* Formulario de envío, si toca */}
      {canSubmit && (
        <div className="space-y-3">
          <FileDrop file={file} onFile={setFile} label={t("club.personal-analysis.upload-label", "Sube 20 min de uno de tus partidos")} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("club.personal-analysis.note-placeholder", "¿Qué quieres que mire Guille? (opcional)")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          {progress && (
            <div>
              <p className="mb-1 text-xs text-white/50">{progress.label}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}
          <button
            onClick={submit}
            disabled={!file || busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            {busy ? t("club.personal-analysis.sending", "Enviando…") : t("club.personal-analysis.send", "Enviar partido")}
          </button>
        </div>
      )}

      {/* En curso, todavía no entregado */}
      {!canSubmit && request && request.status !== "Delivered" && (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/70">
          {request.status === "InReview"
            ? t("club.personal-analysis.in-review", "Recibido el {date} — Guille lo está revisando.", { date: fmt(request.submittedAtUtc) })
            : t("club.personal-analysis.submitted", "Recibido el {date} — en la cola de Guille.", { date: fmt(request.submittedAtUtc) })}
        </p>
      )}
    </section>
  )
}

/** Tarjeta pequeña de preguntas — no es pantalla propia, vive junto a Sesiones. */
const QuestionsCard = () => {
  const { t } = useI18n()
  const { data, loading } = useApi(getMyQuestions, [], "my-questions")
  const [items, setItems] = useState<MySessionQuestion[] | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const list = items ?? data ?? []

  const submit = async () => {
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError(null)
    try {
      const created = await sendQuestion(message)
      setItems([created, ...list])
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("club.questions.error", "No se pudo enviar la pregunta."))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-white">{t("club.questions.title", "Preguntas para la próxima sesión")}</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={t("club.questions.placeholder", "¿Qué quieres que Guille trate en la próxima sesión?")}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Send className="h-4 w-4" />
          {t("club.questions.send", "Enviar")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {!loading && list.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
          {list.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-white/80">{q.message}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  q.answered ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-amber-400/40 bg-amber-400/10 text-amber-300"
                }`}
              >
                {q.answered ? t("club.questions.answered", "Respondida") : t("club.questions.pending", "Pendiente")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Tarjeta de sesión — como ContentCard pero sin fila de conceptos (una sesión no los tiene). */
const SessionCard = ({ session }: { session: SessionSummary }) => {
  const { lang } = useI18n()
  return (
    <Link to={`/app/watch?s=${session.id}`} className="group block w-full cursor-pointer">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <Thumb src={session.thumbnailUrl} hue={hueFor(String(session.id))} className="aspect-video w-full" />
        {session.completed && <WatchedBadge />}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-4 w-4 text-white" fill="currentColor" />
          </span>
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(session.durationSeconds)}
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium leading-snug text-white">{pickText(session.title, session.titleEn, lang)}</p>
    </Link>
  )
}

const Club = () => {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const { data: monthlyPick, loading } = useApi(getMonthlyPick, [], "monthly-pick")
  const { data: sessions, loading: sessionsLoading } = useApi(getSessionsArchive, [], "club-sessions")

  return (
    <main className="w-full space-y-8 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("club.title", "Club")}</h1>
          <p className="text-sm text-white/60">{t("club.subtitle", "Lo que trae tu plan, en un solo sitio.")}</p>
        </div>
      </div>

      {hasFeature(user, "personalAnalysis") && <PersonalAnalysisSection />}

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">{t("club.sessions.title", "Sesiones")}</h2>
        {sessionsLoading ? (
          <CardGridSkeleton count={4} />
        ) : !sessions || sessions.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
            {t("club.sessions.empty", "Todavía no hay ninguna sesión grabada. Vuelve pronto.")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      <QuestionsCard />

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">
          {t("club.monthly-pick.title", "Recomendado del mes")}
        </h2>

        {loading ? (
          <CardGridSkeleton count={4} />
        ) : !monthlyPick || monthlyPick.items.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
            {t("club.monthly-pick.empty", "Todavía no hay recomendación para este mes. Vuelve pronto.")}
          </p>
        ) : (
          <>
            {monthlyPick.note && (
              <p className="mb-4 text-sm text-white/70">{pickText(monthlyPick.note, monthlyPick.noteEn ?? undefined, lang)}</p>
            )}
            {monthlyPick.concepts.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {monthlyPick.concepts.map((c) => (
                  <span key={c.name} className="rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan">
                    #{pickText(c.name, c.nameEn, lang)}
                  </span>
                ))}
              </div>
            )}
            <CardRow>
              {monthlyPick.items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </CardRow>
          </>
        )}
      </section>
    </main>
  )
}

export default Club
