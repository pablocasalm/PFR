import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Trophy, Bookmark, Compass, Settings2, Trash2, X, Check, FolderPlus, FolderInput, FolderMinus, Pencil, ChevronRight, ArrowLeft, Folder, ListVideo, MoreVertical } from "lucide-react"
import type { ContentItem } from "../../../lib/api/types"
import { useSavedItems, toggleSavedItem } from "../../../lib/saved/store"
import { useFolders, itemKey, createFolder, renameFolder, deleteFolder, addToFolder, removeFromFolder } from "../../../lib/saved/folders"
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
import PillCard from "../components/PillCard"
import { PILLS_ENABLED } from "../../../lib/pills"
import CardRow from "../../../lib/ui/CardRow"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import ContentCard from "../components/ContentCard"
import ProgressLine from "../components/ProgressLine"

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

const Thumb = ({ src, hue, progress, completed }: { src?: string; hue: number; progress?: number; completed?: boolean }) => (
  <div className="relative aspect-video w-full overflow-hidden" style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    <ProgressLine progress={progress} completed={completed} />
  </div>
)

const SectionHeading = ({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-center gap-2.5">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    {count != null && <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-xs font-semibold text-neon-cyan">{count}</span>}
    {action && <div className="ml-auto">{action}</div>}
  </div>
)

/** Conceptos del contenido en el orden de la taxonomía, sin la numeración interna (reporte #110):
 * "#Mantener", como en el resto de la app. */
const conceptLabels = (item: ContentItem, tax: Taxonomy, lang: string) =>
  item.concepts
    .map((c, i) => ({ es: c, en: item.conceptsEn?.[i] || c }))
    .sort((a, b) => conceptRank(tax, a.es) - conceptRank(tax, b.es))
    .map(({ es, en }) => `#${lang === "en" ? en : es}`)

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
  const media = (
    <div className="relative">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} progress={item.progress} completed={item.completed} />
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(item.durationSeconds)}
      </span>
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
// Carpetas (vista general)
// ---------------------------------------------------------------------------

/** Ruta de una carpeta: «todos» (todo lo guardado), «coach» (análisis de Coach) o su id. */
const folderHref = (key: string | number) => `/app/mi-lista/carpeta/${key}`

/** Portada de una carpeta, al estilo de las listas de YouTube: la miniatura del último guardado,
 * entera (16:9, sin recortes ni mosaicos), con dos capas detrás que la hacen ver como un montón,
 * y el número de vídeos encima. Sin contenido, un fondo neutro con el icono de carpeta. */
const FolderCover = ({ item, count, accent = false }: { item?: ContentItem; count: number; accent?: boolean }) => (
  <div className="relative pt-2.5">
    <span className={`absolute inset-x-4 top-0 h-3 rounded-t-lg ${accent ? "bg-neon-lime/15" : "bg-white/[0.07]"}`} />
    <span className={`absolute inset-x-2 top-[5px] h-3 rounded-t-lg ${accent ? "bg-neon-lime/25" : "bg-white/[0.13]"}`} />
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      {item ? (
        <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-white/[0.04] text-white/25">
          <Folder className="h-8 w-8" />
        </div>
      )}
      <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        <ListVideo className="h-3.5 w-3.5" /> {count}
      </span>
    </div>
  </div>
)

/** Portada de «Nueva carpeta»: igual que la de una carpeta vacía (montón y fondo neutro), con la
 * carpeta con «+» en azul para que se vea que sirve para crear una. `active`: escribiendo el nombre. */
const NewFolderCover = ({ active = false }: { active?: boolean }) => (
  <div className="relative pt-2.5">
    <span className="absolute inset-x-4 top-0 h-3 rounded-t-lg bg-white/[0.07]" />
    <span className="absolute inset-x-2 top-[5px] h-3 rounded-t-lg bg-white/[0.13]" />
    <div
      className={`relative flex aspect-video w-full items-center justify-center rounded-lg border bg-white/[0.04] text-neon-cyan transition ${
        active ? "border-neon-cyan/60" : "border-white/10 group-hover:border-neon-cyan/50"
      }`}
    >
      <FolderPlus className="h-8 w-8" />
    </div>
  </div>
)

