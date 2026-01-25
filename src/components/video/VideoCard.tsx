import { Link } from "react-router-dom"
import type { Clip } from "../../types/clip"
import ReactionBar from "./ReactionBar"
import Badge from "../ui/Badge"
import { buttonClasses } from "../ui/Button"
import BookmarkButton from "../ui/BookmarkButton"

type VideoCardProps = {
  clip: Clip
  showFullHint?: boolean
  prioritizeFull?: boolean
  secondaryVariant?: "secondary" | "ghost"
}

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const VideoCard = ({
  clip,
  showFullHint = false,
  prioritizeFull = false,
  secondaryVariant = "secondary",
}: VideoCardProps) => {
  return (
    <article className="card-sheen group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-midnight-soft/60 shadow-xl transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-video overflow-hidden">
        <video
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={clip.clipVideoUrl}
          poster={clip.thumbnailUrl}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge variant="outline" className="bg-black/40 text-white">
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </div>
        <div className="absolute right-4 top-4">
          <BookmarkButton clipId={clip.id} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-semibold text-white">{clip.title}</h3>
          <p className="text-sm text-white/60">{clip.ideaKey}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {prioritizeFull ? (
            <>
              <Link to={`/analisis/${clip.id}`} className={buttonClasses("primary")}>
                Ver completo
              </Link>
              <Link to={`/clip/${clip.id}`} className={buttonClasses(secondaryVariant)}>
                Reproducir clip
              </Link>
            </>
          ) : (
            <>
              <Link to={`/clip/${clip.id}`} className={buttonClasses("primary")}>
                Reproducir clip
              </Link>
              <Link to={`/analisis/${clip.id}`} className={buttonClasses("secondary")}>
                Ver completo
              </Link>
            </>
          )}
        </div>
        {showFullHint && (
          <p className="text-xs text-white/50">Lectura extendida del punto</p>
        )}
        <ReactionBar initialCounts={clip.reactionCounts} />
      </div>
    </article>
  )
}

export default VideoCard
