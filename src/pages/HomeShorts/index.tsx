import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import ShortsFeed from "../../components/shorts/ShortsFeed"
import { getClips } from "../../lib/api/clips"

const HomeShorts = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const initialClipId = searchParams.get("clipId") ?? undefined
  const clips = getClips()

  useEffect(() => {
    setIsLoading(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (isLoading) {
    return (
      <main className="flex h-[calc(100vh-5rem)] items-center justify-center text-white/60">
        Cargando clips…
      </main>
    )
  }

  if (clips.length === 0) {
    return (
      <main className="flex h-[calc(100vh-5rem)] items-center justify-center text-white/60">
        No hay clips disponibles
      </main>
    )
  }

  return (
    <main className="relative">
      <ShortsFeed clips={clips} initialClipId={initialClipId ?? undefined} />
    </main>
  )
}

export default HomeShorts
