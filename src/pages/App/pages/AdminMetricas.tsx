import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BarChart3 } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { getAdminMetrics, type AdminMetrics, type MetricsDays, type MetricsFilters, type MetricsPerson } from "../../../lib/api/metrics"

/**
 * AdminMetricas — panel de métricas internas, v1 (solo Admin): filtros, resumen en cifras y una
 * fila por persona. Con los pocos usuarios de la beta, la tabla de personas es lo más útil:
 * deja ver a quién escribir antes de que termine su prueba («en riesgo» = lleva 3 días o más sin
 * entrar). Las cuentas del equipo (noreply@, prueba@) se excluyen por defecto en el servidor.
 */

type SortKey = "risk" | "lastActive" | "minutes" | "activeDays" | "trialDay"

const toDate = (iso: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)

const fmtDay = (iso: string | null, lang: string) =>
  iso ? toDate(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short" }) : "—"

/** "17 oct" a partir de "2026-10-17" (la oleada viene ya como día de Madrid). */
const fmtWave = (date: string, lang: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short" })

const AdminMetricas = () => {
  const { t, lang } = useI18n()
  const [filters, setFilters] = useState<MetricsFilters>({ days: 7, wave: "all", tier: "all", excludeTeam: true })
  const [data, setData] = useState<AdminMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>("risk")

  // Solo al entrar y al cambiar un filtro (`t` no va en las dependencias: ver AdminEncuestas).
  useEffect(() => {
    let cancelled = false
    getAdminMetrics(filters)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas."))
    return () => {
      cancelled = true
    }
  }, [filters])

  const people = useMemo(() => {
    const list = [...(data?.people ?? [])]
    const last = (p: MetricsPerson) => (p.lastActiveAtUtc ? toDate(p.lastActiveAtUtc).getTime() : 0)
    const by: Record<SortKey, (a: MetricsPerson, b: MetricsPerson) => number> = {
      risk: (a, b) => Number(b.atRisk) - Number(a.atRisk) || last(a) - last(b),
      lastActive: (a, b) => last(b) - last(a),
      minutes: (a, b) => b.minutes - a.minutes,
      activeDays: (a, b) => b.activeDays - a.activeDays,
      trialDay: (a, b) => (b.trialDay ?? -1) - (a.trialDay ?? -1),
    }
    return list.sort(by[sort])
  }, [data, sort])

  const set = <K extends keyof MetricsFilters>(key: K, value: MetricsFilters[K]) => setFilters((f) => ({ ...f, [key]: value }))

  const tierLabel = (tier: string) => ({ Starter: "Essential", Club: "Club", Coach: "Coach" })[tier] ?? tier
  const surveyLabel = (id: string) =>
    id === "d4" ? t("admin-metrics.survey.d4", "Día 4") : id === "d12" ? t("admin-metrics.survey.d12", "Día 12") : null

  const statusLabel = (p: MetricsPerson) => {
    if (p.status === "Active" || p.status === "PastDue") return t("admin-metrics.status.paying", "De pago")
    if (p.trialDay != null) return t("admin-metrics.status.trial", "Prueba · día {day}/14", { day: p.trialDay })
    if (p.planType === "Free") return t("admin-metrics.status.free", "Gratis")
    if (!p.hasAccess) return t("admin-metrics.status.no-access", "Sin acceso")
    return p.status
  }

  const s = data?.summary
  const comparable = filters.days !== 0
  const delta = (now: number, before: number | null | undefined) => {
    if (before == null) return null
    const d = now - before
    if (d === 0) return { text: "=", tone: "text-white/40" }
    return { text: `${d > 0 ? "+" : ""}${d}`, tone: d > 0 ? "text-neon-lime" : "text-red-300" }
  }

  const cards = s
    ? [
        { label: t("admin-metrics.card.access", "Con acceso"), value: String(s.withAccess), delta: null },
        { label: t("admin-metrics.card.trialing", "En prueba"), value: String(s.trialing), delta: null },
        { label: t("admin-metrics.card.paying", "De pago"), value: String(s.paying), delta: null },
        { label: t("admin-metrics.card.active", "Activos (7 días)"), value: String(s.active7), delta: delta(s.active7, s.active7Previous) },
        {
          label: t("admin-metrics.card.minutes", "Minutos vistos"),
          value: String(s.minutes),
          delta: comparable ? delta(s.minutes, s.minutesPrevious) : null,
        },
        {
          label: t("admin-metrics.card.conversion", "Prueba → pago"),
          value: s.conversionBase > 0 ? `${Math.round((100 * s.conversionConverted) / s.conversionBase)}%` : "—",
          hint:
            s.conversionBase > 0
              ? t("admin-metrics.card.conversion-of", "{converted} de {base}", { converted: s.conversionConverted, base: s.conversionBase })
              : t("admin-metrics.card.conversion-none", "Ninguna prueba ha terminado"),
          delta: null,
        },
      ]
    : []

  const select = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white sm:text-sm"

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-metrics.title", "Métricas")}</h1>
          <p className="text-sm text-white/60">
            {data
              ? t("admin-metrics.subtitle", "{count} personas · actualizado {time}", {
                  count: data.people.length,
                  time: toDate(data.generatedAtUtc).toLocaleTimeString(lang === "en" ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" }),
                })
              : t("common.loading", "Cargando...")}
          </p>
        </div>
      </div>

      {/* Filtros: afectan a todo el panel. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={filters.days} onChange={(e) => set("days", Number(e.target.value) as MetricsDays)} className={select} aria-label={t("admin-metrics.filter.period", "Periodo")}>
          <option value={7}>{t("admin-metrics.filter.7d", "Últimos 7 días")}</option>
          <option value={30}>{t("admin-metrics.filter.30d", "Últimos 30 días")}</option>
          <option value={0}>{t("admin-metrics.filter.all-time", "Desde el inicio")}</option>
        </select>
        <select value={filters.wave} onChange={(e) => set("wave", e.target.value)} className={select} aria-label={t("admin-metrics.filter.wave", "Oleada")}>
          <option value="all">{t("admin-metrics.filter.all-waves", "Todas las oleadas")}</option>
          {data?.waves.map((w) => (
            <option key={w.date} value={w.date}>
              {t("admin-metrics.filter.wave-of", "Oleada del {date} ({count})", { date: fmtWave(w.date, lang), count: w.invited })}
            </option>
          ))}
        </select>
        <select value={filters.tier} onChange={(e) => set("tier", e.target.value)} className={select} aria-label={t("admin-metrics.filter.plan", "Plan")}>
          <option value="all">{t("admin-metrics.filter.all-plans", "Todos los planes")}</option>
          <option value="Starter">Essential</option>
          <option value="Club">Club</option>
          <option value="Coach">Coach</option>
        </select>
        <label className="flex items-center gap-2 px-1 text-sm text-white/70">
          <input type="checkbox" checked={filters.excludeTeam} onChange={(e) => set("excludeTeam", e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
          {t("admin-metrics.filter.exclude-team", "Excluir cuentas del equipo")}
        </label>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {/* Resumen */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs text-white/50">{c.label}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-white">{c.value}</span>
              {c.delta && <span className={`text-xs font-semibold ${c.delta.tone}`}>{c.delta.text}</span>}
            </p>
            {"hint" in c && c.hint && <p className="mt-1 text-xs text-white/40">{c.hint}</p>}
          </div>
        ))}
      </section>
      {s && (
        <p className="-mt-5 mb-8 text-xs text-white/40">
          {t(
            "admin-metrics.active-help",
            "Activo: en 7 días ha visto un análisis, tres clips o una masterclass, o ha usado Coach. La cifra pequeña compara con el periodo anterior.",
          )}
        </p>
      )}

      {/* Embudo de la oleada */}
      {data && (
        <section className="mb-10 max-w-3xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-white/60">{t("admin-metrics.funnel", "Embudo de la beta")}</h2>
          <p className="mb-4 text-xs text-white/40">
            {filters.wave === "all"
              ? t("admin-metrics.funnel.all-waves", "Todas las oleadas. No le afectan el periodo ni el plan.")
              : t("admin-metrics.funnel.one-wave", "Oleada del {date}. No le afectan el periodo ni el plan.", { date: fmtWave(filters.wave, lang) })}
          </p>
          <Funnel
            total={data.funnel.invited}
            ofPrevious={(pct) => t("admin-metrics.funnel.of-previous", "{pct}% del paso anterior", { pct })}
            steps={[
              { label: t("admin-metrics.funnel.invited", "Invitados"), value: data.funnel.invited },
              {
                label: t("admin-metrics.funnel.activated", "Han creado la contraseña"),
                value: data.funnel.activated,
                hint: data.funnel.expired > 0 ? t("admin-metrics.funnel.expired", "{count} invitaciones caducadas", { count: data.funnel.expired }) : undefined,
              },
              { label: t("admin-metrics.funnel.watched", "Han visto algo"), value: data.funnel.watched },
              { label: t("admin-metrics.funnel.active-week1", "Activos en su primera semana"), value: data.funnel.activeWeek1 },
              {
                label: t("admin-metrics.funnel.survey-d4", "Encuesta del día 4"),
                value: data.funnel.surveyD4,
                hint: t("admin-metrics.funnel.sent", "de {count} enviadas", { count: data.funnel.surveyD4Sent }),
                chain: false,
              },
              {
                label: t("admin-metrics.funnel.survey-d12", "Encuesta del día 12"),
                value: data.funnel.surveyD12,
                hint: t("admin-metrics.funnel.sent", "de {count} enviadas", { count: data.funnel.surveyD12Sent }),
                chain: false,
              },
              { label: t("admin-metrics.funnel.paid", "Han pagado"), value: data.funnel.paid, chain: false },
            ]}
          />
        </section>
      )}

      {/* Personas */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-bold uppercase tracking-wide text-white/60">{t("admin-metrics.people", "Personas")}</h2>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={select} aria-label={t("admin-metrics.sort", "Ordenar")}>
            <option value="risk">{t("admin-metrics.sort.risk", "En riesgo primero")}</option>
            <option value="lastActive">{t("admin-metrics.sort.last-active", "Último acceso")}</option>
            <option value="minutes">{t("admin-metrics.sort.minutes", "Más minutos")}</option>
            <option value="activeDays">{t("admin-metrics.sort.active-days", "Más días activos")}</option>
            <option value="trialDay">{t("admin-metrics.sort.trial-day", "Día de prueba")}</option>
          </select>
        </div>

        {data && people.length === 0 && <p className="text-sm text-white/40">{t("admin-metrics.empty", "Nadie con estos filtros.")}</p>}

        {/* Móvil: una tarjeta por persona. */}
        <ul className="space-y-2 md:hidden">
          {people.map((p) => (
            <li key={p.userId} className={`rounded-xl border p-3 ${p.atRisk ? "border-amber-400/40 bg-amber-400/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-semibold text-white">{p.displayName || p.email}</p>
                {p.atRisk && <RiskBadge label={t("admin-metrics.at-risk", "En riesgo")} />}
              </div>
              {p.displayName && <p className="break-all text-xs text-white/50">{p.email}</p>}
              <p className="mt-2 text-xs text-white/70">
                {statusLabel(p)} · {tierLabel(p.tier)}
                {p.wave && ` · ${t("admin-metrics.wave-short", "oleada {date}", { date: fmtWave(p.wave, lang) })}`}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {t("admin-metrics.row.summary", "Último acceso {last} · días activos: {days} · {minutes} min", {
                  last: fmtDay(p.lastActiveAtUtc, lang),
                  days: p.activeDays,
                  minutes: p.minutes,
                })}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {t("admin-metrics.col.surveys", "Encuestas")}: {p.surveys.map(surveyLabel).filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ul>

        {/* Escritorio: tabla. */}
        <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/50">
              <tr>
                <th className="px-3 py-2 font-semibold">{t("admin-metrics.col.person", "Persona")}</th>
                <th className="px-3 py-2 font-semibold">{t("admin-metrics.col.wave", "Oleada")}</th>
                <th className="px-3 py-2 font-semibold">{t("admin-metrics.col.status", "Estado")}</th>
                <th className="px-3 py-2 font-semibold">{t("admin-metrics.col.last-active", "Último acceso")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("admin-metrics.col.active-days", "Días activos")}</th>
                <th className="px-3 py-2 text-right font-semibold">{t("admin-metrics.col.minutes", "Minutos")}</th>
                <th className="px-3 py-2 font-semibold">{t("admin-metrics.col.surveys", "Encuestas")}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.userId} className={`border-t border-white/5 ${p.atRisk ? "bg-amber-400/[0.04]" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="flex items-center gap-2 font-semibold text-white">
                      {p.displayName || p.email}
                      {p.atRisk && <RiskBadge label={t("admin-metrics.at-risk", "En riesgo")} />}
                    </p>
                    {p.displayName && <p className="text-xs text-white/50">{p.email}</p>}
                  </td>
                  <td className="px-3 py-2 text-white/70">{p.wave ? fmtWave(p.wave, lang) : "—"}</td>
                  <td className="px-3 py-2 text-white/70">
                    {statusLabel(p)} <span className="text-white/40">· {tierLabel(p.tier)}</span>
                  </td>
                  <td className="px-3 py-2 text-white/70">{fmtDay(p.lastActiveAtUtc, lang)}</td>
                  <td className="px-3 py-2 text-right text-white/70">{p.activeDays}</td>
                  <td className="px-3 py-2 text-right text-white/70">{p.minutes}</td>
                  <td className="px-3 py-2 text-white/70">{p.surveys.map(surveyLabel).filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && people.length > 0 && (
          <p className="mt-2 text-xs text-white/40">
            {t("admin-metrics.people-help", "Días activos y minutos son del periodo elegido. En riesgo: tiene acceso y lleva 3 días o más sin entrar.")}
          </p>
        )}
      </section>
    </main>
  )
}

/** Barras horizontales: cada paso con su número, el % sobre los invitados y, en los pasos que van
 * en cadena, el % sobre el anterior (lo que más dice: dónde se pierde la gente). */
const Funnel = ({
  total,
  steps,
  ofPrevious,
}: {
  total: number
  steps: { label: string; value: number; hint?: string; chain?: boolean }[]
  ofPrevious: (pct: number) => string
}) => {
  const pct = (v: number, base: number) => (base > 0 ? Math.round((100 * v) / base) : 0)
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        // Las encuestas y el pago no siguen al paso anterior (se cuentan sobre otra base): sin ese %.
        const prev = i > 0 && step.chain !== false ? steps[i - 1].value : null
        return (
          <li key={step.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-white/80">{step.label}</span>
              <span className="shrink-0 text-white">
                <span className="font-semibold">{step.value}</span>
                {i > 0 && total > 0 && <span className="ml-2 text-xs text-white/40">{pct(step.value, total)}%</span>}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-neon-cyan/70" style={{ width: `${total > 0 ? Math.max(pct(step.value, total), step.value > 0 ? 2 : 0) : 0}%` }} />
            </div>
            {(step.hint || (prev != null && prev > 0)) && (
              <p className="mt-1 text-xs text-white/40">
                {[prev != null && prev > 0 ? ofPrevious(pct(step.value, prev)) : null, step.hint].filter(Boolean).join(" · ")}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

const RiskBadge = ({ label }: { label: string }) => (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
    <AlertTriangle className="h-3 w-3" />
    {label}
  </span>
)

export default AdminMetricas
