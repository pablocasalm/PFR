import { Link, useLocation, useNavigate } from "react-router-dom"
import type { Clip } from "../../types/clip"
import Badge from "../ui/Badge"
import Card from "../ui/Card"

type VideoCardProps = {
  clip: Clip
  target?: "clip" | "video"
}

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const VideoCard = ({
  clip,
  target = "clip",
}: VideoCardProps) => {
  const targetPath =
    target === "video" ? `/app/watch/video/${clip.id}` : `/app/clips?clipId=${clip.id}`
  const editPath =
    target === "video" ? `/app/edit/video/${clip.id}` : `/app/edit/clip/${clip.id}`
  const statsPath =
    target === "video" ? `/app/stats/video/${clip.id}` : `/app/stats/clip/${clip.id}`
  const isClipCard = target === "clip"
  const clipPreview = "/Mniaturas/vertical-placeholder.svg"
  const clipTags = (clip.tags ?? []).slice(0, 3)
  const navigate = useNavigate()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  const handleActionClick =
    (path: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      navigate(path)
    }

  return (
    <Link
      to={targetPath}
      state={{ from }}
      className={`group relative ${
        isClipCard ? "" : "flex h-full flex-col"
      }`}
    >
      <Card
        className={`card-sheen relative overflow-hidden rounded-xl bg-midnight-soft/60 shadow-xl transition-all duration-200 ease-out hover:scale-[1.04] hover:shadow-xl ${
          isClipCard ? "" : "flex h-full flex-col"
        }`}
      >
        <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            className="focus-ring rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur hover:text-white"
            aria-label="Editar"
            onClick={handleActionClick(editPath)}
          >
            Editar
          </button>
          <button
            type="button"
            className="focus-ring rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur hover:text-white"
            aria-label="Estadisticas"
            onClick={handleActionClick(statsPath)}
          >
            Stats
          </button>
        </div>
        <div
          className={`relative overflow-hidden ${
            isClipCard ? "aspect-[9/16] bg-black/40" : "aspect-[4/3]"
          }`}
        >
          <img
            className={`h-full w-full transition duration-500 ${
              isClipCard
                ? "object-contain group-hover:scale-[1.02]"
                : "object-cover group-hover:scale-105"
            }`}
            src={isClipCard ? clipPreview : clip.thumbnailUrl}
            alt={clip.title}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {isClipCard && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="rounded-full bg-black/50 p-3">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" aria-hidden="true">
                  <path d="M8 5l12 7-12 7z" fill="currentColor" />
                </svg>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Badge
              variant="outline"
              className="rounded-md border-0 bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
            >
              {formatDuration(clip.durationSeconds)}
            </Badge>
          </div>
        </div>
        {isClipCard && (
          <div className="p-4">
            <div className="rounded-lg bg-black/40 p-4">
              {clipTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {clipTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400"
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 line-clamp-2 text-base font-semibold text-white">{clip.title}</p>
              <p className="mt-1 text-sm text-zinc-400">{clip.ideaKey}</p>
            </div>
          </div>
        )}
        {!isClipCard && (
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="space-y-2">
              <h3 className="line-clamp-2 text-base font-medium text-white">{clip.title}</h3>
              <p className="text-sm text-zinc-400">{clip.ideaKey}</p>
            </div>
          </div>
        )}
      </Card>
    </Link>
  )
}

export default VideoCard
