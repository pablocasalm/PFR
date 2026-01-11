import { Link, useParams } from "react-router-dom"
import { useRef } from "react"
import VideoPlayer from "../../components/player/VideoPlayer"
import ReactionBar from "../../components/video/ReactionBar"
import { buttonClasses } from "../../components/ui/Button"
import { getClipById } from "../../lib/api/clips"
import BookmarkButton from "../../components/ui/BookmarkButton"
import { useEntitlement } from "../../app/providers/EntitlementProvider"
import PremiumLockedCover from "../../components/video/PremiumLockedCover"
import SubtitlePills from "../../components/player/SubtitlePills"

const Clip = () => {
  const { id } = useParams()
  const clip = id ? getClipById(id) : undefined
  const { entitlement } = useEntitlement()
  const videoRef = useRef<HTMLVideoElement | null>(null)

  if (!clip) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Clip no encontrado</h1>
        <p className="text-white/60">Vuelve al feed para descubrir nuevas jugadas.</p>
        <Link to="/" className={buttonClasses("primary")}>
          Volver al feed
        </Link>
      </main>
    )
  }

  const isLocked = clip.isPremium && entitlement === "FREE"

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">Clip</p>
            <h1 className="text-3xl font-semibold text-white">{clip.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <BookmarkButton clipId={clip.id} />
            <Link to="/" className={buttonClasses("ghost")}>
              Volver al feed
            </Link>
          </div>
        </div>
        {isLocked ? (
          <PremiumLockedCover
            thumbnailUrl={clip.thumbnailUrl}
            title={clip.title}
            message="Hazte Premium para ver este clip"
            className="aspect-video"
          />
        ) : (
          <VideoPlayer
            ref={videoRef}
            src={clip.clipVideoUrl}
            poster={clip.thumbnailUrl}
            title={clip.title}
            subtitlesEsUrl={clip.subtitlesEsUrl}
            subtitlesEnUrl={clip.subtitlesEnUrl}
            playerClassName="aspect-video"
            videoClassName="object-contain bg-black"
            showSubtitles={false}
            manageSubtitles={false}
          />
        )}
        {!isLocked && (
          <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <SubtitlePills
              videoRef={videoRef}
              subtitlesEsUrl={clip.subtitlesEsUrl}
              subtitlesEnUrl={clip.subtitlesEnUrl}
            />
          <ReactionBar initialCounts={clip.reactionCounts} />
          <Link to={`/analisis/${clip.id}`} className={buttonClasses("ghost")}>
            Ver completo
          </Link>
        </div>
        )}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Idea clave</p>
          <p className="mt-2 text-lg font-semibold text-white">{clip.ideaKey}</p>
        </div>
      </section>
    </main>
  )
}

export default Clip
