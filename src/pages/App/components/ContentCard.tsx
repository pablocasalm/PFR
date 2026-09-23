import { Link } from "react-router-dom"
import type { ContentItem } from "../../../lib/api/types"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"
import { pickText, pickList } from "../../../lib/i18n/content"
import SaveButton from "../../../lib/saved/SaveButton"
import WatchedBadge from "./WatchedBadge"
import EnglishBadge from "./EnglishBadge"

/** Tarjeta de contenido común (clip o análisis) — usada en Inicio, Club y donde haga falta una
 * fila de tarjetas estándar. Extraída de Inicio.tsx para no duplicarla (§Club hub, Fase 1). */

export const Thumb = ({ src, hue, className = "" }: { src?: string; hue: number; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`} style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
  </div>
)

export const TypeBadge = ({ type }: { type: ContentItem["type"] }) => {
  const { t } = useI18n()
  return type === "analysis" ? (
    <span className="rounded border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
      {t("content-card.type-analysis", "Análisis")}
    </span>
  ) : (
    <span className="rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
      {t("content-card.type-clip", "Clip")}
    </span>
  )
}

const ContentCard = ({ item, rank }: { item: ContentItem; rank?: number }) => {
  const { lang } = useI18n()
  const concepts = pickList(item.concepts, item.conceptsEn, lang)
  return (
    <Link to={watchHref(item)} className="group block w-full cursor-pointer">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-full" />
        {item.completed && <WatchedBadge />}
        {item.hasEnglishVersion && rank == null && <EnglishBadge />}
        {rank != null && (
          <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-neon-cyan text-sm font-bold text-midnight">
            {rank}
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(item.durationSeconds)}
        </span>
        <span className="absolute bottom-2 right-2">
          <SaveButton item={item} variant="icon" />
        </span>
      </div>
      <div className="mt-2.5">
        <TypeBadge type={item.type} />
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-white">{pickText(item.title, item.titleEn, lang)}</p>
      {item.type === "clip" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {concepts.slice(0, 3).map((c) => (
            <span key={c} className="text-[11px] text-neon-cyan/80">
              #{c}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

export default ContentCard
