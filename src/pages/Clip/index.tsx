import { Link, useLocation, useParams } from "react-router-dom"
import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import ReactionBar from "../../components/video/ReactionBar"
import { buttonClasses } from "../../components/ui/Button"
import { getClipById, getClips } from "../../lib/api/clips"
import BookmarkButton from "../../components/ui/BookmarkButton"
import PageShell from "../../components/layout/PageShell"
import AuthorChip from "../../components/ui/AuthorChip"
import { usePlayer } from "../../app/providers/PlayerProvider"

type ClipProps = {
  contentType?: "clip" | "video"
  mode?: "watch" | "detail"
}

const Clip = ({ contentType, mode = "watch" }: ClipProps) => {
  const { id, clipId, videoId } = useParams()
  const resolvedId = clipId ?? videoId ?? id
  const resolvedContentType =
    contentType ?? (videoId ? "video" : "clip")
  const location = useLocation()
  const backTo =
    (location.state as { from?: string } | null)?.from ?? "/app/explore"
  const clip = resolvedId ? getClipById(resolvedId) : undefined
  const { open, setContainer } = usePlayer()
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const isDetail = mode === "detail"
  const playerSrc =
    clip && resolvedContentType === "video" ? clip.fullVideoUrl : clip?.clipVideoUrl
  const suggestions = getClips().filter((item) => item.id !== clip?.id)

  useEffect(() => {
    if (!clip || isDetail || !playerSrc) {
      return
    }
    open({
      src: playerSrc,
      poster: clip.thumbnailUrl,
      title: clip.title,
      subtitlesEsUrl: clip.subtitlesEsUrl,
      subtitlesEnUrl: clip.subtitlesEnUrl,
      watchPath: `${location.pathname}${location.search}`,
      returnTo: backTo,
    })
  }, [clip, isDetail, open, playerSrc, location.pathname, location.search, backTo])

  useEffect(() => {
    if (isDetail) {
      return
    }
    setContainer(playerContainerRef.current)
    return () => {
      setContainer(null)
    }
  }, [isDetail, setContainer])

  if (!clip) {
    return (
      <main className="pb-16 pt-16">
        <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Contenido no encontrado</h1>
          <p className="text-white/60">Vuelve al feed para descubrir nuevas jugadas.</p>
          <Link to={backTo} className={buttonClasses("primary")}>
            Volver al feed
          </Link>
        </PageShell>
      </main>
    )
  }

  const mainPaddingClass = isDetail ? "pb-16 pt-16" : "pb-16 pt-10"

  return (
    <main className={mainPaddingClass}>
      <PageShell className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">
              {resolvedContentType === "video" ? "Video" : "Clip"}
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="min-w-0 flex-1 text-3xl font-semibold text-white">
                {clip.title}
              </h1>
              {clip.author && resolvedContentType === "video" && !isDetail && (
                <div className="flex-shrink-0">
                  <AuthorChip author={clip.author} size="md" />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BookmarkButton clipId={clip.id} />
            <Link to={backTo} className={buttonClasses("ghost")}>
              Volver al feed
            </Link>
          </div>
        </div>
        {isDetail ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Ficha</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {resolvedContentType === "video" ? "Detalle del video" : "Detalle del clip"}
            </p>
            <p className="mt-2 text-sm text-white/60">
              Revisa metadatos, contexto y contenido relacionado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/app/watch/${resolvedContentType}/${clip.id}`}
                className={buttonClasses("primary")}
              >
                Ver reproducción
              </Link>
              {resolvedContentType === "clip" && (
                <Link to={`/app/video/${clip.id}`} className={buttonClasses("ghost")}>
                  Ver video relacionado
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-4">
              <motion.div
                ref={playerContainerRef}
                className="w-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              />
              <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <ReactionBar initialCounts={clip.reactionCounts} />
                <Link
                  to={`/app/${resolvedContentType}/${clip.id}`}
                  className={buttonClasses("ghost")}
                >
                  Ver ficha
                </Link>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Descripción</p>
                <p className="mt-2 line-clamp-2 text-base font-semibold text-white">
                  {clip.ideaKey}
                </p>
              </div>
            </div>
            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Sugerencias
                </p>
                <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
                  {suggestions.map((item) => {
                    const suggestionPath =
                      resolvedContentType === "video"
                        ? `/app/watch/video/${item.id}`
                        : `/app/clips?clipId=${item.id}`
                    return (
                      <Link
                        key={item.id}
                        to={suggestionPath}
                        state={{ from: backTo }}
                        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-3 transition hover:border-neon-cyan/40"
                      >
                        <div className="h-20 w-32 overflow-hidden rounded-xl bg-black/60">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="line-clamp-2 text-base font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="text-sm text-white/60">{item.ideaKey}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </aside>
          </div>
        )}
      </PageShell>
    </main>
  )
}

export default Clip
