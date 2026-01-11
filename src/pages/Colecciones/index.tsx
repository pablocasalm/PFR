import { getCollections } from "../../lib/api/collections"
import { getClipsByIds } from "../../lib/api/clips"
import CollectionRow from "../../components/collections/CollectionRow"

const Colecciones = () => {
  const collections = getCollections()

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Colecciones</h1>
          <p className="text-base text-white/70">Colecciones editoriales de análisis táctico.</p>
        </div>
        {collections.map((collection) => (
          <CollectionRow
            key={collection.slug}
            title={collection.title}
            description={collection.description}
            clips={getClipsByIds(collection.clipIds)}
          />
        ))}
        {collections.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            No hay colecciones disponibles por ahora.
          </div>
        )}
      </section>
    </main>
  )
}

export default Colecciones
