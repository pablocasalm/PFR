import { getCollections } from "../../lib/api/collections"
import { getClipsByIds } from "../../lib/api/clips"
import CollectionRow from "../../components/collections/CollectionRow"
import AppContainer from "../../components/ui/AppContainer"

const Colecciones = () => {
  const collections = getCollections()

  return (
    <main className="pb-16 pt-16">
      <AppContainer className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-white lg:text-5xl">Colecciones</h1>
          <p className="text-sm text-zinc-400">Colecciones editoriales de análisis táctico.</p>
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
      </AppContainer>
    </main>
  )
}

export default Colecciones
