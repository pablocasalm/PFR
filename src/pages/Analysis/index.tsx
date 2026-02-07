import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import VideoPlayer from "../../components/player/VideoPlayer"
import { buttonClasses } from "../../components/ui/Button"
import { getClipById } from "../../lib/api/clips"
import BookmarkButton from "../../components/ui/BookmarkButton"
import ReactionBar from "../../components/video/ReactionBar"
import PageShell from "../../components/layout/PageShell"

const Analysis = () => {
  const { id } = useParams()
  const clip = id ? getClipById(id) : undefined
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(() => {
    const stored = localStorage.getItem("pfr_speed_v1")
    const value = stored ? Number(stored) : 1
    return Number.isFinite(value) && value > 0 ? value : 1
  })
  const [isCcOpen, setIsCcOpen] = useState(false)
  const [subtitle, setSubtitle] = useState<"off" | "es" | "en">("off")

  if (!clip) {
    return (
      <main className="pb-16 pt-16">
        <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Análisis no encontrado</h1>
          <p className="text-white/60">Vuelve al feed para descubrir nuevas jugadas.</p>
          <Link to="/app" className={buttonClasses("primary")}>
            Volver al feed
          </Link>
        </PageShell>
      </main>
    )
  }

  const fallbackMatch = {
    tournament: { name: "Premier Padel – México Major" },
    round: "Cuartos de final",
    players: {
      teamA: { player1: "Jugador A", player2: "Jugador B" },
      teamB: { player1: "Jugador C", player2: "Jugador D" },
    },
  }

  const fallbackChapters = [
    { id: "m1", startSeconds: 42, title: "Primera transición: quién manda la red" },
    { id: "m2", startSeconds: 135, title: "Bandeja al cuerpo para fijar" },
    { id: "m3", startSeconds: 250, title: "Salida de pared en el drive" },
  ]

  const chapters = clip.chapters.length ? clip.chapters : fallbackChapters
  const match = clip.match ?? fallbackMatch

  const activeChapterId = useMemo(() => {
    if (chapters.length === 0) {
      return null
    }
    const current = chapters.findIndex((chapter, index) => {
      const next = chapters[index + 1]
      return currentTime >= chapter.startSeconds && (!next || currentTime < next.startSeconds)
    })
    return current >= 0 ? chapters[current].id : null
  }, [chapters, currentTime])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.playbackRate = playbackRate
    localStorage.setItem("pfr_speed_v1", String(playbackRate))
  }, [playbackRate])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const tracks = Array.from(video.textTracks)
    tracks.forEach((track) => {
      track.mode = "disabled"
    })
    if (subtitle === "es") {
      const esTrack = tracks.find((track) => track.language === "es")
      if (esTrack) {
        esTrack.mode = "showing"
      }
    }
    if (subtitle === "en") {
      const enTrack = tracks.find((track) => track.language === "en")
      if (enTrack) {
        enTrack.mode = "showing"
      }
    }
  }, [subtitle])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleChapterClick = (startSeconds: number) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = startSeconds
    void video.play()
  }

  return (
    <main className="pb-16 pt-16">
      <PageShell className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-neon-cyan/70">Análisis</p>
            <h1 className="text-3xl font-semibold text-white">{clip.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <BookmarkButton clipId={clip.id} />
            <Link to={`/clip/${clip.id}`} className={buttonClasses("ghost")}>
              Volver al clip
            </Link>
          </div>
        </div>
        <div className="playerShell relative aspect-video max-h-[70vh] overflow-hidden rounded-3xl border border-white/10 bg-black/40">
          <VideoPlayer
            ref={videoRef}
            src={clip.fullVideoUrl}
            poster={clip.thumbnailUrl}
            title={`Análisis ${clip.title}`}
            subtitlesEsUrl={clip.subtitlesEsUrl}
            subtitlesEnUrl={clip.subtitlesEnUrl}
            className="h-full w-full"
            playerClassName="h-full w-full rounded-none border-0 bg-transparent shadow-none"
            videoClassName="h-full w-full object-contain bg-black"
            showSubtitles={false}
            manageSubtitles={false}
          />
          <div className="playerOverlayTopRight absolute right-3 top-3 z-50 flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCcOpen((prev) => !prev)}
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-xs font-semibold text-white"
                aria-label="Subtítulos"
              >
                CC
              </button>
              {isCcOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/10 bg-midnight/95 p-2 text-[11px] text-white shadow-xl">
                  {[
                    { label: "Apagados", value: "off" },
                    { label: "Español", value: "es" },
                    { label: "Inglés", value: "en" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSubtitle(option.value as "off" | "es" | "en")
                        setIsCcOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        subtitle === option.value
                          ? "bg-white text-midnight"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const order = [1, 1.25, 1.5, 2]
                const next = order[(order.indexOf(playbackRate) + 1) % order.length]
                setPlaybackRate(next)
              }}
              className="focus-ring rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <ReactionBar initialCounts={clip.reactionCounts} />
        </div>
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Partido</p>
            <div className="mt-4 grid gap-2 text-sm">
              <p>
                <span className="text-white/50">Torneo:</span> {match.tournament.name}
                {match.tournament.season ? ` ${match.tournament.season}` : ""}
                {match.tournament.location  ` · ${match.tournament.location}` : ""}
              </p>
              <p>
                <span className="text-white/50">Ronda:</span> {match.round}
              </p>
              <p>
                <span className="text-white/50">Jugadores:</span>{" "}
                {match.players.teamA.player1} / {match.players.teamA.player2} vs{" "}
                {match.players.teamB.player1} / {match.players.teamB.player2}
              </p>
              {match.date && (
                <p>
                  <span className="text-white/50">Fecha:</span> {match.date}
                </p>
              )}
              {match.court && (
                <p>
                  <span className="text-white/50">Pista:</span> {match.court}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Momentos clave</p>
            <div className="mt-4 space-y-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => handleChapterClick(chapter.startSeconds)}
                  className={`flex w-full items-start justify-between gap-4 rounded-2xl px-3 py-2 text-left transition ${
                    activeChapterId === chapter.id
                      ? "bg-white/10 text-white"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{chapter.title}</p>
                    {chapter.note && <p className="text-xs text-white/50">{chapter.note}</p>}
                  </div>
                  <span className="text-xs font-semibold text-white/60">
                    {formatTime(chapter.startSeconds)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">Resumen táctico</p>
          <p className="mt-2 text-base">
            Reproduce el análisis completo para ver la secuencia, las decisiones clave y la lectura
            de cada golpe dentro del punto.
          </p>
        </div>
      </PageShell>
    </main>
  )
}

export default Analysis
