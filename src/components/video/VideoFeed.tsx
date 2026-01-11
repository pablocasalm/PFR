import type { Clip } from "../../types/clip"
import VideoCard from "./VideoCard"

type VideoFeedProps = {
  clips: Clip[]
  className?: string
  showFullHint?: boolean
  prioritizeFull?: boolean
  secondaryVariant?: "secondary" | "ghost"
}

const VideoFeed = ({
  clips,
  className = "",
  showFullHint = false,
  prioritizeFull = false,
  secondaryVariant = "secondary",
}: VideoFeedProps) => (
  <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-3 ${className}`}>
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

export default VideoFeed
