import type { Clip } from "../../types/clip"
import VideoCard from "./VideoCard"

type VideoFeedProps = {
  clips: Clip[]
  className?: string
  showFullHint?: boolean
  prioritizeFull?: boolean
  secondaryVariant?: "secondary" | "ghost"
  layout?: "vertical" | "grid"
}

const VideoFeed = ({
  clips,
  className = "",
  showFullHint = false,
  prioritizeFull = false,
  secondaryVariant = "secondary",
  layout = "vertical",
}: VideoFeedProps) => {
  const gridClassName = 
    layout === "vertical" 
      ? "grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1 max-w-2xl"
      : "grid gap-8 md:grid-cols-2 xl:grid-cols-3"

  return (
    <div className={`${gridClassName} ${className}`}>
      {clips.map((clip) => (
        <VideoCard
          key={clip.id}
          clip={clip}
          showFullHint={showFullHint}
          prioritizeFull={prioritizeFull}
          secondaryVariant={secondaryVariant}
        />
      ))}
    </div>
  )
}

export default VideoFeed
