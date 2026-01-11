import VideoFeed from "../../components/video/VideoFeed"
import { useBookmarks } from "../../app/providers/BookmarkProvider"
import { getClipsByIds } from "../../lib/api/clips"

const Guardados = () => {
  const { bookmarkIds } = useBookmarks()
  const clips = getClipsByIds(bookmarkIds)

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Guardados</h1>
          <p className="text-base text-white/70">Guarda clips para verlos más tarde.</p>
        </div>
        {clips.length > 0 ? (
          <VideoFeed clips={clips} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            Aún no has guardado ningún clip.
          </div>
        )}
      </section>
    </main>
  )
}

export default Guardados
