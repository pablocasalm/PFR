import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, CreditCard } from "lucide-react"
import { getBillingPlans, createCheckoutSession, type BillingPlans, type BillingInterval } from "../../../lib/api/billing"
import type { SubscriptionTier } from "../../../lib/auth/store"
import { Skeleton } from "../../../lib/ui/Skeleton"

/**
 * Pantalla de precios / paywall. Los tiers y qué pestaña sugerir por defecto vienen de
 * GET /api/billing/plans (país resuelto por IP en el backend) — el usuario puede elegir
 * cualquiera de los dos tiers igualmente, la sugerencia no bloquea nada.
 */

const TIER_INFO: Record<SubscriptionTier, { title: string; description: string; features: string[] }> = {
  Standard: {
    title: "Estándar",
    description: "Todo el catálogo de PFR en español.",
    features: ["Todos los análisis y clips", "Mi Lista, Mi Juego e historial", "Nuevo contenido cada semana"],
  },
  Global: {
    title: "Global",
    description: "Lo mismo que Estándar, con el catálogo traducido al inglés.",
    features: ["Todo lo del plan Estándar", "Análisis y clips también en inglés", "Ideal si el español no es tu idioma"],
  },
}

const intervalLabel: Record<BillingInterval, string> = { Monthly: "Mensual", Yearly: "Anual" }

const currencyFormat = (amount: number, currency: string) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount)

const Precios = () => {
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<BillingPlans | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null)
  const [interval, setInterval] = useState<BillingInterval>("Monthly")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => {
    getBillingPlans()
      .then((res) => {
        setPlans(res)
        setSelectedTier(res.suggestedTier)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los precios."))
  }, [])

  const priceFor = (tier: SubscriptionTier) => plans?.prices.find((p) => p.tier === tier && p.interval === interval)

  const subscribe = async () => {
    if (!selectedTier || checkoutLoading) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const { url } = await createCheckoutSession(selectedTier, interval)
      window.location.href = url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "No se pudo iniciar el pago.")
      setCheckoutLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Planes</h1>
          <p className="text-sm text-white/60">Elige el plan que mejor encaje contigo.</p>
        </div>
      </div>

      {searchParams.get("checkout") === "cancelled" && (
        <p className="mb-6 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Has cancelado el pago. Puedes intentarlo de nuevo cuando quieras.
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
            {intervalLabel[i]}
          </button>
        ))}
      </div>

      {!plans && !loadError ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(["Standard", "Global"] as SubscriptionTier[]).map((tier) => {
            const info = TIER_INFO[tier]
            const price = priceFor(tier)
            const selected = selectedTier === tier
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`flex flex-col rounded-2xl border p-5 text-left transition ${
                  selected ? "border-neon-cyan/60 bg-neon-cyan/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <h2 className="font-display text-lg font-bold text-white">{info.title}</h2>
                <p className="mb-4 text-sm text-white/60">{info.description}</p>
                <p className="mb-4 text-2xl font-bold text-white">
                  {price ? (
                    <>
                      {currencyFormat(price.displayAmount, price.currency)}
                      <span className="text-sm font-normal text-white/50"> / {intervalLabel[interval].toLowerCase()}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <ul className="mt-auto space-y-2 text-sm text-white/70">
                  {info.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-lime" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      )}

      {checkoutError && <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{checkoutError}</p>}

      <button
        type="button"
        onClick={subscribe}
        disabled={!selectedTier || !plans || checkoutLoading}
        className="mt-6 w-full rounded-lg bg-neon-cyan px-5 py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {checkoutLoading ? "Abriendo pago..." : "Suscribirme"}
      </button>
    </main>
  )
}

export default Precios
