import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, CreditCard } from "lucide-react"
import { getBillingPlans, createCheckoutSession, type BillingPlans, type BillingInterval } from "../../../lib/api/billing"
import { Skeleton } from "../../../lib/ui/Skeleton"
import { useI18n, type TFunc } from "../../../lib/i18n/store"

/**
 * Pantalla de precios / paywall. Un único plan (sin tiers) — el precio real por país viene de
 * GET /api/billing/plans (país resuelto por IP en el backend, no elegido por el cliente).
 */

const features = (t: TFunc) => [
  t("precios.feature.catalog", "Todo el catálogo de análisis y clips tácticos"),
  t("precios.feature.english", "Vídeo y subtítulos en inglés incluidos (traducción con IA)"),
  t("precios.feature.mi-lista", "Mi Lista, Mi Juego e historial de visionado"),
  t("precios.feature.new-content", "Nuevo contenido cada semana"),
]

const intervalLabel = (t: TFunc): Record<BillingInterval, string> => ({
  Monthly: t("precios.interval.monthly", "Mensual"),
  Yearly: t("precios.interval.yearly", "Anual"),
})

const currencyFormat = (amount: number, currency: string, lang: string) =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", { style: "currency", currency }).format(amount)

const Precios = () => {
  const { t, lang } = useI18n()
  const FEATURES = features(t)
  const intervalLabels = intervalLabel(t)
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<BillingPlans | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [interval, setInterval] = useState<BillingInterval>("Monthly")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    getBillingPlans()
      .then(setPlans)
      .catch((err) => setLoadError(err instanceof Error ? err.message : t("precios.error.load", "No se pudieron cargar los precios.")))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const price = plans?.prices.find((p) => p.interval === interval)

  const subscribe = async () => {
    if (checkoutLoading) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const { url } = await createCheckoutSession(interval)
      window.location.href = url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t("precios.error.checkout", "No se pudo iniciar el pago."))
      setCheckoutLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("precios.title", "Suscripción")}</h1>
          <p className="text-sm text-white/60">{t("precios.subtitle", "Acceso completo a Padel Film Room.")}</p>
        </div>
      </div>

      {searchParams.get("checkout") === "cancelled" && (
        <p className="mb-6 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          {t("precios.cancelled", "Has cancelado el pago. Puedes intentarlo de nuevo cuando quieras.")}
        </p>
      )}
      {loadError && <p className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>}

      {/* Mensual / Anual */}
      <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        {(["Monthly", "Yearly"] as BillingInterval[]).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setInterval(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              interval === i ? "bg-neon-cyan text-midnight" : "text-white/60 hover:text-white"
            }`}
          >
            {intervalLabels[i]}
          </button>
        ))}
      </div>

      {!plans && !loadError ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <div className="rounded-2xl border border-neon-cyan/40 bg-neon-cyan/[0.06] p-6">
          <p className="mb-1 text-2xl font-bold text-white">
            {price ? (
              <>
                {currencyFormat(price.displayAmount, price.currency, lang)}
                <span className="text-sm font-normal text-white/50"> / {intervalLabels[interval].toLowerCase()}</span>
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mb-5 text-sm text-white/60">{t("precios.cancel-anytime", "Cancela cuando quieras, sin permanencia.")}</p>
          <ul className="space-y-2.5 text-sm text-white/80">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-lime" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkoutError && <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{checkoutError}</p>}

      <button
        type="button"
        onClick={subscribe}
        disabled={!plans || checkoutLoading}
        className="mt-6 w-full rounded-lg bg-neon-cyan px-5 py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checkoutLoading ? t("precios.opening-checkout", "Abriendo pago...") : t("precios.subscribe", "Suscribirme")}
      </button>
    </main>
  )
}

export default Precios
