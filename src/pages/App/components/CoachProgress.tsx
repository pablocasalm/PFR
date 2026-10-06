import type { PersonalAnalysisItem, PriorityResult } from "../../../lib/api/types"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { ResultBadge } from "./CoachAnalysis"
import { useResultLabels } from "./coachResultLabels"

/**
 * "Tu progreso" de la pantalla Coach: lo que se puede medir con lo que ya se guarda — el
 * seguimiento que anota el alumno en cada prioridad, la revisión de Guille en el análisis
 * siguiente y el bloque/conceptos con que se etiqueta cada prioridad.
 *
 * `current` es el último análisis entregado (el del mes en curso) y `history` los anteriores,
 * del más reciente al más antiguo. Los entregados antes de la ficha (texto libre, sin
 * prioridades) solo cuentan como análisis recibidos.
 */

const BAR: Record<PriorityResult, string> = { done: "bg-neon-lime", partial: "bg-amber-400", missed: "bg-red-400" }
const RESULTS: PriorityResult[] = ["done", "partial", "missed"]

const Stat = ({ value, label, hint }: { value: string; label: string; hint?: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
    <p className="font-display text-3xl font-bold tabular-nums text-white">{value}</p>
    <p className="mt-1 text-xs font-medium leading-snug text-white/60">{label}</p>
    {hint && <p className="mt-0.5 text-[11px] leading-snug text-white/40">{hint}</p>}
  </div>
)

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-4">
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{title}</p>
    {children}
  </div>
)

const CoachProgress = ({ current, history }: { current: PersonalAnalysisItem; history: PersonalAnalysisItem[] }) => {
  const { t, lang } = useI18n()
  const labels = useResultLabels()
  const all = [current, ...history]
  const priorities = current.priorities ?? []

  // --- Este mes: lo anotado por el alumno ---
  const monthLogs = priorities.flatMap((p) => p.logs)
  const matches = new Set(monthLogs.map((l) => l.matchDate.slice(0, 10))).size
  const doneLogs = monthLogs.filter((l) => l.result === "done").length

  // --- Mes a mes: revisión de Guille ---
  const reviewed = history.flatMap((a) => a.priorities ?? []).filter((p) => p.reviewResult)
  const achieved = reviewed.filter((p) => p.reviewResult === "done").length

  // --- En qué se ha trabajado: bloques y conceptos de todas las prioridades ---
  const everyPriority = all.flatMap((a) => a.priorities ?? [])
  const count = (names: string[]) => {
    const map = new Map<string, number>()
    names.forEach((n) => map.set(n, (map.get(n) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }
  const blocks = count(everyPriority.filter((p) => p.block).map((p) => pickText(p.block!, p.blockEn ?? undefined, lang)))
  const concepts = count(everyPriority.flatMap((p) => p.concepts.map((c) => pickText(c.name, c.nameEn, lang)))).slice(0, 8)
  const maxBlock = blocks[0]?.[1] ?? 1

  const month = (iso?: string | null) => {
    if (!iso) return ""
    const name = new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long" })
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const withSheet = all.filter((a) => (a.priorities ?? []).length > 0)

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{t("coach.progress.title", "Tu progreso")}</h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={String(all.length)} label={t("coach.progress.analyses", "Análisis recibidos")} />
        <Stat value={String(matches)} label={t("coach.progress.matches", "Partidos anotados este mes")} />
        <Stat
          value={monthLogs.length > 0 ? `${Math.round((doneLogs / monthLogs.length) * 100)}%` : "—"}
          label={t("coach.progress.done-rate", "De las veces, lo hiciste")}
          hint={monthLogs.length > 0 ? t("coach.progress.done-rate-hint", "{done} de {total} anotaciones", { done: doneLogs, total: monthLogs.length }) : undefined}
        />
        <Stat
          value={reviewed.length > 0 ? `${achieved}/${reviewed.length}` : "—"}
          label={t("coach.progress.achieved", "Prioridades conseguidas")}
          hint={reviewed.length > 0 ? t("coach.progress.achieved-hint", "Según la revisión de Guille") : t("coach.progress.achieved-empty", "Se revisan en tu siguiente análisis")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Este mes, prioridad a prioridad */}
        {priorities.length > 0 && (
          <Card title={t("coach.progress.this-month", "Este mes, prioridad a prioridad")}>
            <ul className="space-y-4">
              {priorities.map((p, i) => {
                const counts = RESULTS.map((r) => p.logs.filter((l) => l.result === r).length)
                const total = p.logs.length
                return (
                  <li key={p.id}>
                    <p className="flex gap-2 text-sm font-medium leading-snug text-white">
                      <span className="shrink-0 font-bold tabular-nums text-neon-cyan">{i + 1}</span>
                      <span className="min-w-0">{p.title}</span>
                    </p>
                    {total === 0 ? (
                      <p className="mt-1.5 text-xs text-white/40">{t("coach.progress.no-logs", "Todavía no has anotado ningún partido.")}</p>
                    ) : (
                      <>
                        <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/10">
                          {RESULTS.map((r, k) => counts[k] > 0 && <span key={r} className={BAR[r]} style={{ width: `${(counts[k] / total) * 100}%` }} />)}
                        </div>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/55">
                          {RESULTS.map(
                            (r, k) =>
                              counts[k] > 0 && (
                                <span key={r} className="flex items-center gap-1">
                                  <span className={`h-1.5 w-1.5 rounded-full ${BAR[r]}`} />
                                  {labels.student[r]} · {counts[k]}
                                </span>
                              ),
                          )}
                        </p>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {/* En qué has trabajado */}
        {blocks.length > 0 && (
          <Card title={t("coach.progress.blocks", "En qué has trabajado")}>
            <ul className="space-y-2.5">
              {blocks.map(([name, n]) => (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate text-white/80 sm:w-36">{name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-neon-cyan" style={{ width: `${(n / maxBlock) * 100}%` }} />
                  </span>
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-white/55">{n}</span>
                </li>
              ))}
            </ul>
            {concepts.length > 0 && (
              <p className="mt-4 flex flex-wrap gap-1.5">
                {concepts.map(([name, n]) => (
                  <span key={name} className="rounded-full border border-neon-cyan/25 bg-neon-cyan/[0.06] px-2.5 py-1 text-xs text-neon-cyan/90">
                    #{name}
                    {n > 1 && <span className="ml-1 text-white/45">×{n}</span>}
                  </span>
                ))}
              </p>
            )}
          </Card>
        )}
      </div>

      {/* Mes a mes: cómo quedó cada prioridad en la revisión del análisis siguiente */}
      {withSheet.length > 1 && (
        <Card title={t("coach.progress.timeline", "Mes a mes")}>
          <ul className="divide-y divide-white/5">
            {withSheet.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
                <p className="w-28 shrink-0 text-sm font-semibold text-white">{month(a.deliveredAtUtc)}</p>
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {(a.priorities ?? []).map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3 text-sm text-white/75">
                      <span className="min-w-0">{p.title}</span>
                      {p.reviewResult ? (
                        <ResultBadge result={p.reviewResult} label={labels.review[p.reviewResult]} />
                      ) : (
                        <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/50">
                          {a.id === current.id ? t("coach.progress.in-progress", "En curso") : t("coach.progress.not-reviewed", "Sin revisar")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

export default CoachProgress
