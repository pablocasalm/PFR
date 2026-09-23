import { useEffect, useState } from "react"
import { Sparkles, Trash2, Search as SearchIcon, X } from "lucide-react"
import { adminListMonthlyPicks, createMonthlyPick, deleteMonthlyPick, type AdminMonthlyPick } from "../../../lib/api/club"
import { getSearch } from "../../../lib/api/search"
import { getConcepts, type ConceptOption } from "../../../lib/api/admin"
import type { ContentItem } from "../../../lib/api/types"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminRecomendado — cura y publica "Recomendado del mes" (§Club hub, Fase 1): busca entre el
 * contenido ya publicado (clips/análisis) y el catálogo de conceptos, sin subir nada nuevo.
 */

const currentMonth = () => new Date().toISOString().slice(0, 7) // "yyyy-MM"

const fmt = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

const AdminRecomendado = () => {
  const { t, lang } = useI18n()

  const [month, setMonth] = useState(currentMonth())
  const [note, setNote] = useState("")
  const [noteEn, setNoteEn] = useState("")
  const [selectedItems, setSelectedItems] = useState<ContentItem[]>([])
  const [selectedConceptIds, setSelectedConceptIds] = useState<number[]>([])

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ContentItem[]>([])
  const [searching, setSearching] = useState(false)
  const [concepts, setConcepts] = useState<ConceptOption[]>([])

  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [items, setItems] = useState<AdminMonthlyPick[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await adminListMonthlyPicks())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-recomendado.error.load", "No se pudo cargar el histórico."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    getConcepts().then(setConcepts).catch(() => {})
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const handle = setTimeout(() => {
      getSearch({ q })
        .then((res) => setResults(res.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  const addItem = (item: ContentItem) => {
    if (selectedItems.some((x) => x.id === item.id && x.type === item.type)) return
    setSelectedItems((prev) => [...prev, item])
  }
  const removeItem = (item: ContentItem) =>
    setSelectedItems((prev) => prev.filter((x) => !(x.id === item.id && x.type === item.type)))

  const toggleConcept = (id: number) =>
    setSelectedConceptIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const publish = async () => {
    if (!month.trim() || selectedItems.length === 0 || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      await createMonthlyPick({
        month: month.trim(),
        note: note.trim() || undefined,
        noteEn: noteEn.trim() || undefined,
        items: selectedItems.map((i) => ({ contentType: i.type, contentId: i.id })),
        conceptIds: selectedConceptIds,
      })
      setNotice(t("admin-recomendado.published", "Recomendado publicado."))
      setNote("")
      setNoteEn("")
      setSelectedItems([])
      setSelectedConceptIds([])
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-recomendado.error.publish", "No se pudo publicar."))
    } finally {
      setSending(false)
    }
  }

  const remove = async (pick: AdminMonthlyPick) => {
    if (!window.confirm(t("admin-recomendado.confirm-delete", "¿Borrar el recomendado de {month}?", { month: pick.month }))) return
    try {
      await deleteMonthlyPick(pick.id)
      setItems((prev) => prev.filter((x) => x.id !== pick.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-recomendado.error.delete", "No se pudo borrar."))
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-recomendado.title", "Recomendado del mes")}</h1>
          <p className="text-sm text-white/60">{t("admin-recomendado.subtitle", "Selecciona clips, análisis y conceptos ya publicados para el hub Club.")}</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-recomendado.field.month", "Mes (yyyy-MM)")}</label>
          <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2026-10" className={inputCls} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-recomendado.field.note", "Nota (español)")}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("admin-recomendado.note-placeholder", "Este mes nos fijamos en...")} className={inputCls} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-recomendado.field.note-en", "Nota (inglés, opcional)")}</label>
          <textarea value={noteEn} onChange={(e) => setNoteEn(e.target.value)} rows={2} className={inputCls} />
        </div>

        {/* Buscador de contenido existente */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-recomendado.field.search", "Añadir clips/análisis")}</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin-recomendado.search-placeholder", "Buscar por título, jugador, concepto...")}
              className={`${inputCls} pl-11`}
            />
          </div>
          {query.trim() && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
              {searching ? (
                <p className="p-3 text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-white/40">{t("admin-recomendado.no-results", "Sin resultados.")}</p>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => addItem(r)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 text-xs uppercase text-white/40">{r.type}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Seleccionados */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <span key={`${item.type}-${item.id}`} className="flex items-center gap-1.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 py-1 pl-3 pr-1.5 text-xs font-medium text-neon-cyan">
                {item.title}
                <button onClick={() => removeItem(item)} aria-label={t("admin-recomendado.remove-aria", "Quitar")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Conceptos */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-recomendado.field.concepts", "Conceptos destacados")}</label>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleConcept(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selectedConceptIds.includes(c.id)
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                    : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                #{c.nameEs}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}

        <button
          onClick={publish}
          disabled={!month.trim() || selectedItems.length === 0 || sending}
          className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? t("admin-recomendado.publishing", "Publicando...") : t("admin-recomendado.publish", "Publicar")}
        </button>
      </div>

      {/* Histórico */}
      <div className="mt-10 max-w-2xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">
          {t("admin-recomendado.published-heading", "Publicados")} {!loading && `(${items.length})`}
        </h2>

        {loading ? (
          <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-recomendado.none", "Todavía no has publicado ningún recomendado.")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{p.month}</p>
                    <p className="mt-1 text-sm text-white/60">{p.items.map((i) => i.title).join(" · ")}</p>
                    <p className="mt-1.5 text-xs text-white/40">{fmt(p.publishedAtUtc, lang)}</p>
                  </div>
                  <button
                    onClick={() => remove(p)}
                    aria-label={t("admin-recomendado.delete-aria", "Borrar recomendado de {month}", { month: p.month })}
                    className="flex shrink-0 items-center rounded-lg p-1.5 text-white/40 transition hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export default AdminRecomendado
