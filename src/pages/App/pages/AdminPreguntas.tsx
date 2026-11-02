import { useEffect, useState } from "react"
import { MessageCircleQuestion, History, ChevronDown, Mail, Trash2 } from "lucide-react"
import {
  adminListQuestions,
  setQuestionChapter,
  deleteQuestion,
  notifyQuestions,
  type AdminSessionQuestion,
  type AdminQuestionSession,
} from "../../../lib/api/sessionQuestions"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminPreguntas — gestión de las preguntas para la sesión (§Club hub, Fase 3, solo Admin).
 * Mismo esqueleto que AdminFeedback.tsx: pendientes siempre visibles, respondidas en un
 * historial colapsado. Guille elige cuáles usar al grabar, no responde 1:1.
 *
 * Una pregunta tratada se asocia al capítulo de la masterclass donde se trata (tarjeta #74):
 * varias pueden ir al mismo capítulo. Después, "Avisar" manda a cada persona un email con el
 * enlace a ese minuto (tarjetas #75 y #93). El aviso es un botón aparte, no sale al asociar:
 * un email enviado no se puede retirar.
 */

/** Masterclass del mes sin publicar (AdminSesiones): sus capítulos aún no existen en la base de
 * datos, así que las preguntas se asocian en pantalla y se guardan al publicar. */
export type DraftMasterclass = {
  label: string
  chapters: { key: string; title: string; startSeconds: number | null }[]
  assignments: Record<number, string> // id de la pregunta → key del capítulo
  onAssign: (questionId: number, chapterKey: string | null) => void
}

/** 750 → "12:30". */
const fmtMinute = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

/** "2026-10" → "Octubre 2026" / "October 2026". */
const fmtMonth = (month: string, lang: string) => {
  const [y, m] = month.split("-").map(Number)
  if (!y || !m) return month
  const label = new Date(y, m - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Nombre de la masterclass. Suelen titularse con el mes ("Octubre 2026"): el mes solo se añade
 * si el título no lo lleva ya. */
const sessionLabel = (s: AdminQuestionSession, lang: string) => {
  const month = fmtMonth(s.month, lang)
  const monthWord = month.split(" ")[0].toLowerCase()
  return s.title.toLowerCase().includes(monthWord) ? s.title : `${month} · ${s.title}`
}

const fmt = (iso: string, lang: string): string => {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const QuestionCard = ({
  item,
  sessions,
  draft,
  onAssign,
  onRemove,
}: {
  item: AdminSessionQuestion
  sessions: AdminQuestionSession[]
  draft?: DraftMasterclass
  onAssign: (item: AdminSessionQuestion, chapterId: number | null) => void
  onRemove: (item: AdminSessionQuestion) => void
}) => {
  const { t, lang } = useI18n()
  const draftKey = draft?.assignments[item.id]
  const value = item.chapterId != null ? String(item.chapterId) : draftKey ? `draft:${draftKey}` : ""
  const change = (next: string) => {
    if (next.startsWith("draft:")) {
      if (item.chapterId != null) onAssign(item, null)
      draft?.onAssign(item.id, next.slice("draft:".length))
    } else {
      if (draftKey) draft?.onAssign(item.id, null)
      if (next || item.chapterId != null) onAssign(item, next ? Number(next) : null)
    }
  }
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-white/50">{item.userEmail ?? item.userName ?? `#${item.userId}`}</span>
        <span className="text-xs text-white/40">{fmt(item.createdAtUtc, lang)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-white/90">{item.message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
        <label className="flex min-w-0 basis-full items-center gap-2 text-xs text-white/50 sm:basis-auto sm:flex-1">
          <span className="shrink-0">{t("admin-preguntas.covered-in", "Se trató en")}</span>
          <select
            value={value}
            onChange={(e) => change(e.target.value)}
            className={`min-w-0 flex-1 rounded-md border bg-midnight px-2 py-1.5 text-base text-white focus:border-neon-cyan/40 focus:outline-none sm:text-xs ${
              value ? "border-emerald-400/40" : "border-white/10"
            }`}
          >
            <option value="">{t("admin-preguntas.not-covered", "Pendiente")}</option>
            {draft && draft.chapters.length > 0 && (
              <optgroup label={t("admin-preguntas.draft-group", "{label} (sin publicar)", { label: draft.label })}>
                {draft.chapters.map((c) => (
                  <option key={c.key} value={`draft:${c.key}`}>
                    {c.startSeconds != null ? fmtMinute(c.startSeconds) : "--:--"} · {c.title}
                  </option>
                ))}
              </optgroup>
            )}
            {sessions.map((s) => (
              <optgroup key={s.id} label={sessionLabel(s, lang)}>
                {s.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {fmtMinute(c.startSeconds)} · {c.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          onClick={() => onRemove(item)}
          className="ml-auto flex items-center gap-1.5 text-xs text-white/50 transition hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("common.delete", "Eliminar")}
        </button>
      </div>
      {draftKey && (
        <p className="mt-2 text-xs text-neon-cyan/80">{t("admin-preguntas.draft-linked", "Se enlazará al publicar la masterclass.")}</p>
      )}
      {item.answered && !item.chapterId && (
        <p className="mt-2 text-xs text-white/40">{t("admin-preguntas.legacy-answered", "Marcada como respondida antes de los capítulos. Elige el capítulo para enlazarla.")}</p>
      )}
      {item.notifiedAtUtc && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
          <Mail className="h-3.5 w-3.5" />
          {t("admin-preguntas.notified-on", "Avisado por email el {date}", { date: fmt(item.notifiedAtUtc, lang) })}
        </p>
      )}
    </article>
  )
}

/** `embedded`: dentro de la pantalla de gestión del Club (AdminSesiones), sin `<main>` ni cabecera propios. */
/** `draft`: capítulos de la masterclass del mes aún sin publicar (ver DraftMasterclass). */
const AdminPreguntas = ({ embedded = false, draft }: { embedded?: boolean; draft?: DraftMasterclass }) => {
  const { t, lang } = useI18n()
  const [items, setItems] = useState<AdminSessionQuestion[]>([])
  const [sessions, setSessions] = useState<AdminQuestionSession[]>([])
  const [notifying, setNotifying] = useState<number | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await adminListQuestions()
      setItems(res.items)
      setSessions(res.sessions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.load", "No se pudieron cargar las preguntas."))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  const pending = items.filter((i) => !i.answered)
  const answered = items.filter((i) => i.answered)

  const sessionOfChapter = (chapterId: number | null) => (chapterId == null ? null : sessions.find((s) => s.chapters.some((c) => c.id === chapterId))?.id ?? null)

  const assign = async (item: AdminSessionQuestion, chapterId: number | null) => {
    setError(null)
    setInfo(null)
    const next: AdminSessionQuestion = {
      ...item,
      chapterId,
      sessionId: sessionOfChapter(chapterId),
      answered: chapterId != null,
      // Cambiar de capítulo permite volver a avisar con el sitio correcto (igual que el backend).
      notifiedAtUtc: chapterId != null && chapterId === item.chapterId ? item.notifiedAtUtc : null,
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? next : i))) // optimista
    try {
      await setQuestionChapter(item.id, chapterId)
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i))) // revierte
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.update", "No se pudo actualizar."))
    }
  }

  // Masterclasses con preguntas asociadas y sin avisar: cuántas personas recibirían el email.
  const toNotify = sessions
    .map((s) => {
      const qs = items.filter((i) => i.sessionId === s.id && i.chapterId != null && !i.notifiedAtUtc)
      return { session: s, questions: qs.length, people: new Set(qs.map((q) => q.userId)).size }
    })
    .filter((x) => x.questions > 0)

  const notify = async (session: AdminQuestionSession, people: number) => {
    const label = sessionLabel(session, lang)
    const ok = window.confirm(
      people === 1
        ? t("admin-preguntas.confirm-notify-one", "¿Avisar por email a 1 persona de que su pregunta se trató en «{session}»? Un email enviado no se puede retirar.", { session: label })
        : t("admin-preguntas.confirm-notify", "¿Avisar por email a {count} personas de que su pregunta se trató en «{session}»? Un email enviado no se puede retirar.", { count: people, session: label }),
    )
    if (!ok) return
    setNotifying(session.id)
    setError(null)
    setInfo(null)
    try {
      const res = await notifyQuestions(session.id)
      setInfo(
        res.people === 1
          ? t("admin-preguntas.notified-one", "Email enviado a 1 persona.")
          : t("admin-preguntas.notified", "Email enviado a {count} personas.", { count: res.people }),
      )
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.notify", "No se pudo enviar el aviso."))
    } finally {
      setNotifying(null)
    }
  }

  const remove = async (item: AdminSessionQuestion) => {
    if (!window.confirm(t("admin-preguntas.confirm-delete", "¿Eliminar esta pregunta?"))) return
    try {
      await deleteQuestion(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.delete", "No se pudo eliminar la pregunta."))
    }
  }

  const Wrapper = embedded ? "div" : "main"
  return (
    <Wrapper className={embedded ? "w-full" : "w-full py-8"}>
      <div className={embedded ? "hidden" : "mb-6 flex items-center gap-3"}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <MessageCircleQuestion className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-preguntas.title", "Preguntas")}</h1>
          <p className="text-sm text-white/60">{t("admin-preguntas.subtitle", "Lo que los usuarios de Club/Coach preguntan para las próximas masterclasses.")}</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {info && <p className="mb-4 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>}

      {/* Aviso por email, por masterclass: solo las preguntas asociadas y sin avisar. */}
      {!loading && toNotify.length > 0 && (
        <div className="mb-6 space-y-2 rounded-xl border border-neon-cyan/25 bg-neon-cyan/[0.05] p-4">
          <p className="text-xs leading-relaxed text-white/60">
            {t("admin-preguntas.notify-help", "Cuando hayas terminado de asociar las preguntas de una masterclass, avisa por email a quien las hizo. Cada persona recibe un solo email con sus preguntas y el enlace a cada minuto.")}
          </p>
          {toNotify.map(({ session, people }) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 text-sm text-white">
                {sessionLabel(session, lang)}
              </span>
              <button
                onClick={() => notify(session, people)}
                disabled={notifying != null}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-neon-cyan px-3 py-1.5 text-xs font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-3.5 w-3.5" />
                {notifying === session.id
                  ? t("admin-preguntas.notifying", "Enviando…")
                  : people === 1
                    ? t("admin-preguntas.notify-one", "Avisar a 1 persona")
                    : t("admin-preguntas.notify", "Avisar a {count} personas", { count: people })}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">
        {t("admin-preguntas.pending-covered", "Sin tratar")} {!loading && `(${pending.length})`}
      </h2>
      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-white/40">{t("admin-preguntas.no-pending", "No hay preguntas pendientes.")}</p>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <QuestionCard key={item.id} item={item} sessions={sessions} draft={draft} onAssign={assign} onRemove={remove} />
          ))}
        </div>
      )}

      {!loading && answered.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
          >
            <History className="h-4 w-4" />
            {t("admin-preguntas.history-covered", "Tratadas")} ({answered.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="mt-4 space-y-4">
              {answered.map((item) => (
                <QuestionCard key={item.id} item={item} sessions={sessions} draft={draft} onAssign={assign} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
    </Wrapper>
  )
}

export default AdminPreguntas
