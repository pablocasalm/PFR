import { useEffect, useState, type RefObject } from "react"

type SubtitleOption = "off" | "es" | "en"

type SubtitlePillsProps = {
  videoRef: RefObject<HTMLVideoElement>
  subtitlesEsUrl?: string
  subtitlesEnUrl?: string
  className?: string
}

const SubtitlePills = ({ videoRef, subtitlesEsUrl, subtitlesEnUrl, className = "" }: SubtitlePillsProps) => {
  const [subtitle, setSubtitle] = useState<SubtitleOption>("off")
  const hasSubtitles = Boolean(subtitlesEsUrl || subtitlesEnUrl)

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
  }, [subtitle, videoRef])

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
        Subtítulos
      </span>
      {hasSubtitles ? (
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-[11px] font-semibold text-white/70">
          {[
            { label: "Apagados", value: "off" },
            { label: "Español", value: "es" },
            { label: "Inglés", value: "en" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSubtitle(option.value as SubtitleOption)}
              className={`rounded-full px-3 py-1 transition-colors ${
                subtitle === option.value ? "bg-white text-midnight" : "hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <span className="text-[11px] text-white/40">Subtítulos no disponibles</span>
      )}
    </div>
  )
}

export default SubtitlePills
