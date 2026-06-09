import type { Clip } from "../../types/clip"
import VideoCard from "./VideoCard"

type VideoFeedProps = {
  clips: Clip[]
  className?: string
  layout?: "vertical" | "grid"
  cardTarget?: "clip" | "video"
}

const VideoFeed = ({
  clips,
  className = "",
  layout = "vertical",
  cardTarget = "clip",
}: VideoFeedProps) => {
  const gridClassName = 
    layout === "vertical" 
      ? "grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-1 max-w-2xl"
      : "grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5"

  return (
    <div className={`${gridClassName} ${className}`}>
      {clips.map((clip) => (
        <VideoCard
          key={clip.id}
          clip={clip}
          target={cardTarget}
        />
      ))}
    </div>
  )
}

export default VideoFeed
