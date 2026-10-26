import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Trophy, Bookmark, Compass, Settings2, Trash2, X, Check, Play, FolderPlus, FolderInput, FolderMinus, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import type { ContentItem } from "../../../lib/api/types"
import { useSavedItems, toggleSavedItem } from "../../../lib/saved/store"
import { useFolders, itemKey, createFolder, renameFolder, deleteFolder, moveFolder, addToFolder, removeFromFolder } from "../../../lib/saved/folders"
import { useApi } from "../../../lib/hooks/useApi"
import { getRecent } from "../../../lib/api/history"
import { getMyDeliveredAnalyses } from "../../../lib/api/personalAnalysis"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { PastAnalysesList } from "../components/CoachAnalysis"
import SaveButton from "../../../lib/saved/SaveButton"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { useTaxonomy, conceptRank, type Taxonomy } from "../../../lib/taxonomy"
import { ConceptsToWork } from "../components/StarterTest"
import { useStarterTest } from "../../../lib/starterTest"

/**
 * MiLista — biblioteca personal del usuario (§12), con carpetas:
 *  - «Todo»: todo lo guardado. Debajo, «Continuar viendo» y «Vistos recientemente» (historial).
 *  - Carpetas del usuario (privadas; un contenido puede estar en varias). Se crean, renombran,
 *    ordenan y borran aquí; se llenan desde «Guardar en…» (botón de guardar) o desde Gestionar.
 *  - Carpetas del sistema, calculadas: «Análisis de Coach» para quien ya no tiene Coach.
 * Se puede ordenar (recientes, antiguos, por bloque, por concepto, sin ver, duración) y filtrar
 * (clips/análisis, ocultar vistos). Los conceptos llevan su número de la taxonomía ("#3.2 Mantener").
 */

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const hueFor = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return 200 + (h % 60)
}

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const watchHref = (item: ContentItem) =>
  item.type === "analysis" ? `/app/watch?v=${item.id}` : `/app/watch?c=${item.id}`

const Thumb = ({ src, hue, progress }: { src?: string; hue: number; progress?: number }) => (
  <div className="relative aspect-video w-full overflow-hidden" style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    {progress !== undefined && progress > 0 && (
      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <span className="block h-full bg-neon-cyan" style={{ width: `${Math.min(progress, 100)}%` }} />
      </span>
    )}
  </div>
)

