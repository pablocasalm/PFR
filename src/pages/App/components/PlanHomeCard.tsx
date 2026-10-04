import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import type { PlanSituation } from "../../../lib/api/types"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard from "./ContentCard"

/**
 * "Recomendado para ti este mes" en Inicio (§El plan del mes): versión compacta del plan de
 * Club — una pestaña por situación (2 a 4), y debajo su título, qué reconocer y una fila con
 * sus primeros clips. El plan completo (progreso, todas las situaciones abiertas) vive en
 * /app/club; "Ver los N clips de este foco" lleva allí con esa situación ya abierta (`?foco=`).
 */

/** Cuántos clips caben en la fila de Inicio antes de mandar a Club a por el resto. */
const CLIPS_PREVIEW_COUNT = 5

const PlanHomeCard = ({ situations }: { situations: PlanSituation[] }) => {
  const { t, lang } = useI18n()
  const [activeId, setActiveId] = useState(situations[0].id)
  const active = situations.find((s) => s.id === activeId) ?? situations[0]

  return (
    <section className="rounded-2xl border border-neon-cyan/30 bg-neon-cyan/[0.04] p-4 sm:p-5">
      {/* Sin "Ver todo" arriba: el enlace "Ver los N clips de este foco" de abajo ya lleva a Club. */}
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
        {t("inicio.section.monthly-pick", "Recomendado para ti este mes")}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-white/70">
        {t("inicio.monthly-plan.intro", "{count} situaciones de la masterclass de este mes. Elige una y fíjate en qué se repite.", {
          count: situations.length,
        })}
      </p>

      {/* Pestañas: siempre a partes iguales (2 a 4 situaciones), con el texto partido en dos
          líneas si hace falta — en móvil una fila con scroll escondería la última situación. */}
      <div
        role="tablist"
        className="mb-5 grid gap-2 sm:flex sm:flex-wrap"
        style={{ gridTemplateColumns: `repeat(${situations.length}, minmax(0, 1fr))` }}
      >
        {situations.map((s) => {
          const selected = s.id === active.id
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(s.id)}
              className={`rounded-lg border px-2.5 py-2 text-xs font-semibold leading-tight transition sm:px-4 sm:text-sm ${
                selected
                  ? "border-neon-cyan/60 bg-neon-cyan/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white/80"
              }`}
            >
              {pickText(s.shortTitle, s.shortTitleEn ?? undefined, lang)}
            </button>
          )
        })}
      </div>

      <h3 className="font-display text-lg font-bold leading-snug text-white">{pickText(active.title, active.titleEn ?? undefined, lang)}</h3>
      <p className="mb-4 mt-1.5 max-w-3xl text-sm leading-relaxed text-white/70">
        {pickText(active.recognize, active.recognizeEn ?? undefined, lang)}
      </p>

      <CardRow>
        {active.clips.slice(0, CLIPS_PREVIEW_COUNT).map((clip) => (
          <ContentCard key={clip.id} item={clip} />
        ))}
      </CardRow>

      <Link
        to={`/app/club?foco=${active.id}`}
        className="mt-4 flex w-fit items-center gap-1.5 text-sm font-semibold text-neon-cyan transition hover:brightness-110"
      >
        {t("inicio.monthly-plan.see-clips", "Ver los {count} clips de este foco", { count: active.clips.length })}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  )
}

export default PlanHomeCard
