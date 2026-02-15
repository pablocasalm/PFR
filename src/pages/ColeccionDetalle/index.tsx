import { Link, useParams } from "react-router-dom"
import { getCollectionBySlug } from "../../lib/api/collections"
import { getClipsByIds } from "../../lib/api/clips"
import VideoFeed from "../../components/video/VideoFeed"
import { buttonClasses } from "../../components/ui/Button"
import PageShell from "../../components/layout/PageShell"

const ColeccionDetalle = () => {
  const { slug } = useParams()
  const collection = slug ? getCollectionBySlug(slug) : undefined
  const clips = collection ? getClipsByIds(collection.clipIds) : []

  if (!collection) {
    return (
      <main className="pb-16 pt-16">
        <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Coleccion no encontrada</h1>
          <p className="text-white/60">Vuelve a colecciones para explorar otras selecciones.</p>
          <Link to="/colecciones" className={buttonClasses("primary")}>
            Volver a colecciones
          </Link>
        </PageShell>
      </main>
    )
  }

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">Coleccion</p>
            <h1 className="text-3xl font-semibold text-white">{collection.title}</h1>
            <p className="text-base text-white/70">{collection.description}</p>
          </div>
          <Link to="/colecciones" className={buttonClasses("ghost")}>
            Volver a colecciones
          </Link>
        </div>
        {clips.length > 0 ? (
          <VideoFeed clips={clips} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            Esta coleccion aun no tiene clips publicados.
          </div>
        )}
      </PageShell>
    </main>
  )
}

export default ColeccionDetalle
