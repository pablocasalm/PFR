import { useEffect, useState } from "react"
import { MessageCircleQuestion, History, ChevronDown, Mail, Trash2, X, GripVertical } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
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
 * Guille elige cuáles usar al grabar, no responde 1:1.
 *
 * Una pregunta tratada se asocia al capítulo de la masterclass donde se trata (tarjeta #74):
 * dos columnas, los capítulos de una masterclass a la izquierda y las preguntas sin tratar a la
 * derecha. Se arrastra cada pregunta a su capítulo (varias pueden ir al mismo); arrastrarla a
 * otro capítulo la cambia, y devolverla a "Sin tratar" o la ✕ la desasocia. En el móvil también
 * vale tocar la pregunta y luego el capítulo (arrastrar en un panel con scroll es incómodo).
 * La masterclass del mes aún sin publicar sale primero: sus preguntas se guardan al publicar.
 *
 * Después, "Avisar" manda a cada persona un email con el enlace a ese minuto (tarjetas #75 y
 * #93). Es un botón aparte, no sale al asociar: un email enviado no se puede retirar.
 */

/** Masterclass del mes sin publicar (AdminSesiones): sus capítulos aún no existen en la base de
 * datos, así que las preguntas se asocian en pantalla y se guardan al publicar. */
export type DraftMasterclass = {
  label: string
  chapters: { key: string; title: string; startSeconds: number | null }[]
  assignments: Record<number, string> // id de la pregunta → key del capítulo
  onAssign: (questionId: number, chapterKey: string | null) => void
}

/** Capítulo como destino: del borrador (key) o ya publicado (id). */
type ChapterRef = { kind: "draft"; key: string } | { kind: "pub"; id: number }
const refId = (r: ChapterRef) => (r.kind === "draft" ? `draft:${r.key}` : `pub:${r.id}`)
const parseRef = (id: string): ChapterRef | null =>
  id.startsWith("draft:") ? { kind: "draft", key: id.slice(6) } : id.startsWith("pub:") ? { kind: "pub", id: Number(id.slice(4)) } : null
const PENDING_ZONE = "pending"

const fmt = (iso: string, lang: string): string => {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** 750 → "12:30". */
const fmtMinute = (seconds: number | null) => (seconds == null ? "--:--" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`)

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

/** Pregunta que se puede arrastrar. `compact`: dentro de un capítulo (con ✕ para desasociar). */
const QuestionChip = ({
  item,
  selected,
  compact,
  onSelect,
  onUnassign,
  onRemove,
}: {
  item: AdminSessionQuestion
  selected: boolean
  compact?: boolean
  onSelect: () => void
  onUnassign?: () => void
  onRemove?: () => void
}) => {
  const { t, lang } = useI18n()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `q:${item.id}` })
  return (
    <div
      ref={setNodeRef}
      className={`group flex items-start gap-2 rounded-lg border p-2.5 transition ${
        selected ? "border-neon-cyan bg-neon-cyan/10" : compact ? "border-white/10 bg-white/[0.04]" : "border-white/10 bg-white/[0.03]"
      } ${isDragging ? "opacity-30" : ""}`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="mt-0.5 shrink-0 cursor-grab touch-none text-white/30 hover:text-white/70 active:cursor-grabbing"
        aria-label={t("admin-preguntas.drag", "Arrastrar")}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className={`whitespace-pre-wrap text-white/90 ${compact ? "text-xs" : "text-sm"}`}>{item.message}</p>
        {!compact && (
          <p className="mt-1 text-[11px] text-white/40">
            {item.userEmail ?? item.userName ?? `#${item.userId}`} · {fmt(item.createdAtUtc, lang)}
          </p>
        )}
        {compact && item.notifiedAtUtc && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
            <Mail className="h-3 w-3" />
            {t("admin-preguntas.notified-on", "Avisado por email el {date}", { date: fmt(item.notifiedAtUtc, lang) })}
          </p>
        )}
      </button>
      {onUnassign && (
        <button type="button" onClick={onUnassign} className="shrink-0 p-0.5 text-white/40 hover:text-white" aria-label={t("admin-preguntas.unassign", "Quitar de este capítulo")}>
          <X className="h-4 w-4" />
        </button>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="shrink-0 p-0.5 text-white/30 hover:text-red-400" aria-label={t("common.delete", "Eliminar")}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/** Capítulo: zona donde soltar preguntas (o tocarlo con una pregunta elegida). */
const ChapterDrop = ({
  dropId,
  minute,
  title,
  armed,
  onTap,
  children,
}: {
  dropId: string
  minute: string
  title: string
  armed: boolean
  onTap: () => void
  children: React.ReactNode
}) => {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: dropId })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition ${isOver ? "border-neon-cyan bg-neon-cyan/10" : armed ? "border-neon-cyan/50 bg-neon-cyan/[0.04]" : "border-white/10 bg-white/[0.02]"}`}
    >
      <button type="button" onClick={onTap} disabled={!armed} className="flex w-full items-baseline gap-2 text-left disabled:cursor-default">
        <span className="shrink-0 font-mono text-xs font-bold text-neon-cyan">{minute}</span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-white">{title}</span>
        {armed && <span className="shrink-0 text-[11px] font-semibold text-neon-cyan">{t("admin-preguntas.tap-here", "Asociar aquí")}</span>}
      </button>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  )
}

/** Columna de preguntas sin tratar: también es la zona para desasociar (soltar aquí). */
const PendingDrop = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: PENDING_ZONE })
  return (
    <div ref={setNodeRef} className={`min-h-[120px] space-y-2 rounded-xl border border-dashed p-2 transition ${isOver ? "border-amber-400/60 bg-amber-400/5" : "border-white/10"}`}>
      {children}
    </div>
  )
}

/** `embedded`: dentro de la pantalla de gestión del Club (AdminSesiones), sin `<main>` ni cabecera propios.
 * `draft`: capítulos de la masterclass del mes aún sin publicar (ver DraftMasterclass). */
const AdminPreguntas = ({ embedded = false, draft }: { embedded?: boolean; draft?: DraftMasterclass }) => {
  const { t, lang } = useI18n()
  const [items, setItems] = useState<AdminSessionQuestion[]>([])
  const [sessions, setSessions] = useState<AdminQuestionSession[]>([])
  const [notifying, setNotifying] = useState<number | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Masterclass cuyos capítulos se ven: "draft" o el id de una publicada.
  const [selected, setSelected] = useState<string | null>(null)
  // Pregunta elegida con un toque (móvil): el siguiente capítulo tocado la recibe.
  const [picked, setPicked] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

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

  const hasDraft = !!draft && draft.chapters.length > 0
  const current = selected ?? (hasDraft ? "draft" : sessions[0] ? String(sessions[0].id) : null)
  const currentSession = current && current !== "draft" ? sessions.find((s) => String(s.id) === current) : undefined

  // Capítulos de la masterclass elegida, con sus preguntas.
  const chapters: { ref: ChapterRef; minute: string; title: string; questions: AdminSessionQuestion[] }[] =
    current === "draft" && draft
      ? draft.chapters.map((c) => ({
          ref: { kind: "draft", key: c.key },
          minute: fmtMinute(c.startSeconds),
          title: c.title,
          questions: items.filter((i) => draft.assignments[i.id] === c.key),
        }))
      : (currentSession?.chapters ?? []).map((c) => ({
          ref: { kind: "pub", id: c.id },
          minute: fmtMinute(c.startSeconds),
          title: c.title,
          questions: items.filter((i) => i.chapterId === c.id),
        }))

  const pending = items.filter((i) => !i.answered && !draft?.assignments[i.id])
  // Tratadas en otras masterclasses (o marcadas como respondidas antes de los capítulos).
  const elsewhere = items.filter((i) => i.answered && !(currentSession && i.sessionId === currentSession.id))
  const chapterName = (chapterId: number | null) => {
    for (const s of sessions) {
      const c = s.chapters.find((x) => x.id === chapterId)
      if (c) return `${sessionLabel(s, lang)} · ${fmtMinute(c.startSeconds)} ${c.title}`
    }
    return t("admin-preguntas.legacy-answered-short", "Respondida antes de los capítulos")
  }

  const sessionOfChapter = (chapterId: number | null) => (chapterId == null ? null : sessions.find((s) => s.chapters.some((c) => c.id === chapterId))?.id ?? null)

  /** Guarda en la base de datos el capítulo publicado de una pregunta (null = pendiente). */
  const saveChapter = async (item: AdminSessionQuestion, chapterId: number | null) => {
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

  /** Lleva una pregunta a un capítulo (del borrador o publicado) o, con null, a "Sin tratar". */
  const moveTo = (questionId: number, target: ChapterRef | null) => {
    const item = items.find((i) => i.id === questionId)
    if (!item) return
    if (target?.kind === "draft") {
      if (item.chapterId != null) saveChapter(item, null)
      draft?.onAssign(item.id, target.key)
    } else {
      if (draft?.assignments[item.id]) draft.onAssign(item.id, null)
      const chapterId = target?.kind === "pub" ? target.id : null
      if (chapterId !== item.chapterId) saveChapter(item, chapterId)
    }
    setPicked(null)
  }

  const onDragStart = (e: DragStartEvent) => setDragging(Number(String(e.active.id).slice(2)))
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null)
    if (!e.over) return
    const questionId = Number(String(e.active.id).slice(2))
    const over = String(e.over.id)
    moveTo(questionId, over === PENDING_ZONE ? null : parseRef(over))
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
      if (draft?.assignments[item.id]) draft.onAssign(item.id, null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-preguntas.error.delete", "No se pudo eliminar la pregunta."))
    }
  }

  const draggedItem = dragging != null ? items.find((i) => i.id === dragging) : undefined
  const togglePick = (id: number) => setPicked((p) => (p === id ? null : id))

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
              <span className="min-w-0 text-sm text-white">{sessionLabel(session, lang)}</span>
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

      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <p className="mb-4 text-xs leading-relaxed text-white/50">
            {t(
              "admin-preguntas.dnd-help",
              "Arrastra cada pregunta al capítulo donde se trata (o tócala y después toca el capítulo). Para cambiarla, llévala a otro capítulo; para quitarla, pulsa la ✕ o devuélvela a «Sin tratar».",
            )}
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Capítulos de la masterclass elegida */}
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">{t("admin-preguntas.chapters", "Capítulos")}</h2>
                {(hasDraft || sessions.length > 0) && (
                  <select
                    value={current ?? ""}
                    onChange={(e) => setSelected(e.target.value)}
                    className="ml-auto min-w-0 max-w-full rounded-md border border-white/10 bg-midnight px-2 py-1.5 text-base text-white focus:border-neon-cyan/40 focus:outline-none sm:text-xs"
                  >
                    {hasDraft && <option value="draft">{t("admin-preguntas.draft-group", "{label} (sin publicar)", { label: draft!.label })}</option>}
                    {sessions.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {sessionLabel(s, lang)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {chapters.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
                  {t("admin-preguntas.no-chapters", "Esta masterclass no tiene capítulos. Añádelos en el panel de la masterclass (con título) para asociarles preguntas.")}
                </p>
              ) : (
                <div className="space-y-3">
                  {chapters.map((c) => (
                    <ChapterDrop
                      key={refId(c.ref)}
                      dropId={refId(c.ref)}
                      minute={c.minute}
                      title={c.title}
                      armed={picked != null}
                      onTap={() => picked != null && moveTo(picked, c.ref)}
                    >
                      {c.questions.length === 0 ? (
                        <p className="text-xs text-white/30">{t("admin-preguntas.drop-here", "Suelta aquí las preguntas que trata")}</p>
                      ) : (
                        c.questions.map((q) => (
                          <QuestionChip key={q.id} item={q} compact selected={picked === q.id} onSelect={() => togglePick(q.id)} onUnassign={() => moveTo(q.id, null)} />
                        ))
                      )}
                    </ChapterDrop>
                  ))}
                </div>
              )}
              {current === "draft" && (
                <p className="mt-2 text-xs text-neon-cyan/80">{t("admin-preguntas.draft-linked-all", "Estas asociaciones se guardan al publicar la masterclass.")}</p>
              )}
            </section>

            {/* Preguntas sin tratar */}
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">
                {t("admin-preguntas.pending-covered", "Sin tratar")} ({pending.length})
              </h2>
              <PendingDrop>
                {pending.length === 0 ? (
                  <p className="p-2 text-sm text-white/40">{t("admin-preguntas.no-pending", "No hay preguntas pendientes.")}</p>
                ) : (
                  pending.map((q) => (
                    <QuestionChip key={q.id} item={q} selected={picked === q.id} onSelect={() => togglePick(q.id)} onRemove={() => remove(q)} />
                  ))
                )}
              </PendingDrop>
            </section>
          </div>

          <DragOverlay>{draggedItem ? <div className="rounded-lg border border-neon-cyan bg-midnight p-2.5 text-sm text-white shadow-2xl">{draggedItem.message}</div> : null}</DragOverlay>
        </DndContext>
      )}

      {/* Tratadas en otras masterclasses: se pueden quitar de su capítulo. */}
      {!loading && elsewhere.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
          >
            <History className="h-4 w-4" />
            {t("admin-preguntas.history-elsewhere", "Tratadas en otras masterclasses")} ({elsewhere.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <ul className="mt-4 space-y-2">
              {elsewhere.map((q) => (
                <li key={q.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm text-white/80">{q.message}</p>
                    <p className="mt-1 text-[11px] text-white/40">{chapterName(q.chapterId)}</p>
                  </div>
                  <button type="button" onClick={() => saveChapter(q, null)} className="shrink-0 p-0.5 text-white/40 hover:text-white" aria-label={t("admin-preguntas.unassign", "Quitar de este capítulo")}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Wrapper>
  )
}

export default AdminPreguntas
