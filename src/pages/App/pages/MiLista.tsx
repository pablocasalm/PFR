import { Link } from "react-router-dom"
import { Trophy, Bookmark, Compass } from "lucide-react"
import type { ContentItem } from "../../../lib/api/types"
import { useSavedItems } from "../../../lib/saved/store"
import SaveButton from "../../../lib/saved/SaveButton"

/**
 * MiLista — Contenido guardado del usuario (§12). Lee del store local de guardados
 * (fuente de verdad de la UI; el contrato /api/saved se conectará con el backend).
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

const Thumb = ({ src, hue }: { src?: string; hue: number }) => (
  <div className="relative aspect-video w-full overflow-hidden" style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
  </div>
)

const SectionHeading = ({ title, count }: { title: string; count: number }) => (
  <div className="mb-4 flex items-center gap-2.5">
    <h2 className="text-lg font-bold text-white">{title}</h2>
    <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-xs font-semibold text-neon-cyan">{count}</span>
  </div>
)

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

const SavedCard = ({ item }: { item: ContentItem }) => (
  <Link
    to={watchHref(item)}
    className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20"
  >
    <div className="relative">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} />
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(item.durationSeconds)}
      </span>
      <span className="absolute left-2 top-2" onClick={(e) => e.preventDefault()}>
        <SaveButton item={item} variant="icon" />
      </span>
    </div>
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

  return (
    <main className="w-full space-y-10 py-8">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Mi Lista</h1>
        <p className="mt-2 text-sm text-white/60">
          Clips y análisis que has guardado para volver cuando quieras.
        </p>
      </div>

      {saved.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {clips.length > 0 && (
            <section>
              <SectionHeading title="Clips guardados" count={clips.length} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {clips.map((c) => (
                  <SavedCard key={c.id} item={c} />
                ))}
              </div>
            </section>
          )}

          {analyses.length > 0 && (
            <section>
              <SectionHeading title="Análisis guardados" count={analyses.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {analyses.map((a) => (
                  <SavedCard key={a.id} item={a} />
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
