import { Link } from "react-router-dom"
import type { Clip } from "../../types/clip"
import Badge from "../ui/Badge"

type VideoCardProps = {
  clip: Clip
  target?: "clip" | "analysis"
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
  const targetPath = target === "analysis" ? `/analisis/${clip.id}` : `/clip/${clip.id}`

  return (
    <Link
      to={targetPath}
      className="card-sheen group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-midnight-soft/60 shadow-xl transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={clip.thumbnailUrl}
          alt={clip.title}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge variant="outline" className="bg-black/40 text-white">
            {formatDuration(clip.durationSeconds)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-semibold text-white">{clip.title}</h3>
          <p className="text-sm text-white/60">{clip.ideaKey}</p>
        </div>
      </div>
    </Link>
  )
}

export default VideoCard
