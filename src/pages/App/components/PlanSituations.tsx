import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { PlanSituation } from "../../../lib/api/types"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard from "./ContentCard"

/**
 * Situaciones de "El plan del mes" (§Club) — acordeón de 2 a 4 situaciones, una abierta a la
 * vez. Cada una: qué reconocer y sus clips (con "Visto" y progreso). Arranca abierta la que
 * pida `initialOpenId` (enlace "Ver los clips de este foco" de Inicio, `?foco=`) o, si no, la
 * primera que aún tenga clips sin ver, para que quien vuelve a mitad de mes caiga donde lo dejó.
 */

const seenCount = (s: PlanSituation) => s.clips.filter((c) => c.completed).length

const SituationBody = ({ situation }: { situation: PlanSituation }) => {
  const { t, lang } = useI18n()
  return (
    <div className="space-y-5 px-4 pb-4 sm:px-5 sm:pb-5">
      <div>
        <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neon-cyan">{t("club.plan.recognize", "Qué reconocer")}</h4>
        <p className="text-sm leading-relaxed text-white/80">{pickText(situation.recognize, situation.recognizeEn ?? undefined, lang)}</p>
      </div>

      <CardRow cols="sm:grid-cols-3 lg:grid-cols-4">
        {situation.clips.map((clip) => (
          <ContentCard key={clip.id} item={clip} />
        ))}
      </CardRow>
    </div>
  )
}

const PlanSituations = ({ situations, initialOpenId }: { situations: PlanSituation[]; initialOpenId?: number }) => {
  const { t, lang } = useI18n()
  const initial =
    situations.find((s) => s.id === initialOpenId) ?? situations.find((s) => seenCount(s) < s.clips.length) ?? situations[0]
  const [openId, setOpenId] = useState<number | null>(initial?.id ?? null)

  return (
    <div className="space-y-3">
      {situations.map((s, i) => {
        const open = s.id === openId
        const seen = seenCount(s)
        const total = s.clips.length
        const done = total > 0 && seen === total
        return (
          <section key={s.id} className={`rounded-2xl border bg-white/[0.02] transition ${open ? "border-neon-cyan/30" : "border-white/10"}`}>
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-4 text-left sm:gap-4 sm:p-5"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  open || done ? "bg-neon-cyan text-midnight" : "border border-neon-cyan/40 text-neon-cyan"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-bold leading-snug text-white sm:text-lg">
                  {pickText(s.title, s.titleEn ?? undefined, lang)}
                </span>
                <span className="mt-2 flex items-center gap-3">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${total > 0 ? (seen / total) * 100 : 0}%` }} />
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-white/50">
                    {t("club.plan.progress", "{seen} de {total} vistos", { seen, total })}
                  </span>
                </span>
              </span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && <SituationBody situation={s} />}
          </section>
        )
      })}
    </div>
  )
}

export default PlanSituations