/** Menú de tres puntos de una carpeta del usuario (a la derecha del nombre, como en YouTube):
 * renombrarla y borrarla (en el orden en que se crearon; moverlas se quitó por aportar poco). En el móvil y la tableta, una hoja desde abajo
 * (un desplegable se salía de la pantalla en la columna izquierda); en escritorio, desplegable.
 * Se cierra al tocar fuera o con Esc. */
const FolderMenu = ({
  name,
  onRename,
  onDelete,
}: {
  name: string
  onRename: () => void
  onDelete: () => void
}) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("pointerdown", close)
      document.removeEventListener("keydown", close)
    }
  }, [open])
  const item = "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base text-white/85 transition hover:bg-white/[0.06] disabled:opacity-30 lg:py-2.5 lg:text-sm"
  const pick = (fn?: () => void) => () => {
    setOpen(false)
    fn?.()
  }
  const options = (
    <>
      <button type="button" onClick={pick(onRename)} className={item}>
        <Pencil className="h-4 w-4" /> {t("mi-lista.folder.rename", "Renombrar")}
      </button>
      <button type="button" onClick={pick(onDelete)} className={`${item} !text-red-300`}>
        <Trash2 className="h-4 w-4" /> {t("mi-lista.folder.delete", "Borrar carpeta")}
      </button>
    </>
  )
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("mi-lista.folder.options", "Opciones de la carpeta")}
        aria-expanded={open}
        className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 hidden w-52 overflow-hidden rounded-xl border border-white/12 bg-midnight p-1 shadow-xl lg:block">{options}</div>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={name}>
        <div className="-mx-1 -my-1">{options}</div>
      </BottomSheet>
    </div>
  )
}

/** «¿Borrar la carpeta?» en un modal en medio de la pantalla (también en el móvil). Se cierra con
 * Cancelar, tocando fuera o con Esc. */
const DeleteFolderDialog = ({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) => {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onCancel])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Fondo alargado por arriba y por abajo, como en BottomSheet: en Safari de iPhone, con `inset-0`
          quedaba una franja sin oscurecer bajo la barra de estado. */}
      <div className="absolute inset-x-0 -inset-y-32 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-midnight p-5 text-center sm:p-6">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300">
          <Trash2 className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold text-white">{t("mi-lista.folder.delete-title", "¿Borrar «{name}»?", { name })}</h2>
        <p className="mt-2 text-sm text-white/60">{t("mi-lista.folder.delete-text", "Se borra solo la carpeta: los vídeos que tiene siguen guardados en Mi Lista.")}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5">
            {t("common.cancel", "Cancelar")}
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-lg bg-red-500/90 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500">
            {t("mi-lista.folder.delete-yes", "Borrar")}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Una carpeta: portada y nombre (el número de vídeos ya va en la portada). `menu`: los tres
 * puntos, solo en las del usuario. */
