import { Link, useParams } from "react-router-dom"
import { getCollectionBySlug } from "../../lib/api/collections"
import { getClipsByIds } from "../../lib/api/clips"
import VideoFeed from "../../components/video/VideoFeed"
import { buttonClasses } from "../../components/ui/Button"

const ColeccionDetalle = () => {
  const { slug } = useParams()
  const collection = slug ? getCollectionBySlug(slug) : undefined
  const clips = collection ? getClipsByIds(collection.clipIds) : []

  if (!collection) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Colección no encontrada</h1>
        <p className="text-white/60">Vuelve a colecciones para explorar otras selecciones.</p>
        <Link to="/colecciones" className={buttonClasses("primary")}>
          Volver a colecciones
        </Link>
      </main>
    )
  }

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">Colección</p>
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
            Esta colección aún no tiene clips publicados.
          </div>
        )}
      </section>
    </main>
  )
}

export default ColeccionDetalle
