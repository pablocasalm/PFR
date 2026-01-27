import { Link, useParams } from "react-router-dom"
import { useRef } from "react"
import VideoPlayer from "../../components/player/VideoPlayer"
import ReactionBar from "../../components/video/ReactionBar"
import { buttonClasses } from "../../components/ui/Button"
import { getClipById } from "../../lib/api/clips"
import BookmarkButton from "../../components/ui/BookmarkButton"
import SubtitlePills from "../../components/player/SubtitlePills"
import PageShell from "../../components/layout/PageShell"

const Clip = () => {
  const { id } = useParams()
  const clip = id ? getClipById(id) : undefined
  const videoRef = useRef<HTMLVideoElement | null>(null)

  if (!clip) {
    return (
      <main className="pb-16 pt-16">
        <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Clip no encontrado</h1>
          <p className="text-white/60">Vuelve al feed para descubrir nuevas jugadas.</p>
          <Link to="/app" className={buttonClasses("primary")}>
            Volver al feed
          </Link>
        </PageShell>
      </main>
    )
  }

  return (
    <main className="pb-16 pt-16">
      <PageShell className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">Clip</p>
            <h1 className="text-3xl font-semibold text-white">{clip.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <BookmarkButton clipId={clip.id} />
            <Link to="/app" className={buttonClasses("ghost")}>
              Volver al feed
            </Link>
          </div>
        </div>
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
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <SubtitlePills
            videoRef={videoRef}
            subtitlesEsUrl={clip.subtitlesEsUrl}
            subtitlesEnUrl={clip.subtitlesEnUrl}
          />
          <ReactionBar initialCounts={clip.reactionCounts} />
          <Link to={`/video/${clip.id}`} className={buttonClasses("ghost")}>
            Ver completo
          </Link>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Idea clave</p>
          <p className="mt-2 text-lg font-semibold text-white">{clip.ideaKey}</p>
        </div>
      </PageShell>
    </main>
  )
}

export default Clip
