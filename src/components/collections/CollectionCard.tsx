import { Link } from "react-router-dom"
import type { Clip } from "../../types/clip"
import Badge from "../ui/Badge"
import { buttonClasses } from "../ui/Button"
import BookmarkButton from "../ui/BookmarkButton"
import ReactionBar from "../video/ReactionBar"

type CollectionCardProps = {
  clip: Clip
}

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const CollectionCard = ({ clip }: CollectionCardProps) => {
  return (
    <article className="card-sheen group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-midnight-soft/60 shadow-lg transition-transform duration-300 hover:-translate-y-1">
      <div className="relative h-[165px] overflow-hidden">
        <>
          <img
            src={clip.thumbnailUrl}
            alt={clip.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="outline" className="bg-black/40 text-white">
              {formatDuration(clip.durationSeconds)}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <BookmarkButton clipId={clip.id} />
          </div>
        </>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold text-white">{clip.title}</h3>
          <p className="text-[11px] text-white/60">{clip.ideaKey}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/clip/${clip.id}`}
            className={`${buttonClasses("primary")} text-[11px] px-3 py-1.5`}
          >
            Ver completo
          </Link>
          <Link
            to={`/clip/${clip.id}`}
            className={`${buttonClasses("ghost")} text-[11px] px-3 py-1.5`}
          >
            Reproducir clip
          </Link>
        </div>
        <ReactionBar initialCounts={clip.reactionCounts} />
      </div>
    </article>
  )
}

export default CollectionCard
