import { useEffect, useState } from "react"
import { useI18n } from "../../../../lib/i18n/store"
import { getMetricsInsights, type ContentStat, type KeyCount, type MetricsDays, type MetricsInsights as Insights } from "../../../../lib/api/metrics"
import { Bars, ChartCard, Columns } from "./Bars"

/**
 * Métricas v2 (panel → Métricas): actividad por día y contenido más visto, o la lista de espera,
 * según la pestaña. Las dos pestañas comparten los datos (una sola petición por filtro). No les
 * afectan la oleada ni el plan: solo el periodo y excluir las cuentas del equipo.
 */
const MetricsInsights = ({ view, days, excludeTeam }: { view: "activity" | "waitlist"; days: MetricsDays; excludeTeam: boolean }) => {
  const { t, lang } = useI18n()
  const [data, setData] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sin `t` en las dependencias: cambia en cada render (ver AdminEncuestas).
  useEffect(() => {
    let cancelled = false
    getMetricsInsights(days, excludeTeam)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas."))
    return () => {
      cancelled = true
    }
  }, [days, excludeTeam])

  const locale = lang === "en" ? "en-US" : "es-ES"
  const dayLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })
  const range =
    days === 0
      ? t("admin-insights.range-90", "Últimos 90 días. Toca una columna para ver su día.")
      : t("admin-insights.range", "Toca una columna para ver su día.")
  const pct = (v: number, base: number) => (base > 0 ? Math.round((100 * v) / base) : 0)

  if (error) return <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
  if (!data) return <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>

  if (view === "activity") {
    const { content } = data
    const contentRows = (items: ContentStat[]) =>
      items.map((c) => ({
        label: lang === "en" && c.titleEn ? c.titleEn : c.title,
        value: c.people,
        hint: t("admin-insights.content-hint", "{completed} lo terminan ({pct}%) · {minutes} min", {
          completed: c.completed,
          pct: pct(c.completed, c.people),
          minutes: c.minutes,
        }),
      }))
    const none = t("admin-insights.no-views", "Nadie lo ha visto en este periodo.")
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("admin-insights.people-per-day", "Personas que entran cada día")} hint={range}>
          <Columns
            points={data.daily.map((d) => ({ day: d.day, value: d.people }))}
            format={(v) => t("admin-insights.people-n", "{count} personas", { count: v })}
            dayLabel={dayLabel}
          />
        </ChartCard>
        <ChartCard title={t("admin-insights.minutes-per-day", "Minutos vistos cada día")} hint={range}>
          <Columns
            points={data.daily.map((d) => ({ day: d.day, value: d.minutes }))}
            format={(v) => t("admin-insights.minutes-n", "{count} min", { count: v })}
            dayLabel={dayLabel}
          />
        </ChartCard>
        <ChartCard
          title={t("admin-insights.top-analyses", "Análisis más vistos")}
          hint={t("admin-insights.top-hint", "Personas distintas que lo han visto; debajo, cuántas lo terminan.")}
        >
          <Bars rows={contentRows(content.analyses)} percent={false} total={Math.max(0, ...content.analyses.map((c) => c.people))} empty={none} />
        </ChartCard>
        <ChartCard
          title={t("admin-insights.top-clips", "Clips más vistos")}
          hint={t("admin-insights.top-hint", "Personas distintas que lo han visto; debajo, cuántas lo terminan.")}
        >
          <Bars rows={contentRows(content.clips)} percent={false} total={Math.max(0, ...content.clips.map((c) => c.people))} empty={none} />
        </ChartCard>
        <ChartCard title={t("admin-insights.top-sessions", "Masterclasses")}>
          <Bars rows={contentRows(content.sessions)} percent={false} total={Math.max(0, ...content.sessions.map((c) => c.people))} empty={none} />
        </ChartCard>
        <ChartCard
          title={t("admin-insights.top-concepts", "Conceptos más vistos")}
          hint={t("admin-insights.concepts-hint", "Personas distintas que han visto clips o análisis de cada concepto.")}
        >
          <Bars
            rows={content.concepts.map((c) => ({ label: lang === "en" && c.nameEn ? c.nameEn : c.nameEs, value: c.people }))}
            percent={false}
            total={Math.max(0, ...content.concepts.map((c) => c.people))}
            empty={none}
          />
        </ChartCard>
      </div>
    )
  }

  const w = data.waitlist
  const keyRows = (rows: KeyCount[], label: (key: string) => string = (k) => k) =>
    rows.map((r) => ({ label: r.key === "?" ? t("admin-insights.unknown", "Sin dato") : label(r.key), value: r.count }))
  const country = (code: string) => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code
    } catch {
      return code
    }
  }
  const empty = t("admin-insights.no-signups", "Nadie se ha apuntado en este periodo.")
  return (
    <div>
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("admin-insights.wl.total", "En la lista (total)"), value: w.total },
          { label: t("admin-insights.wl.period", "Se han apuntado en el periodo"), value: w.inPeriod },
          { label: t("admin-insights.wl.invited", "Invitados"), value: w.funnel.invited, hint: `${pct(w.funnel.invited, w.funnel.signedUp)}%` },
          {
            label: t("admin-insights.wl.activated", "Han creado la cuenta"),
            value: w.funnel.activated,
            hint: `${pct(w.funnel.activated, w.funnel.signedUp)}%`,
          },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs text-white/50">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{c.value}</p>
            {c.hint && <p className="mt-1 text-xs text-white/40">{c.hint}</p>}
          </div>
        ))}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("admin-insights.wl.per-day", "Altas por día")} hint={range}>
          <Columns
            points={w.daily.map((d) => ({ day: d.day, value: d.count }))}
            format={(v) => t("admin-insights.signups-n", "{count} altas", { count: v })}
            dayLabel={dayLabel}
          />
        </ChartCard>
        <ChartCard
          title={t("admin-insights.wl.funnel", "De la lista a la cuenta")}
          hint={t("admin-insights.wl.funnel-hint", "Quienes se apuntaron en el periodo: el % es sobre ellos.")}
        >
          <Bars
            total={w.funnel.signedUp}
            empty={empty}
            rows={[
              { label: t("admin-insights.wl.signed-up", "Se apuntan"), value: w.funnel.signedUp },
              { label: t("admin-insights.wl.confirmed", "Confirmados"), value: w.funnel.confirmed },
              { label: t("admin-insights.wl.invited", "Invitados"), value: w.funnel.invited },
              { label: t("admin-insights.wl.activated", "Han creado la cuenta"), value: w.funnel.activated },
            ]}
          />
        </ChartCard>
        <ChartCard
          title={t("admin-insights.wl.source", "De dónde vienen")}
          hint={t("admin-insights.wl.source-hint", "utm_source del enlace o, si no hay, el referido. «directo»: sin ninguno.")}
        >
          <Bars rows={keyRows(w.source, (k) => (k === "directo" ? t("admin-insights.wl.direct", "Directo") : k))} empty={empty} />
        </ChartCard>
        <ChartCard title={t("admin-insights.wl.country", "País")}>
          <Bars rows={keyRows(w.country, country)} empty={empty} />
        </ChartCard>
        <ChartCard title={t("admin-insights.wl.device", "Dispositivo")}>
          <Bars
            rows={keyRows(w.device, (k) =>
              k === "mobile"
                ? t("admin-insights.device.mobile", "Móvil")
                : k === "tablet"
                  ? t("admin-insights.device.tablet", "Tablet")
                  : k === "desktop"
                    ? t("admin-insights.device.desktop", "Ordenador")
                    : k,
            )}
            empty={empty}
          />
        </ChartCard>
        <ChartCard title={t("admin-insights.wl.language", "Idioma")}>
          <Bars rows={keyRows(w.language, (k) => (k === "en" ? "English" : k === "es" ? "Español" : k))} empty={empty} />
        </ChartCard>
      </div>
    </div>
  )
}

export default MetricsInsights