const SectionHeading = ({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-center gap-2.5">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-xs font-semibold text-neon-cyan">{count}</span>
    {action && <div className="ml-auto">{action}</div>}
  </div>
)

/** Conceptos del contenido en el orden de la taxonomía, con su número: "#3.2 Mantener". */
const conceptLabels = (item: ContentItem, tax: Taxonomy, lang: string) =>
  item.concepts
    .map((c, i) => ({ es: c, en: item.conceptsEn?.[i] || c }))
    .sort((a, b) => conceptRank(tax, a.es) - conceptRank(tax, b.es))
    .map(({ es, en }) => {
      const code = tax.byConcept.get(es)?.code
      const name = lang === "en" ? en : es
      return code ? `#${code} ${name}` : `#${name}`
    })

const CardMeta = ({ item, tax }: { item: ContentItem; tax: Taxonomy }) => {
  const { lang } = useI18n()
  return (
    <div className="p-3">
      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-white">{pickText(item.title, item.titleEn, lang)}</p>
      {item.type === "analysis" && item.tournament ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
          <Trophy className="h-3.5 w-3.5 text-white/40" /> {item.tournament}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
          {conceptLabels(item, tax, lang)
            .slice(0, 2)
            .map((c) => (
              <span key={c} className="text-[11px] text-neon-cyan/80">
                {c}
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

// Tarjeta de contenido guardado. En modo gestión se convierte en selector (checkbox).
const SavedCard = ({
  item,
  tax,
  managing,
  selected,
  onToggleSelect,
}: {
  item: ContentItem
  tax: Taxonomy
  managing: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}) => {
  const { t } = useI18n()
  const media = (
    <div className="relative">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} />
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(item.durationSeconds)}
      </span>
      {item.completed && !managing && (
        <span className="absolute right-2 top-2 rounded bg-neon-lime px-1.5 py-0.5 text-[10px] font-bold uppercase text-midnight">
          {t("mi-lista.watched-badge", "Visto")}
        </span>
      )}
      {managing ? (
        <span
          className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
            selected ? "border-neon-cyan bg-neon-cyan text-midnight" : "border-white/70 bg-black/40"
          }`}
        >
          {selected && <Check className="h-4 w-4" strokeWidth={3} />}
        </span>
      ) : (
        <span className="absolute left-2 top-2" onClick={(e) => e.preventDefault()}>
          <SaveButton item={item} variant="icon" />
        </span>
      )}
    </div>
  )

  const base = "group block overflow-hidden rounded-xl border bg-white/[0.02] text-left transition"

  if (managing) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect(item.id)}
        aria-pressed={selected}
        className={`${base} w-full ${selected ? "border-neon-cyan/60 ring-1 ring-neon-cyan/40" : "border-white/10 hover:border-white/20"}`}
      >
        {media}
        <CardMeta item={item} tax={tax} />
      </button>
    )
  }

  return (
    <Link to={watchHref(item)} className={`${base} border-white/10 hover:border-white/20`}>
      {media}
      <CardMeta item={item} tax={tax} />
    </Link>
  )
}

// Tarjeta de "Vistos recientemente": barra de progreso + acceso para continuar.
const RecentCard = ({ item, tax }: { item: ContentItem; tax: Taxonomy }) => (
  <Link
    to={watchHref(item)}
    className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20"
  >
    <div className="relative">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} progress={item.progress} />
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(item.durationSeconds)}
      </span>
      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-cyan text-midnight">
          <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
        </span>
      </span>
    </div>
    <CardMeta item={item} tax={tax} />
  </Link>
)

// ---------------------------------------------------------------------------
// Estado vacío (§12.5)
// ---------------------------------------------------------------------------

const EmptyState = () => {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neon-cyan">
        <Bookmark className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-white">{t("mi-lista.empty.title", "Todavía no has guardado ningún contenido")}</h2>
      <p className="mt-2 max-w-sm text-sm text-white/60">
        {t("mi-lista.empty.subtitle", "Guarda clips o análisis para acceder rápidamente desde aquí.")}
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/app/explorar"
          className="flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
        >
          <Compass className="h-4 w-4" />
          {t("mi-lista.empty.go-explore", "Ir a Explorar")}
        </Link>
        <Link
          to="/app/inicio"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          {t("mi-lista.empty.go-home", "Ir a Inicio")}
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Orden y filtros (se recuerdan en este navegador)
// ---------------------------------------------------------------------------

type SortKey = "recent" | "oldest" | "block" | "concept" | "unseen" | "duration"
type TypeFilter = "all" | "clip" | "analysis"
type View = { sort: SortKey; type: TypeFilter; hideWatched: boolean }

const VIEW_KEY = "miLista.view"
const DEFAULT_VIEW: View = { sort: "recent", type: "all", hideWatched: false }
const readView = (): View => {
  try {
    return { ...DEFAULT_VIEW, ...(JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}") as Partial<View>) }
  } catch {
    return DEFAULT_VIEW
  }
}
const saveView = (v: View) => {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(v))
  } catch {
    // Sin almacenamiento (modo privado): no se recuerda, sin más.
  }
}

type Group = { key: string; title: string; items: ContentItem[] }

/** Bloque principal del contenido: el de menor número de la taxonomía entre los suyos. */
const mainBlock = (item: ContentItem, tax: Taxonomy) => {
  const names = [...(item.blocks ?? []).map((b) => b.block), ...(item.block ? [item.block] : [])]
  return names
    .map((n) => tax.byBlock.get(n))
    .filter((b): b is NonNullable<typeof b> => !!b?.number)
    .sort((a, b) => a.number! - b.number!)[0]
}

const mainConcept = (item: ContentItem, tax: Taxonomy) =>
  [...item.concepts].sort((a, b) => conceptRank(tax, a) - conceptRank(tax, b))[0]

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

type Tab = "all" | "coach" | number

const MiLista = () => {
  const { t, lang } = useI18n()
  const tax = useTaxonomy()
  const { data: starterTest } = useStarterTest()
  const saved = useSavedItems()
  const folders = useFolders()

  const { data: recent } = useApi(getRecent, [], "recent")
  // Carpeta del sistema «Análisis de Coach»: los análisis entregados de quien YA NO tiene Coach.
  // Con Coach activo viven en su propia pantalla, así que ni se piden.
  const { user } = useAuth()
  const hasCoach = hasFeature(user, "personalAnalysis")
  const { data: coachAnalyses } = useApi(() => (hasCoach ? Promise.resolve([]) : getMyDeliveredAnalyses().catch(() => [])), [hasCoach], "my-delivered-analyses")
  const hasCoachAnalyses = !hasCoach && (coachAnalyses ?? []).length > 0
  const recentItems = recent ?? []
  const inProgressItems = recentItems.filter((i) => !i.completed)
  const finishedItems = recentItems.filter((i) => i.completed)

  const [tab, setTab] = useState<Tab>("all")
  const activeFolder = typeof tab === "number" ? folders.find((f) => f.id === tab) : undefined
  const currentTab: Tab = typeof tab === "number" && !activeFolder ? "all" : tab === "coach" && !hasCoachAnalyses ? "all" : tab

  const [view, setViewState] = useState<View>(readView)
  const setView = (patch: Partial<View>) => {
    const next = { ...view, ...patch }
    setViewState(next)
    saveView(next)
  }

  const [managing, setManaging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  // Confirmación de «Borrar carpeta» dentro de la app (reporte #93): window.confirm a veces no
  // se muestra en el iPhone (app en la pantalla de inicio, navegadores integrados) y cuenta como
  // "Cancelar", así que no se borraba nada.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Lo que se ve: la pestaña (Todo o una carpeta), el filtro y el orden.
  const visible = useMemo(() => {
    let list = saved
    if (activeFolder) {
      const keys = new Set(activeFolder.items)
      list = list.filter((i) => keys.has(itemKey(i)))
    }
    if (view.type !== "all") list = list.filter((i) => i.type === view.type)
    if (view.hideWatched) list = list.filter((i) => !i.completed)
    const sorted = [...list]
    switch (view.sort) {
      case "oldest":
        sorted.reverse()
        break
      case "unseen":
        sorted.sort((a, b) => Number(!!a.completed) - Number(!!b.completed))
        break
      case "duration":
        sorted.sort((a, b) => a.durationSeconds - b.durationSeconds)
        break
      case "block":
        sorted.sort((a, b) => (mainBlock(a, tax)?.number ?? 99) - (mainBlock(b, tax)?.number ?? 99))
        break
      case "concept":
        sorted.sort((a, b) => conceptRank(tax, mainConcept(a, tax) ?? "") - conceptRank(tax, mainConcept(b, tax) ?? ""))
        break
    }
    return sorted
  }, [saved, activeFolder, view, tax])

  // Agrupado por bloque o por concepto cuando se ordena por ellos; si no, un solo grupo.
  const groups: Group[] = useMemo(() => {
    if (view.sort !== "block" && view.sort !== "concept") return [{ key: "all", title: "", items: visible }]
    const out: Group[] = []
    for (const item of visible) {
      let key: string
      let title: string
      if (view.sort === "block") {
        const b = mainBlock(item, tax)
        key = b ? `b${b.number}` : "other"
        // Sin la numeración interna de la taxonomía (reporte #89): solo sirve para ordenar.
        title = b ? (lang === "en" ? b.nameEn : b.nameEs) : t("mi-lista.group.other", "Otros")
      } else {
        const c = mainConcept(item, tax)
        const idx = c ? item.concepts.indexOf(c) : -1
        const name = c ? (lang === "en" ? item.conceptsEn?.[idx] || c : c) : ""
        key = c ? `c${c}` : "other"
        title = c ? `#${name}` : t("mi-lista.group.other", "Otros")
      }
      const g = out.find((x) => x.key === key)
      if (g) g.items.push(item)
      else out.push({ key, title, items: [item] })
    }
    return out
  }, [visible, view.sort, tax, lang, t])

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const exitManage = () => {
    setManaging(false)
    setSelected(new Set())
  }

  const selectedItems = saved.filter((i) => selected.has(i.id))
  const fail = () => setError(t("mi-lista.error", "No se pudo guardar el cambio. Inténtalo de nuevo."))

  // Eliminar de Mi Lista: lo quita de Mi Lista y de todas las carpetas.
  const removeFromMyList = (items: ContentItem[]) => {
    items.forEach((it) => toggleSavedItem(it))
    exitManage()
  }
  const addSelectedTo = (folderId: number) => {
    addToFolder(folderId, selectedItems.map(itemKey)).catch(fail)
    exitManage()
  }
  const removeSelectedFromFolder = () => {
    if (activeFolder) removeFromFolder(activeFolder.id, selectedItems.map(itemKey)).catch(fail)
    exitManage()
  }

  const submitNewFolder = async () => {
    const name = (newFolderName ?? "").trim()
    if (!name) return
    setError(null)
    try {
      const created = await createFolder(name)
      setNewFolderName(null)
      setTab(created.id)
    } catch {
      fail()
    }
  }
  const submitRename = () => {
    const name = (renaming ?? "").trim()
    if (activeFolder && name && name !== activeFolder.name) renameFolder(activeFolder.id, name).catch(fail)
    setRenaming(null)
  }
  const confirmDelete = () => {
    if (!activeFolder) return
    deleteFolder(activeFolder.id).catch(fail)
    setConfirmingDeleteId(null)
    setTab("all")
  }

  const nothingSaved = saved.length === 0
  // Con conceptos para trabajar (del test inicial o seguidos) Mi Lista no está vacía: antes salía
  // la pantalla vacía sin ellos, justo después de que el test dijera «los hemos guardado en Mi
  // Lista» (reporte #97).
  const hasConceptsToWork = (starterTest?.concepts.length ?? 0) > 0
  const nothingAtAll = nothingSaved && recentItems.length === 0 && !hasCoachAnalyses && folders.length === 0 && !hasConceptsToWork
  const select = "rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2 text-base text-white/80 sm:text-xs"

  const tabClass = (on: boolean, extra = "") =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition ${
      on ? "border-neon-cyan bg-neon-cyan font-bold text-midnight" : `border-white/12 text-white/75 hover:text-white ${extra}`
    }`

  return (
    <main className="w-full space-y-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{t("header.nav.mi-lista", "Mi Lista")}</h1>
          <p className="mt-2 text-sm text-white/60">
            {t("mi-lista.subtitle", "Clips y análisis que has guardado para volver cuando quieras.")}
          </p>
        </div>
        {!nothingSaved && currentTab !== "coach" &&
          (managing ? (
            <button
              onClick={exitManage}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <X className="h-4 w-4" /> {t("common.exit", "Salir")}
            </button>
          ) : (
            <button
              onClick={() => setManaging(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Settings2 className="h-4 w-4" /> {t("mi-lista.manage", "Gestionar")}
            </button>
          ))}
      </div>

      {nothingAtAll ? (
        <EmptyState />
      ) : (
        <>
          {/* Test inicial: conceptos para trabajar (o la invitación a hacer el test). */}
          <ConceptsToWork managing={managing} />

          {/* Carpetas: Todo, las del usuario, las del sistema y «Nueva». */}
          <div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
              <button type="button" onClick={() => setTab("all")} className={tabClass(currentTab === "all")}>
                {t("mi-lista.tab.all", "Todo")} <span className="opacity-60">{saved.length}</span>
              </button>
              {folders.map((f) => (
                <button key={f.id} type="button" onClick={() => setTab(f.id)} className={tabClass(currentTab === f.id)}>
                  {f.name} <span className="opacity-60">{saved.filter((i) => f.items.includes(itemKey(i))).length}</span>
                </button>
              ))}
              {hasCoachAnalyses && (
                <button type="button" onClick={() => setTab("coach")} className={tabClass(currentTab === "coach", "border-neon-lime/45 !text-neon-lime")}>
                  {t("mi-lista.tab.coach", "Análisis de Coach")} <span className="opacity-60">{coachAnalyses!.length}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setNewFolderName("")}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-neon-cyan/50 px-3.5 py-1.5 text-sm text-neon-cyan"
              >
                <FolderPlus className="h-4 w-4" /> {t("mi-lista.tab.new", "Nueva")}
              </button>
            </div>

            {newFolderName !== null && (
              <form
                className="mt-3 flex max-w-md items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  submitNewFolder()
                }}
              >
                <input
                  autoFocus
                  value={newFolderName}
                  maxLength={60}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={t("save-to.folder-name", "Nombre de la carpeta")}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/30 sm:text-sm"
                />
                <button type="submit" disabled={!newFolderName.trim()} className="rounded-lg bg-neon-cyan px-3 py-2 text-sm font-bold text-midnight disabled:opacity-40">
                  {t("save-to.create", "Crear")}
                </button>
                <button type="button" onClick={() => setNewFolderName(null)} aria-label={t("common.close", "Cerrar")} className="p-2 text-white/50">
                  <X className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Acciones de la carpeta abierta: renombrar, mover y borrar. */}
            {activeFolder && !managing && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {renaming === null ? (
                  <>
                    <button type="button" onClick={() => setRenaming(activeFolder.name)} className="flex items-center gap-1 rounded-lg border border-white/12 px-2.5 py-1.5 text-white/70 hover:text-white">
                      <Pencil className="h-3.5 w-3.5" /> {t("mi-lista.folder.rename", "Renombrar")}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFolder(activeFolder.id, -1).catch(fail)}
                      aria-label={t("mi-lista.folder.move-left", "Mover a la izquierda")}
                      className="rounded-lg border border-white/12 p-1.5 text-white/70 hover:text-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFolder(activeFolder.id, 1).catch(fail)}
                      aria-label={t("mi-lista.folder.move-right", "Mover a la derecha")}
                      className="rounded-lg border border-white/12 p-1.5 text-white/70 hover:text-white"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    {confirmingDeleteId === activeFolder.id ? (
                      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/[0.06] px-3 py-2">
                        <span className="text-white/80">
                          {t("mi-lista.folder.delete-confirm", "¿Borrar la carpeta «{name}»? Lo que tiene sigue en Mi Lista.", { name: activeFolder.name })}
                        </span>
                        <span className="ml-auto flex gap-2">
                          <button type="button" onClick={() => setConfirmingDeleteId(null)} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-white/70 hover:text-white">
                            {t("common.cancel", "Cancelar")}
                          </button>
                          <button type="button" onClick={confirmDelete} className="rounded-lg bg-red-500/80 px-2.5 py-1.5 font-semibold text-white hover:bg-red-500">
                            {t("mi-lista.folder.delete-yes", "Borrar")}
                          </button>
                        </span>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmingDeleteId(activeFolder.id)} className="flex items-center gap-1 rounded-lg border border-red-400/30 px-2.5 py-1.5 text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" /> {t("mi-lista.folder.delete", "Borrar carpeta")}
                      </button>
                    )}
                  </>
                ) : (
                  <form
                    className="flex max-w-md flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      submitRename()
                    }}
                  >
                    <input
                      autoFocus
                      value={renaming}
                      maxLength={60}
                      onChange={(e) => setRenaming(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-white sm:text-sm"
                    />
                    <button type="submit" className="rounded-lg bg-neon-cyan px-3 py-2 text-sm font-bold text-midnight">
                      {t("common.save", "Guardar")}
                    </button>
                  </form>
                )}
              </div>
            )}
            {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          </div>

          {currentTab === "coach" ? (
            <section>
              <SectionHeading title={t("mi-lista.coach-analyses", "Tus análisis de Coach")} count={coachAnalyses!.length} />
              <PastAnalysesList items={coachAnalyses!} />
            </section>
          ) : (
            <>
              {/* Barra de acciones del modo gestión (§12.1). */}
              {managing && (
                <div className="sticky top-20 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-neon-cyan/30 bg-midnight/90 p-3 backdrop-blur">
                  <span className="mr-auto text-sm font-medium text-white">{t("mi-lista.selected-count", "{count} seleccionados", { count: selected.size })}</span>
                  {folders.length > 0 && (
                    <label className="flex items-center gap-1.5 text-sm text-white/80">
                      <FolderInput className="h-4 w-4" />
                      <select
                        value=""
                        disabled={selected.size === 0}
                        onChange={(e) => e.target.value && addSelectedTo(Number(e.target.value))}
                        className={`${select} disabled:opacity-40`}
                      >
                        <option value="">{t("mi-lista.manage.add-to", "Añadir a carpeta…")}</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {activeFolder && (
                    <button
                      onClick={removeSelectedFromFolder}
                      disabled={selected.size === 0}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5 disabled:opacity-40"
                    >
                      <FolderMinus className="h-4 w-4" /> {t("mi-lista.manage.remove-from-folder", "Quitar de la carpeta")}
                    </button>
                  )}
                  <button
                    onClick={() => removeFromMyList(selectedItems)}
                    disabled={selected.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                  >
                    <Trash2 className="h-4 w-4" /> {t("mi-lista.manage.remove-from-list", "Quitar de Mi Lista")}
                  </button>
                  {currentTab === "all" && (
                    <button
                      onClick={() => removeFromMyList(saved)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5"
                    >
                      {t("mi-lista.empty-all", "Vaciar todo")}
                    </button>
                  )}
                </div>
              )}

              {/* Ordenar y filtrar. */}
              {!nothingSaved && (
                <div className="flex flex-wrap gap-2">
                  <select value={view.sort} onChange={(e) => setView({ sort: e.target.value as SortKey })} className={select} aria-label={t("mi-lista.sort", "Ordenar")}>
                    <option value="recent">{t("mi-lista.sort.recent", "Más recientes")}</option>
                    <option value="oldest">{t("mi-lista.sort.oldest", "Más antiguos")}</option>
                    <option value="block">{t("mi-lista.sort.block", "Por bloque")}</option>
                    <option value="concept">{t("mi-lista.sort.concept", "Por concepto")}</option>
                    <option value="unseen">{t("mi-lista.sort.unseen", "Sin ver primero")}</option>
                    <option value="duration">{t("mi-lista.sort.duration", "Más cortos primero")}</option>
                  </select>
                  <select value={view.type} onChange={(e) => setView({ type: e.target.value as TypeFilter })} className={select} aria-label={t("mi-lista.filter.type", "Tipo")}>
                    <option value="all">{t("mi-lista.filter.all", "Clips y análisis")}</option>
                    <option value="clip">{t("mi-lista.filter.clips", "Solo clips")}</option>
                    <option value="analysis">{t("mi-lista.filter.analyses", "Solo análisis")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setView({ hideWatched: !view.hideWatched })}
                    aria-pressed={view.hideWatched}
                    className={`rounded-lg border px-2.5 py-2 text-sm transition sm:text-xs ${
                      view.hideWatched ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan" : "border-white/12 bg-white/[0.04] text-white/80"
                    }`}
                  >
                    {view.hideWatched ? "● " : "○ "}
                    {t("mi-lista.filter.hide-watched", "Ocultar vistos")}
                  </button>
                </div>
              )}

              {/* Contenido de la pestaña, agrupado si se ordena por bloque o por concepto. */}
              {visible.length > 0 ? (
                <div className="space-y-7">
                  {groups.map((g) => (
                    <section key={g.key}>
                      {g.title && <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/55">{g.title}</h2>}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {g.items.map((c) => (
                          <SavedCard key={c.id} item={c} tax={tax} managing={managing} selected={selected.has(c.id)} onToggleSelect={toggleSelect} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
                  {activeFolder
                    ? t("mi-lista.folder.empty", "Esta carpeta está vacía. Pulsa el icono de guardar en cualquier clip y elige esta carpeta.")
                    : nothingSaved
                      ? t("mi-lista.no-saved-hint", "Aún no has guardado clips ni análisis. Pulsa el icono de guardar en cualquier contenido para tenerlo aquí.")
                      : t("mi-lista.filter.empty", "No hay nada con estos filtros.")}
                </p>
              )}

              {/* Vistos recientemente (§12.4), solo en «Todo»: en curso primero, luego finalizados. */}
              {currentTab === "all" && inProgressItems.length > 0 && (
                <section>
                  <SectionHeading title={t("mi-lista.continue-watching", "Continuar viendo")} count={inProgressItems.length} />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {inProgressItems.map((item) => (
                      <RecentCard key={item.id} item={item} tax={tax} />
                    ))}
                  </div>
                </section>
              )}

              {currentTab === "all" && finishedItems.length > 0 && (
                <section>
                  <SectionHeading
                    title={t("mi-lista.recently-watched", "Vistos recientemente")}
                    count={finishedItems.length}
                    action={
                      <Link to="/app/search?feed=history" className="text-sm font-medium text-neon-cyan transition hover:brightness-110">
                        {t("mi-lista.see-full-history", "Ver historial completo")}
                      </Link>
                    }
                  />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {finishedItems.map((item) => (
                      <RecentCard key={item.id} item={item} tax={tax} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}

export default MiLista
