import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { useI18n } from "../../../../lib/i18n/store"
import { downloadStarterTestCsv, getStarterTestSummary, type CountRow, type StarterTestSummary } from "../../../../lib/api/starterTest"
import { FREQUENCY, GAME, ORIGINS, PHRASES, PLAYTOMIC } from "../../../../lib/starterTestOptions"
import { Bars, ChartCard } from "./Bars"

/**
 * Gráficas de las respuestas del test inicial «¿Por dónde empiezo?» (panel → Encuestas). Cada
 * persona cuenta una vez (su última respuesta del periodo). Arriba, el embudo: cuántos lo
 * empiezan, lo terminan o lo dejan, y qué hacen después.
 */
const StarterTestCharts = () => {
  const { t, lang } = useI18n()
  const [days, setDays] = useState(0)
  const [excludeTeam, setExcludeTeam] = useState(true)
  const [data, setData] = useState<StarterTestSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sin `t` en las dependencias: cambia en cada render (ver AdminEncuestas).
  useEffect(() => {
    let cancelled = false
    getStarterTestSummary(days, excludeTeam)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudo cargar el resumen."))
    return () => {
      cancelled = true
    }
  }, [days, excludeTeam])

  /** Filas en el orden de las opciones del test, con su texto. */
  const rowsOf = (counts: CountRow[], options: { value: string; label: string }[]) =>
    options.map((o) => ({
      label: o.label,
      value: counts.find((c) => c.key === o.value)?.count ?? 0,
    }))

  const select = "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white sm:text-sm"
  const p = data?.people
  const pctOf = (v: number, base: number) => (base > 0 ? Math.round((100 * v) / base) : 0)
  const empty = t("admin-starter.empty", "Todavía no hay respuestas en este periodo.")

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={select} aria-label={t("admin-metrics.filter.period", "Periodo")}>
          <option value={7}>{t("admin-metrics.filter.7d", "Últimos 7 días")}</option>
          <option value={30}>{t("admin-metrics.filter.30d", "Últimos 30 días")}</option>
          <option value={0}>{t("admin-metrics.filter.all-time", "Desde el inicio")}</option>
        </select>
        <label className="mr-auto flex items-center gap-2 px-1 text-sm text-white/70">
          <input type="checkbox" checked={excludeTeam} onChange={(e) => setExcludeTeam(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
          {t("admin-metrics.filter.exclude-team", "Excluir cuentas del equipo")}
        </label>
        <button
          onClick={() => downloadStarterTestCsv().catch(() => setError(t("admin-surveys.export-error", "No se pudo exportar.")))}
          className="flex items-center gap-1.5 rounded-lg border border-neon-lime/30 px-3 py-2 text-sm font-semibold text-neon-lime/90 transition hover:text-neon-lime"
        >
          <Download className="h-4 w-4" />
          {t("admin-starter.export", "Todas las respuestas (CSV)")}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {!data && !error && <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>}

      {data && p && (
        <>
          {/* Resumen */}
          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: t("admin-starter.started", "Lo han empezado"),
                value: p.started,
              },
              {
                label: t("admin-starter.completed", "Lo han terminado"),
                value: p.completed,
                hint: `${pctOf(p.completed, p.started)}%`,
              },
              {
                label: t("admin-starter.abandoned", "Lo han dejado"),
                value: p.abandoned,
                hint: `${pctOf(p.abandoned, p.started)}%`,
              },
              {
                label: t("admin-starter.watched-clips", "Han ido a ver clips"),
                value: p.watchedClips,
                hint: `${pctOf(p.watchedClips, p.completed)}% ${t("admin-starter.of-completed", "de quienes lo terminan")}`,
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
            <ChartCard
              title={t("admin-starter.after", "Después del test")}
              hint={t("admin-starter.after-hint", "Personas distintas; el % es sobre quienes lo terminan.")}
            >
              <Bars
                total={p.completed}
                empty={empty}
                rows={[
                  {
                    label: t("admin-starter.after.clips", "Pulsan un concepto para ver sus clips"),
                    value: p.watchedClips,
                  },
                  {
                    label: t("admin-starter.after.explore", "Van a Explorar («No lo tengo claro»)"),
                    value: p.wentToExplore,
                  },
                ]}
              />
            </ChartCard>

            <ChartCard
              title={t("admin-starter.abandon-step", "Dónde lo dejan")}
              hint={t("admin-starter.abandon-hint", "Pregunta en la que salieron quienes no lo terminaron.")}
            >
              <Bars
                tone="bg-amber-400/70"
                empty={t("admin-starter.no-abandons", "Nadie lo ha dejado a medias.")}
                rows={["1", "2", "3"].map((step) => ({
                  label: t("admin-starter.question-n", "Pregunta {n}", {
                    n: step,
                  }),
                  value: data.abandonStep.find((c) => c.key === step)?.count ?? 0,
                }))}
              />
            </ChartCard>

            <ChartCard
              title={t("admin-starter.q3", "Qué les cuesta (pregunta 3)")}
              hint={t("admin-starter.q3-hint", "Pueden marcar hasta dos frases: el % es sobre las personas.")}
            >
              <Bars
                total={data.responses}
                empty={empty}
                rows={PHRASES.map((o) => ({
                  label: o.label(t),
                  value: data.phrases.find((c) => c.key === o.value)?.count ?? 0,
                })).sort((a, b) => b.value - a.value)}
              />
            </ChartCard>

            <ChartCard
              title={t("admin-starter.concepts", "Conceptos recomendados")}
              hint={t("admin-starter.concepts-hint", "Cuántas personas tienen cada concepto en «Conceptos para trabajar» por el test.")}
            >
              <Bars
                total={data.responses}
                empty={empty}
                rows={data.concepts.map((c) => ({
                  label: lang === "en" && c.nameEn ? c.nameEn : c.nameEs,
                  value: c.count,
                }))}
              />
            </ChartCard>

            <ChartCard title={t("admin-starter.q1", "Nivel de juego (pregunta 1)")}>
              <Bars
                empty={empty}
                rows={rowsOf(
                  data.gameLevel,
                  GAME.map((o) => ({ value: o.value, label: o.label(t) })),
                )}
              />
            </ChartCard>

            <ChartCard title={t("admin-starter.playtomic", "Nivel de Playtomic")}>
              <Bars
                empty={empty}
                rows={rowsOf(
                  data.playtomicLevel,
                  PLAYTOMIC.map((o) => ({
                    value: o.value,
                    label: lang === "en" ? o.en : o.es,
                  })),
                )}
              />
            </ChartCard>

            <ChartCard title={t("admin-starter.q2", "Partidos por semana (pregunta 2)")}>
              <Bars
                empty={empty}
                rows={rowsOf(
                  data.frequency,
                  FREQUENCY.map((o) => ({ value: o.value, label: o.label(t) })),
                )}
              />
            </ChartCard>

            <ChartCard title={t("admin-starter.origin", "Desde dónde lo empiezan")}>
              <Bars
                empty={empty}
                rows={rowsOf(
                  data.origin,
                  ORIGINS.map((o) => ({ value: o.value, label: o.label(t) })),
                )}
              />
            </ChartCard>

            <ChartCard title={t("admin-starter.language", "Idioma")}>
              <Bars
                empty={empty}
                rows={data.language.map((c) => ({
                  label: c.key === "en" ? "English" : c.key === "es" ? "Español" : c.key,
                  value: c.count,
                }))}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

export default StarterTestCharts
