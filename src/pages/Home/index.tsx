import VideoFeed from "../../components/video/VideoFeed"
import { getClips } from "../../lib/api/clips"

const Home = () => {
  const clips = getClips()

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neon-cyan/80">
            Padel Film Room
          </p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            El feed donde cada clip cuenta una historia táctica.
          </h1>
          <p className="max-w-2xl text-base text-white/70">
            Explora jugadas reales, reacciones instantáneas y análisis completos para llevar tu
            lectura del juego al siguiente nivel.
          </p>
        </div>
        <VideoFeed clips={clips} />
      </section>
    </main>
  )
}

export default Home
