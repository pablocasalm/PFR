import { useEffect, useMemo, useState } from "react"
import { Inbox, Bug, Lightbulb, MessageCircle, Trash2, Save, History, ChevronDown } from "lucide-react"
import {
  listFeedback,
  updateFeedback,
  deleteFeedback,
  type FeedbackItem,
  type FeedbackStatus,
  type FeedbackType,
} from "../../../lib/api/feedback"

/**
 * AdminFeedback — gestión de reportes de la beta (solo Admin). Lista todos los reportes de los
 * usuarios (fallos / ideas / otros) con su contexto, y permite moverlos por el ciclo de vida
 * (Nuevo → En progreso → Resuelto), dejar una nota interna y borrarlos.
 */

const fmt = (iso: string | null): string => {
  if (!iso) return "—"
  // El backend envía UTC; si no trae marca de zona ('Z'), la forzamos para convertir a hora local.
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const TYPE_META: Record<FeedbackType, { label: string; icon: typeof Bug; cls: string }> = {
  bug: { label: "Fallo", icon: Bug, cls: "border-red-400/40 bg-red-400/10 text-red-300" },
  idea: { label: "Idea", icon: Lightbulb, cls: "border-lime-400/40 bg-lime-400/10 text-lime-300" },
  other: { label: "Otro", icon: MessageCircle, cls: "border-white/20 bg-white/5 text-white/70" },
}

const STATUS_META: Record<FeedbackStatus, { label: string; cls: string }> = {
  new: { label: "Nuevo", cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  in_progress: { label: "En progreso", cls: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  resolved: { label: "Resuelto", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
}

const STATUS_ORDER: FeedbackStatus[] = ["new", "in_progress", "resolved"]

type TypeFilter = "all" | FeedbackType
// "resolved" no es una pestaña de Estado: los resueltos viven aparte, en el Historial.
type StatusFilter = "all" | "new" | "in_progress"

const AdminFeedback = () => {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [historyOpen, setHistoryOpen] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await listFeedback()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los reportes.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Contadores globales (sobre todos los items, no los filtrados) para los badges de las pestañas.
  const counts = useMemo(
    () => ({
      new: items.filter((i) => i.status === "new").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      resolved: items.filter((i) => i.status === "resolved").length,
    }),
    [items],
  )

  // Activos (nuevo/en progreso): lo que se ve por defecto. Los resueltos van aparte, al Historial.
  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.status !== "resolved" &&
          (statusFilter === "all" || i.status === statusFilter) &&
          (typeFilter === "all" || i.type === typeFilter),
      ),
    [items, statusFilter, typeFilter],
  )

  const resolvedItems = useMemo(
    () => items.filter((i) => i.status === "resolved" && (typeFilter === "all" || i.type === typeFilter)),
    [items, typeFilter],
  )

  const patchLocal = (id: number, patch: Partial<FeedbackItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const changeStatus = async (item: FeedbackItem, status: FeedbackStatus) => {
    if (item.status === status) return
    const prev = item.status
    patchLocal(item.id, { status }) // optimista
    try {
      const res = await updateFeedback(item.id, { status })
      patchLocal(item.id, { status: res.status, resolvedAtUtc: res.resolvedAtUtc })
    } catch (err) {
      patchLocal(item.id, { status: prev }) // revierte
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.")
    }
  }

  const saveNote = async (item: FeedbackItem, note: string) => {
    try {
      const res = await updateFeedback(item.id, { adminNote: note })
      patchLocal(item.id, { adminNote: res.adminNote })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la nota.")
    }
  }

  const remove = async (item: FeedbackItem) => {
    if (!window.confirm("¿Eliminar este reporte?")) return
    try {
      await deleteFeedback(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el reporte.")
    }
  }

  const tabCls = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/70 hover:text-white"
    }`

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Inbox className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Reportes</h1>
          <p className="text-sm text-white/60">Fallos e ideas que envían los usuarios de la beta.</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {/* Filtros por estado (los resueltos no viven aquí, ver Historial más abajo) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-bold uppercase tracking-wide text-white/70">Estado</h2>
        <button onClick={() => setStatusFilter("all")} className={tabCls(statusFilter === "all")}>Todos ({counts.new + counts.in_progress})</button>
        <button onClick={() => setStatusFilter("new")} className={tabCls(statusFilter === "new")}>Nuevos ({counts.new})</button>
        <button onClick={() => setStatusFilter("in_progress")} className={tabCls(statusFilter === "in_progress")}>En progreso ({counts.in_progress})</button>
      </div>

      {/* Filtros por tipo */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-sm font-bold uppercase tracking-wide text-white/70">Tipo</h2>
        <button onClick={() => setTypeFilter("all")} className={tabCls(typeFilter === "all")}>Todos</button>
        <button onClick={() => setTypeFilter("bug")} className={tabCls(typeFilter === "bug")}>Fallos</button>
        <button onClick={() => setTypeFilter("idea")} className={tabCls(typeFilter === "idea")}>Ideas</button>
        <button onClick={() => setTypeFilter("other")} className={tabCls(typeFilter === "other")}>Otros</button>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-white/40">No hay reportes activos.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <ReportCard
              key={item.id}
              item={item}
              onChangeStatus={changeStatus}
              onSaveNote={saveNote}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {/* Historial: reportes ya resueltos, plegado por defecto para no mezclarlos con los activos. */}
      {!loading && resolvedItems.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
          >
            <History className="h-4 w-4" />
            Historial ({resolvedItems.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>

          {historyOpen && (
            <div className="mt-4 space-y-4">
              {resolvedItems.map((item) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  onChangeStatus={changeStatus}
                  onSaveNote={saveNote}
                  onRemove={remove}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

/** Tarjeta de un reporte: contexto + cambio de estado + nota interna + borrar. */
const ReportCard = ({
  item,
  onChangeStatus,
  onSaveNote,
  onRemove,
}: {
  item: FeedbackItem
  onChangeStatus: (item: FeedbackItem, status: FeedbackStatus) => void
  onSaveNote: (item: FeedbackItem, note: string) => void
  onRemove: (item: FeedbackItem) => void
}) => {
  const [note, setNote] = useState(item.adminNote ?? "")
  const typeMeta = TYPE_META[item.type]
  const TypeIcon = typeMeta.icon
  const noteChanged = note.trim() !== (item.adminNote ?? "")

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      {/* Cabecera: tipo + estado + fecha */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.cls}`}>
          <TypeIcon className="h-3.5 w-3.5" />
          {typeMeta.label}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[item.status].cls}`}>
          {STATUS_META[item.status].label}
        </span>
        <span className="ml-auto text-xs text-white/40">{fmt(item.createdAtUtc)}</span>
      </div>

      {/* Mensaje */}
      <p className="whitespace-pre-wrap text-sm text-white/90">{item.message}</p>

      {/* Contexto */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
        <span>De: <span className="text-white/70">{item.userEmail ?? item.userName ?? `#${item.userId}`}</span></span>
        {item.page && <span>Página: <span className="font-mono text-white/70">{item.page}</span></span>}
        {item.contentId && <span>{item.contentType}: <span className="font-mono text-white/70">{item.contentId}</span></span>}
        {item.status === "resolved" && item.resolvedAtUtc && <span>Resuelto: {fmt(item.resolvedAtUtc)}</span>}
      </div>
      {item.userAgent && (
        <p className="mt-1 truncate text-[11px] text-white/30" title={item.userAgent}>{item.userAgent}</p>
      )}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
        {/* Cambiar estado */}
        <div className="flex items-center gap-1.5">
          {STATUS_ORDER.map((s) => {
            const active = item.status === s
            return (
              <button
                key={s}
                onClick={() => onChangeStatus(item, s)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                  active ? STATUS_META[s].cls : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {STATUS_META[s].label}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onRemove(item)}
          className="ml-auto flex items-center gap-1.5 text-xs text-white/50 transition hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>

      {/* Nota interna */}
      <div className="mt-3 flex items-start gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Nota interna (opcional)..."
          className="min-h-[38px] flex-1 resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none"
        />
        <button
          onClick={() => onSaveNote(item, note.trim())}
          disabled={!noteChanged}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          Guardar
        </button>
      </div>
    </article>
  )
}

export default AdminFeedback
