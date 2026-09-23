import { useEffect, useState } from "react"
import { MessageCircleQuestion, History, ChevronDown, Check, Undo2, Trash2 } from "lucide-react"
import { adminListQuestions, setQuestionAnswered, deleteQuestion, type AdminSessionQuestion } from "../../../lib/api/sessionQuestions"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminPreguntas — gestión de las preguntas para la sesión (§Club hub, Fase 3, solo Admin).
 * Mismo esqueleto que AdminFeedback.tsx: pendientes siempre visibles, respondidas en un
 * historial colapsado. Guille elige cuáles usar al grabar, no responde 1:1.
 */

const fmt = (iso: string, lang: string): string => {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const QuestionCard = ({
  item,
  onToggle,
  onRemove,
}: {
  item: AdminSessionQuestion
  onToggle: (item: AdminSessionQuestion) => void
  onRemove: (item: AdminSessionQuestion) => void
}) => {
  const { t, lang } = useI18n()
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-white/50">{item.userEmail ?? item.userName ?? `#${item.userId}`}</span>
        <span className="text-xs text-white/40">{fmt(item.createdAtUtc, lang)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-white/90">{item.message}</p>
      <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-3">
        <button
          onClick={() => onToggle(item)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
            item.answered
              ? "border-white/10 text-white/50 hover:text-white"
              : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
          }`}
        >
          {item.answered ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {item.answered ? t("admin-preguntas.mark-pending", "Marcar como pendiente") : t("admin-preguntas.mark-answered", "Marcar como respondida")}
        </button>
        <button
          onClick={() => onRemove(item)}
          className="ml-auto flex items-center gap-1.5 text-xs text-white/50 transition hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("common.delete", "Eliminar")}
        </button>
      </div>
    </article>
  )
}

const AdminPreguntas = () => {
  const { t } = useI18n()
  const [items, setItems] = useState<AdminSessionQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await adminListQuestions()
      setItems(res.items)
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

  const toggle = async (item: AdminSessionQuestion) => {
    const next = !item.answered
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, answered: next } : i))) // optimista
    try {
      await setQuestionAnswered(item.id, next)
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, answered: item.answered } : i))) // revierte
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.update", "No se pudo actualizar."))
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

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <MessageCircleQuestion className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-preguntas.title", "Preguntas")}</h1>
          <p className="text-sm text-white/60">{t("admin-preguntas.subtitle", "Lo que los usuarios de Club/Coach preguntan para la próxima sesión.")}</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">
        {t("admin-preguntas.pending", "Sin responder")} {!loading && `(${pending.length})`}
      </h2>
      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-white/40">{t("admin-preguntas.no-pending", "No hay preguntas pendientes.")}</p>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <QuestionCard key={item.id} item={item} onToggle={toggle} onRemove={remove} />
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
            {t("admin-preguntas.history", "Respondidas")} ({answered.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="mt-4 space-y-4">
              {answered.map((item) => (
                <QuestionCard key={item.id} item={item} onToggle={toggle} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default AdminPreguntas
