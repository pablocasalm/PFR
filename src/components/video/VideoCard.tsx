import { Link, useNavigate } from "react-router-dom"
import type { Clip } from "../../types/clip"
import Badge from "../ui/Badge"

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
  const targetPath = `/clip/${clip.id}`
  const editPath = `/clip/${clip.id}/editar`
  const statsPath = `/clip/${clip.id}/stats`
  const isClipCard = target === "clip"
  const clipPreview = "/Mniaturas/vertical-placeholder.svg"
  const navigate = useNavigate()

  const handleActionClick =
    (path: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      navigate(path)
    }

  return (
    <Link
      to={targetPath}
      className={`card-sheen group relative overflow-hidden rounded-3xl border border-white/10 bg-midnight-soft/60 shadow-xl transition-transform duration-300 hover:-translate-y-1 ${
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
        {!isClipCard && (
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
        )}
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge variant="outline" className="bg-black/40 text-white">
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </div>
      </div>
      {!isClipCard && (
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold text-white">{clip.title}</h3>
            <p className="text-sm text-white/60">{clip.ideaKey}</p>
          </div>
        </div>
      )}
    </Link>
  )
}

export default VideoCard