const FolderTile = ({
  to,
  name,
  item,
  count,
  accent = false,
  menu,
}: {
  to: string
  name: string
  item?: ContentItem
  count: number
  accent?: boolean
  menu?: React.ReactNode
}) => (
  <div className="group">
    <Link to={to} className="block">
      <FolderCover item={item} count={count} accent={accent} />
    </Link>
    <div className="mt-2 flex items-center gap-1">
      <Link to={to} className={`min-w-0 flex-1 truncate text-sm font-semibold ${accent ? "text-neon-lime" : "text-white"} hover:underline`}>
        {name}
      </Link>
      {menu}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

/**
 * Mi Lista. Sin carpeta en la ruta, la vista general: cabecera (Nueva carpeta, Gestionar),
 * conceptos para trabajar, las carpetas como carpetas («Todos los guardados» primero), las
 * píldoras guardadas y los vistos recientemente. Con /carpeta/:folderId, esa carpeta en su propia
 * pantalla, con su orden, filtros y modo gestión. Las píldoras (verticales) nunca entran en las
 * carpetas: tienen su propia fila.
 */
const MiLista = () => {
  const { t, lang } = useI18n()
  const tax = useTaxonomy()
  const navigate = useNavigate()
  const { folderId } = useParams()
  const { data: starterTest } = useStarterTest()
  // Las píldoras (verticales) van aparte, en su propia fila: nunca entre las tarjetas
  // horizontales de las carpetas.
  const allSaved = useSavedItems()
  const saved = useMemo(() => allSaved.filter((i) => i.type !== "pill"), [allSaved])
  const savedPills = useMemo(() => allSaved.filter((i) => i.type === "pill"), [allSaved])
  const folders = useFolders()

  const { data: recent } = useApi(getRecent, [], "recent")
  // Carpeta del sistema «Análisis de Coach»: los análisis entregados de quien YA NO tiene Coach.
  // Con Coach activo viven en su propia pantalla, así que ni se piden.
  const { user } = useAuth()
  const hasCoach = hasFeature(user, "personalAnalysis")
  const { data: coachAnalyses } = useApi(() => (hasCoach ? Promise.resolve([]) : getMyDeliveredAnalyses().catch(() => [])), [hasCoach], "my-delivered-analyses")
  const hasCoachAnalyses = !hasCoach && (coachAnalyses ?? []).length > 0
  const recentItems = (recent ?? []).filter((i) => i.type !== "pill")

  // Carpeta abierta (ruta): «todos», «coach» o el id de una del usuario.
  const openKey = folderId ?? null
  const activeFolder = openKey && /^\d+$/.test(openKey) ? folders.find((f) => f.id === Number(openKey)) : undefined
  const isAll = openKey === "todos"
  const isCoach = openKey === "coach"

  const [view, setViewState] = useState<View>(readView)
  const setView = (patch: Partial<View>) => {
    const next = { ...view, ...patch }
    setViewState(next)
    saveView(next)
  }

  const [managing, setManaging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newFolderName, setNewFolderName] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null)
  // Confirmación de «Borrar carpeta» dentro de la app (reporte #93): window.confirm a veces no
  // se muestra en el iPhone (app en la pantalla de inicio, navegadores integrados) y cuenta como
  // "Cancelar", así que no se borraba nada.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Al cambiar de pantalla (general ↔ carpeta) se sale del modo gestión.
  const [lastKey, setLastKey] = useState(openKey)
  if (lastKey !== openKey) {
    setLastKey(openKey)
    setManaging(false)
    setSelected(new Set())
    setRenaming(null)
    setConfirmingDeleteId(null)
  }

  // Lo que se ve dentro de una carpeta: su contenido, el filtro y el orden.
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
    setRenaming(null)
    setConfirmingDeleteId(null)
  }

  const selectedItems = saved.filter((i) => selected.has(i.id))
  const fail = () => setError(t("mi-lista.error", "No se pudo guardar el cambio. Inténtalo de nuevo."))

  // Eliminar de Mi Lista: lo quita de Mi Lista y de todas las carpetas.
  const removeFromMyList = (items: ContentItem[]) => {
    items.forEach((it) => toggleSavedItem(it))
    exitManage()
  }
  const addSelectedTo = (id: number) => {
    addToFolder(id, selectedItems.map(itemKey)).catch(fail)
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
      await createFolder(name)
      setNewFolderName(null)
    } catch {
      fail()
    }
  }
  const submitRename = () => {
    if (!renaming) return
    const name = renaming.name.trim()
    const folder = folders.find((f) => f.id === renaming.id)
    if (folder && name && name !== folder.name) renameFolder(folder.id, name).catch(fail)
    setRenaming(null)
  }
  const confirmDelete = (id: number) => {
    deleteFolder(id).catch(fail)
    setConfirmingDeleteId(null)
  }

  const nothingSaved = saved.length === 0
  // Con conceptos para trabajar (del test inicial o seguidos) Mi Lista no está vacía: antes salía
  // la pantalla vacía sin ellos, justo después de que el test dijera «los hemos guardado en Mi
  // Lista» (reporte #97).
  const hasConceptsToWork = (starterTest?.concepts.length ?? 0) > 0
  const nothingAtAll = nothingSaved && savedPills.length === 0 && recentItems.length === 0 && !hasCoachAnalyses && folders.length === 0 && !hasConceptsToWork
  const select = "rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2 text-base text-white/80 sm:text-xs"
  const headerButton = "flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 sm:px-4 sm:py-2.5"
  const errorBox = error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>

  // ------------------------------------------------------------------------
  // Una carpeta, en su propia pantalla
  // ------------------------------------------------------------------------
  if (openKey) {
    const folderItems = activeFolder ? saved.filter((i) => activeFolder.items.includes(itemKey(i))) : saved
    const title = isCoach
      ? t("mi-lista.coach-analyses", "Tus análisis de Coach")
      : isAll
        ? t("mi-lista.folder.all", "Todos los guardados")
        : activeFolder?.name
    const known = isAll || (isCoach && hasCoachAnalyses) || !!activeFolder
    const empty = folderItems.length === 0

    return (
      <main className="w-full space-y-6 py-8">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/app/mi-lista")}
            aria-label={t("common.back", "Volver")}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 text-white/80 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{t("header.nav.mi-lista", "Mi Lista")}</p>
            <h1 className={`line-clamp-2 break-words font-display text-2xl font-bold leading-tight sm:text-3xl ${isCoach ? "text-neon-lime" : "text-white"}`}>{title ?? "…"}</h1>
            {known && (
              <p className="mt-0.5 text-sm text-white/50">
                {t("mi-lista.folder.count", "{count} vídeos", { count: isCoach ? coachAnalyses!.length : folderItems.length })}
              </p>
            )}
          </div>
          {known && !isCoach && !empty && (
            // En el móvil solo el icono: con el texto, el nombre de la carpeta se cortaba.
            <button
              type="button"
              onClick={managing ? exitManage : () => setManaging(true)}
              aria-label={managing ? t("common.exit", "Salir") : t("mi-lista.manage", "Gestionar")}
              className={headerButton}
            >
              {managing ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{managing ? t("common.exit", "Salir") : t("mi-lista.manage", "Gestionar")}</span>
            </button>
          )}
        </div>

        {errorBox}

        {!known ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
            {t("mi-lista.folder.not-found", "Esta carpeta ya no existe.")}{" "}
            <Link to="/app/mi-lista" className="font-semibold text-neon-cyan">
              {t("mi-lista.folder.back", "Volver a Mi Lista")}
            </Link>
          </p>
        ) : isCoach ? (
          <PastAnalysesList items={coachAnalyses!} />
        ) : (
          <>
            {/* Barra de acciones del modo gestión (§12.1). */}
            {managing && (
              <div className="sticky top-20 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-neon-cyan/30 bg-midnight/90 p-3 backdrop-blur">
                <span className="mr-auto text-sm font-medium text-white">{t("mi-lista.selected-count", "{count} seleccionados", { count: selected.size })}</span>
                {folders.filter((f) => f.id !== activeFolder?.id).length > 0 && (
                  <label className="flex items-center gap-1.5 text-sm text-white/80">
                    <FolderInput className="h-4 w-4" />
                    <select
                      value=""
                      disabled={selected.size === 0}
                      onChange={(e) => e.target.value && addSelectedTo(Number(e.target.value))}
                      className={`${select} disabled:opacity-40`}
                    >
                      <option value="">{t("mi-lista.manage.add-to", "Añadir a carpeta…")}</option>
                      {folders
                        .filter((f) => f.id !== activeFolder?.id)
                        .map((f) => (
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
                {isAll && (
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
            {!empty && (
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

            {/* Contenido de la carpeta, agrupado si se ordena por bloque o por concepto. */}
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
                  : empty
                    ? t("mi-lista.no-saved-hint", "Aún no has guardado clips ni análisis. Pulsa el icono de guardar en cualquier contenido para tenerlo aquí.")
                    : t("mi-lista.filter.empty", "No hay nada con estos filtros.")}
              </p>
            )}
          </>
        )}
      </main>
    )
  }

  // ------------------------------------------------------------------------
  // Vista general
  // ------------------------------------------------------------------------
  return (
    <main className="w-full space-y-10 py-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{t("header.nav.mi-lista", "Mi Lista")}</h1>
        </div>

        {errorBox}
      </div>

      {nothingAtAll ? (
        <EmptyState />
      ) : (
        <>
          {/* Test inicial: conceptos para trabajar (o la invitación a hacer el test). */}
          <ConceptsToWork managing={false} />

          {/* Carpetas: «Todos los guardados», las del usuario y, si hay, «Análisis de Coach». */}
          <section>
            <h2 className="mb-1 text-lg font-bold text-white">{t("mi-lista.folders", "Carpetas")}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
              {/* «Nueva carpeta» como una carpeta más, la primera para que se vea aunque haya muchas
                  (al estilo de «Nueva lista» de YouTube): al pulsarla, el nombre se escribe ahí mismo. */}
              {newFolderName === null ? (
                  <button type="button" onClick={() => setNewFolderName("")} className="group block text-left">
                    <NewFolderCover />
                    <p className="mt-2 text-sm font-semibold text-neon-cyan group-hover:underline">{t("mi-lista.folder.new", "Nueva carpeta")}</p>
                  </button>
                ) : (
                  <form
                    className="block"
                    onSubmit={(e) => {
                      e.preventDefault()
                      submitNewFolder()
                    }}
                  >
                    <NewFolderCover active />
                    <input
                      autoFocus
                      value={newFolderName}
                      maxLength={60}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setNewFolderName(null)}
                      placeholder={t("mi-lista.folder.name-short", "Nombre")}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-base text-white placeholder:text-white/30 sm:text-sm"
                    />
                    <div className="mt-1.5 flex gap-1.5">
                      <button type="button" onClick={() => setNewFolderName(null)} className="flex-1 rounded-lg border border-white/15 py-1.5 text-xs text-white/70">
                        {t("common.cancel", "Cancelar")}
                      </button>
                      <button type="submit" disabled={!newFolderName.trim()} className="flex-1 rounded-lg bg-neon-cyan py-1.5 text-xs font-bold text-midnight disabled:opacity-40">
                        {t("save-to.create", "Crear")}
                      </button>
                    </div>
                  </form>
                )}
              <FolderTile to={folderHref("todos")} name={t("mi-lista.folder.all", "Todos los guardados")} item={saved[0]} count={saved.length} />
              {folders.map((f) => {
                const items = saved.filter((it) => f.items.includes(itemKey(it)))
                return (
                  <div key={f.id}>
                    {renaming?.id === f.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          submitRename()
                        }}
                      >
                        <FolderCover item={items[0]} count={items.length} />
                        <div className="mt-2 flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={renaming.name}
                            maxLength={60}
                            onChange={(e) => setRenaming({ id: f.id, name: e.target.value })}
                            onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-base text-white sm:text-sm"
                          />
                          <button type="submit" aria-label={t("common.save", "Guardar")} className="rounded-lg bg-neon-cyan p-1.5 text-midnight">
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <FolderTile
                        to={folderHref(f.id)}
                        name={f.name}
                        item={items[0]}
                        count={items.length}
                        menu={
                          <FolderMenu
                            name={f.name}
                            onRename={() => setRenaming({ id: f.id, name: f.name })}
                            onDelete={() => setConfirmingDeleteId(f.id)}
                          />
                        }
                      />
                    )}
                  </div>
                )
              })}
              {hasCoachAnalyses && (
                <FolderTile to={folderHref("coach")} name={t("mi-lista.tab.coach", "Análisis de Coach")} count={coachAnalyses!.length} accent />
              )}
            </div>
          </section>

          {confirmingDeleteId != null && (
            <DeleteFolderDialog
              name={folders.find((f) => f.id === confirmingDeleteId)?.name ?? ""}
              onCancel={() => setConfirmingDeleteId(null)}
              onConfirm={() => confirmDelete(confirmingDeleteId)}
            />
          )}

          {/* Píldoras guardadas: su propia fila de tarjetas verticales. */}
          {PILLS_ENABLED && savedPills.length > 0 && (
            <section>
              <SectionHeading title={t("mi-lista.saved-pills", "Píldoras guardadas")} count={savedPills.length} />
              <CardRow itemWidth="w-[28vw]" cols="sm:grid-cols-5 lg:grid-cols-8">
                {savedPills.map((p) => (
                  <PillCard key={p.id} item={p} />
                ))}
              </CardRow>
            </section>
          )}

          {/* Vistos recientemente (§12.4): como las filas de Inicio, los 5 últimos con una línea de
              lo visto en la miniatura; en el móvil se deslizan, en tableta caben 3 y en escritorio
              los 5. El resto, en Historial. */}
          {recentItems.length > 0 && (
            <section>
              <SectionHeading
                title={t("mi-lista.recently-watched", "Vistos recientemente")}
                action={
                  <Link to="/app/historial" className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
                    {t("mi-lista.see-history", "Ver historial")} <ChevronRight className="h-4 w-4" />
                  </Link>
                }
              />
              <CardRow max={5}>
                {recentItems.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </CardRow>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default MiLista
