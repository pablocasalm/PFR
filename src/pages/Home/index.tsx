import VideoFeed from "../../components/video/VideoFeed"
import { getClips } from "../../lib/api/clips"
import AppContainer from "../../components/ui/AppContainer"

const Home = () => {
  const clips = getClips()

  return (
    <main className="pb-16 pt-16">
      <AppContainer className="flex flex-col gap-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neon-cyan/80">
            Padel Film Room
          </p>
          <h1 className="text-4xl font-semibold text-white lg:text-5xl">
            El feed donde cada clip cuenta una historia táctica.
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Explora jugadas reales, reacciones instantáneas y análisis completos para llevar tu
            lectura del juego al siguiente nivel.
          </p>
        </div>
        <VideoFeed clips={clips} />
      </AppContainer>
    </main>
  )
}

export default Home
