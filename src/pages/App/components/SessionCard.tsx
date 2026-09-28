import { Link } from "react-router-dom"
import { Play } from "lucide-react"
import type { SessionSummary } from "../../../lib/api/types"
import { formatDuration, hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { Thumb } from "./ContentCard"
import WatchedBadge from "./WatchedBadge"

/**
 * Tarjeta de sesión — como ContentCard pero sin fila de conceptos (una sesión no los tiene).
 * Compartida entre Club.tsx (fila acotada) y SesionesArchivo.tsx (grid completo, §rediseño
 * Club/Coach).
 */
const SessionCard = ({ session }: { session: SessionSummary }) => {
  const { lang } = useI18n()
  return (
    <Link to={`/app/watch?s=${session.id}`} className="group block w-full cursor-pointer">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <Thumb src={session.thumbnailUrl} hue={hueFor(String(session.id))} className="aspect-video w-full" />
        {session.completed && <WatchedBadge />}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-4 w-4 text-white" fill="currentColor" />
          </span>
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(session.durationSeconds)}
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium leading-snug text-white">{pickText(session.title, session.titleEn, lang)}</p>
    </Link>
  )
}

export default SessionCard
