import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"
import { useI18n } from "../../../../lib/i18n/store"
import { getAdminRatings, type AdminRating, type AdminRatingGroup, type AdminRatingsSummary } from "../../../../lib/api/ratings"
import { Bars, ChartCard } from "./Bars"

const PLAN_NAME: Record<string, string> = { Starter: "Essential", Club: "Club", Coach: "Coach" }

type StarsFilter = "all" | "happy" | "unhappy"

/**
 * Panel → Métricas → «Valoraciones»: valoración de la plataforma que se pide dentro de la app tras
 * unos días de uso. Media, reparto de 1 a 5, por plan y por estado de la cuenta, cuántos la han
 * visto sin responder, y los textos (con filtro por estrellas y por permiso de testimonio, y CSV).
 * No le afecta el periodo: son pocas y se miran todas.
 */
const MetricsRatings = ({ excludeTeam }: { excludeTeam: boolean }) => {
  const { t, lang } = useI18n()
  const [data, setData] = useState<{ summary: AdminRatingsSummary; items: AdminRating[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starsFilter, setStarsFilter] = useState<StarsFilter>("all")
  const [onlyConsent, setOnlyConsent] = useState(false)
  const [onlyComment, setOnlyComment] = useState(false)

  // Sin `t` en las dependencias: cambia en cada render (ver AdminEncuestas).
  useEffect(() => {
    let cancelled = false
    getAdminRatings(excludeTeam)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar las valoraciones."))
    return () => {
      cancelled = true
    }
  }, [excludeTeam])

  const items = useMemo(
    () =>
      (data?.items ?? []).filter(
        (r) =>
          (starsFilter === "all" || (starsFilter === "happy" ? r.stars >= 4 : r.stars <= 3))
          && (!onlyConsent || r.consentPublishText === true)
          && (!onlyComment || !!r.comment),
      ),
    [data, starsFilter, onlyConsent, onlyComment],
  )

  if (error) return <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
  if (!data) return <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>

  const { summary } = data
  const locale = lang === "en" ? "en-US" : "es-ES"
  const fmtAvg = (v: number | null) => (v == null ? "—" : v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }))
  const statusName = (k: string) =>
    ({
      trial: t("admin-users.filter.trial", "En prueba"),
      paying: t("admin-users.status.paying", "Pagando"),
      free: t("admin-users.status.free", "Gratis"),
      canceling: t("admin-users.filter.canceling", "Cancelando"),
      past_due: t("admin-users.status.past-due", "Pago pendiente"),
    })[k] ?? k
  const groupRows = (groups: AdminRatingGroup[], label: (k: string) => string) =>
    groups.map((g) => ({
      label: label(g.key),
      value: g.count,
      hint: t("admin-ratings.avg-hint", "Media {avg}", { avg: fmtAvg(g.average) }),
    }))

  const cards = [
    { label: t("admin-ratings.card.average", "Media"), value: fmtAvg(summary.average), hint: t("admin-ratings.card.of5", "de 5 estrellas") },
    { label: t("admin-ratings.card.count", "Valoraciones"), value: String(summary.count) },
    { label: t("admin-ratings.card.comments", "Con texto"), value: String(summary.withComment) },
    { label: t("admin-ratings.card.consent", "Testimonio permitido"), value: String(summary.consentText) },
    {
      label: t("admin-ratings.card.pending", "Vista sin responder"),
      value: String(summary.pending),
      hint: t("admin-ratings.card.pending-hint", "{snoozed} pulsaron «Más tarde»", { snoozed: summary.snoozed }),
    },
  ]

  const downloadCsv = () => {
    const header = ["fecha", "email", "nombre", "estrellas", "texto", "idioma", "plan", "estado", "dias_uso", "veces_mostrada", "publicar_texto", "publicar_nombre"]
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v)
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = items.map((r) =>
      [
        r.submittedAtUtc, r.email, r.displayName, r.stars, r.comment, r.language, PLAN_NAME[r.tier ?? ""] ?? r.tier,
        r.accountStatus, r.activeDays, r.timesShown, r.consentPublishText, r.consentPublishName,
      ].map(esc).join(";"),
    )
    // Separado por ";" y con BOM, como el CSV de las encuestas, para que Excel en español lo abra bien.
    const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "valoraciones.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const select = "rounded-lg border border-white/15 bg-midnight px-3 py-2 text-base text-white sm:text-sm"

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs text-white/50">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white">{c.value}</p>
            {c.hint && <p className="mt-1 text-xs text-white/40">{c.hint}</p>}
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t("admin-ratings.chart.distribution", "Reparto")}>
          <Bars
            rows={[...summary.distribution].reverse().map((d) => ({ label: "★".repeat(d.stars), value: d.count }))}
            tone="bg-neon-lime/70"
            empty={t("admin-ratings.empty", "Todavía no hay valoraciones.")}
          />
        </ChartCard>
        <ChartCard title={t("admin-ratings.chart.by-plan", "Por plan")}>
          <Bars rows={groupRows(summary.byTier, (k) => PLAN_NAME[k] ?? k)} empty={t("admin-ratings.empty", "Todavía no hay valoraciones.")} />
        </ChartCard>
        <ChartCard title={t("admin-ratings.chart.by-status", "Prueba o pago")}>
          <Bars rows={groupRows(summary.byStatus, statusName)} empty={t("admin-ratings.empty", "Todavía no hay valoraciones.")} />
        </ChartCard>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base font-bold text-white">{t("admin-ratings.list.title", "Lo que nos dicen")}</h2>
          <select value={starsFilter} onChange={(e) => setStarsFilter(e.target.value as StarsFilter)} className={select} aria-label={t("admin-ratings.filter.stars", "Estrellas")}>
            <option value="all">{t("admin-ratings.filter.all", "Todas las estrellas")}</option>
            <option value="happy">{t("admin-ratings.filter.happy", "4-5 estrellas")}</option>
            <option value="unhappy">{t("admin-ratings.filter.unhappy", "1-3 estrellas")}</option>
          </select>
          <label className="flex items-center gap-2 px-1 text-sm text-white/70">
            <input type="checkbox" checked={onlyComment} onChange={(e) => setOnlyComment(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
            {t("admin-ratings.filter.comment", "Con texto")}
          </label>
          <label className="flex items-center gap-2 px-1 text-sm text-white/70">
            <input type="checkbox" checked={onlyConsent} onChange={(e) => setOnlyConsent(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
            {t("admin-ratings.filter.consent", "Testimonio permitido")}
          </label>
          <button
            onClick={downloadCsv}
            disabled={items.length === 0}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-40"
          >
            {t("admin-ratings.csv", "Descargar CSV")}
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-ratings.empty", "Todavía no hay valoraciones.")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex" aria-label={t("rating.star-aria", "{n} de 5 estrellas", { n: r.stars })}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= r.stars ? "fill-neon-lime text-neon-lime" : "text-white/20"}`} />
                    ))}
                  </span>
                  <span className="min-w-0 break-all text-sm font-semibold text-white">{r.displayName || r.email}</span>
                  {r.displayName && <span className="min-w-0 break-all text-xs text-white/40">{r.email}</span>}
                  {r.isTeam && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/60">{t("admin-ratings.team", "Equipo")}</span>}
                </div>
                {r.comment && <p className="mt-2 whitespace-pre-line text-sm text-white/85">{r.comment}</p>}
                <p className="mt-2 text-xs text-white/40">
                  {[
                    new Date(r.submittedAtUtc).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
                    PLAN_NAME[r.tier ?? ""] ?? r.tier,
                    r.accountStatus && statusName(r.accountStatus),
                    r.activeDays != null && t("admin-ratings.active-days", "{n} días de uso", { n: r.activeDays }),
                    r.timesShown > 1 && t("admin-ratings.times-shown", "a la {n}.ª vez", { n: r.timesShown }),
                    r.language === "en" ? "EN" : "ES",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {r.consentPublishText != null && (
                  <p className={`mt-1 text-xs font-medium ${r.consentPublishText ? "text-neon-cyan" : "text-white/40"}`}>
                    {r.consentPublishText
                      ? r.consentPublishName
                        ? t("admin-ratings.consent.name", "Se puede publicar, con su nombre")
                        : t("admin-ratings.consent.text", "Se puede publicar, sin nombre")
                      : t("admin-ratings.consent.no", "No quiere que se publique")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default MetricsRatings
