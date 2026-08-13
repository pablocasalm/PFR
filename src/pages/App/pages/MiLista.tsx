import { useState } from "react"
import { Link } from "react-router-dom"
import { Trophy, Bookmark, Compass, Settings2, Trash2, X, Check, Play } from "lucide-react"
import type { ContentItem } from "../../../lib/api/types"
import { useSavedItems, toggleSavedItem } from "../../../lib/saved/store"
import { useApi } from "../../../lib/hooks/useApi"
import { getRecent } from "../../../lib/api/history"
import SaveButton from "../../../lib/saved/SaveButton"

/**
 * MiLista — Biblioteca personal del usuario (§12). Tres secciones:
 *  - Clips guardados y Análisis guardados (store de guardados, sincronizado con /api/saved).
 *  - Vistos recientemente (§12.4), del historial (GET /api/history/recent) — no requiere guardar.
 * Incluye modo "Gestionar" (§12.1): seleccionar, eliminar y vaciar el contenido guardado.
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

const CardMeta = ({ item }: { item: ContentItem }) => (
  <div className="p-3">
    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-white">{item.title}</p>
    {item.type === "analysis" && item.tournament ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
        <Trophy className="h-3.5 w-3.5 text-white/40" /> {item.tournament}
      </p>
    ) : (
      <div className="mt-2 flex flex-wrap gap-2">
        {item.concepts.slice(0, 3).map((c) => (
          <span key={c} className="text-[11px] text-neon-cyan/80">
            #{c}
          </span>
        ))}
      </div>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

// Tarjeta de contenido guardado. En modo gestión se convierte en selector (checkbox),
// dejando de navegar para poder marcar elementos a eliminar.
const SavedCard = ({
  item,
  managing,
  selected,
  onToggleSelect,
}: {
  item: ContentItem
  managing: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}) => {
  const media = (
    <div className="relative">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} />
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
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
        <CardMeta item={item} />
      </button>
    )
  }

  return (
    <Link to={watchHref(item)} className={`${base} border-white/10 hover:border-white/20`}>
      {media}
      <CardMeta item={item} />
    </Link>
  )
}

// Tarjeta de "Vistos recientemente": barra de progreso + acceso para continuar.
const RecentCard = ({ item }: { item: ContentItem }) => (
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
    <CardMeta item={item} />
  </Link>
)

// ---------------------------------------------------------------------------
// Estado vacío (§12.5)
// ---------------------------------------------------------------------------

const EmptyState = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neon-cyan">
      <Bookmark className="h-6 w-6" />
    </div>
    <h2 className="mt-5 text-xl font-bold text-white">Todavía no has guardado ningún contenido</h2>
    <p className="mt-2 max-w-sm text-sm text-white/60">
      Guarda clips o análisis para acceder rápidamente desde aquí.
    </p>
    <div className="mt-6 flex gap-3">
      <Link
        to="/app/explorar"
        className="flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
      >
        <Compass className="h-4 w-4" />
        Ir a Explorar
      </Link>
      <Link
        to="/app/inicio"
        className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        Ir a Inicio
      </Link>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const MiLista = () => {
  const saved = useSavedItems()
  const clips = saved.filter((i) => i.type === "clip")
  const analyses = saved.filter((i) => i.type === "analysis")

  const { data: recent } = useApi(getRecent, [], "recent")
  const recentItems = recent ?? []

  const [managing, setManaging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exitManage = () => {
    setManaging(false)
    setSelected(new Set())
  }

  // Elimina de Mi Lista (toggle sobre contenido guardado → lo quita, y sincroniza con backend).
  const removeItems = (items: ContentItem[]) => {
    items.forEach((it) => toggleSavedItem(it))
    exitManage()
  }
  const removeSelected = () => removeItems(saved.filter((i) => selected.has(i.id)))
  const emptyAll = () => removeItems(saved)

  const nothingSaved = saved.length === 0
  const nothingAtAll = nothingSaved && recentItems.length === 0

  return (
    <main className="w-full space-y-10 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">Mi Lista</h1>
          <p className="mt-2 text-sm text-white/60">
            Clips y análisis que has guardado para volver cuando quieras.
          </p>
        </div>
        {!nothingSaved &&
          (managing ? (
            <button
              onClick={exitManage}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <X className="h-4 w-4" /> Salir
            </button>
          ) : (
            <button
              onClick={() => setManaging(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Settings2 className="h-4 w-4" /> Gestionar
            </button>
          ))}
      </div>

      {/* Barra de acciones del modo gestión (§12.1) */}
      {managing && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-neon-cyan/30 bg-midnight/90 p-3 backdrop-blur">
          <span className="text-sm font-medium text-white">{selected.size} seleccionados</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={removeSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
            <button
              onClick={emptyAll}
              className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5"
            >
              Vaciar todo
            </button>
          </div>
        </div>
      )}

      {nothingAtAll ? (
        <EmptyState />
      ) : (
        <>
          {clips.length > 0 && (
            <section>
              <SectionHeading title="Clips guardados" count={clips.length} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {clips.map((c) => (
                  <SavedCard key={c.id} item={c} managing={managing} selected={selected.has(c.id)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            </section>
          )}

          {analyses.length > 0 && (
            <section>
              <SectionHeading title="Análisis guardados" count={analyses.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {analyses.map((a) => (
                  <SavedCard key={a.id} item={a} managing={managing} selected={selected.has(a.id)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            </section>
          )}

          {/* Si no hay guardados pero sí historial, un aviso ligero en vez del estado vacío completo */}
          {nothingSaved && (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
              Aún no has guardado clips ni análisis. Pulsa el icono de guardar en cualquier contenido para tenerlo aquí.
            </p>
          )}

          {/* Vistos recientemente (§12.4) */}
          {recentItems.length > 0 && (
            <section>
              <SectionHeading
                title="Vistos recientemente"
                count={recentItems.length}
                action={
                  <Link to="/app/search?feed=history" className="text-sm font-medium text-neon-cyan transition hover:brightness-110">
                    Ver historial completo
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {recentItems.map((item) => (
                  <RecentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default MiLista
