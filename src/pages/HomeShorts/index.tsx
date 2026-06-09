import { useEffect, useState } from "react"
import AppContainer from "../../components/ui/AppContainer"
import Section from "../../components/ui/Section"
import VideoCard from "../../components/video/VideoCard"
import { getClips } from "../../lib/api/clips"

const HomeShorts = () => {
  const [isLoading, setIsLoading] = useState(true)
  const clips = getClips()
  const filters = ["Todos", "Bandeja", "Globo", "Presión", "Defensa", "Ataque"]

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-81px)]">
        <AppContainer className="flex min-h-[calc(100vh-81px)] flex-col">
          <Section className="flex min-h-[calc(100vh-81px)] flex-1 items-center justify-center py-0">
            Cargando clips…
          </Section>
        </AppContainer>
      </main>
    )
  }

  if (clips.length === 0) {
    return (
      <main className="min-h-[calc(100vh-81px)]">
        <AppContainer className="flex min-h-[calc(100vh-81px)] flex-col">
          <Section className="flex min-h-[calc(100vh-81px)] flex-1 items-center justify-center py-0">
            No hay clips disponibles
          </Section>
        </AppContainer>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-81px)]">
      <AppContainer className="flex min-h-[calc(100vh-81px)] flex-col">
        <Section className="flex-1">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-semibold text-white">Clips</h1>
            <p className="text-sm text-zinc-400">
              Fragmentos analizados para estudiar decisiones y patrones de juego.
            </p>
          </div>
          <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
            {filters.map((filter, index) => (
              <button
                key={filter}
                type="button"
                className={`rounded-full px-3 py-1 text-sm ${
                  index === 0 ? "bg-cyan-500 text-black" : "bg-zinc-800 text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {clips.map((clip) => (
              <VideoCard key={clip.id} clip={clip} target="clip" />
            ))}
          </div>
        </Section>
      </AppContainer>
    </main>
  )
}

export default HomeShorts
