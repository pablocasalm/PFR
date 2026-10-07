import { useEffect, useState } from "react"
import { Check, Minus, CreditCard, Clock } from "lucide-react"
import { useAuth, type PlanTier } from "../../../lib/auth/store"
import { useI18n, type TFunc } from "../../../lib/i18n/store"
import { API_BASE } from "../../../lib/config"
import { createCheckoutSession, getBillingPlans, type BillingPlans } from "../../../lib/api/billing"

/**
 * Pantalla de precios / paywall (§Stripe 3 planes, Fase 4). Comparativa de los 3 planes.
 *
 * §Temporal (a propósito, pedido explícitamente): los precios y features son estáticos
 * (hardcoded) y NINGÚN plan es clicable todavía — "Próximamente" en los tres, Starter y Coach
 * incluidos. Solo existe en Stripe el precio de siempre (9,99€, el que hoy representa a Club en
 * BD, ver Fase 0) y no coincide con el 24,90€ de aquí — cuando se cree de verdad en Stripe
 * (Starter y Coach todavía no existen) y se decida abrir el checkout, hay que:
 *   1) crear/actualizar los PricingPlan (Tier×Interval×País) con los StripePriceId reales,
 *   2) volver a llamar a getBillingPlans()/createCheckoutSession(interval, tier) desde aquí
 *      (ambos ya soportan tiers desde la Fase 0 — ver lib/api/billing.ts) en vez del contenido
 *      estático de abajo.
 *
 * §Prueba local de Stripe (oct 2026): mientras tanto existe un modo de prueba que SÍ conecta los
 * botones con el checkout — ver CHECKOUT_TEST más abajo. Nunca se activa en la app publicada.
 */

/**
 * Modo de prueba del pago, para probar Stripe sin abrir las suscripciones a nadie. Los botones
 * solo dejan de decir "Próximamente" si se cumplen las tres cosas a la vez:
 *  - la app corre en desarrollo (`npm run dev`) — en la versión publicada esto es siempre falso;
 *  - `.env.local` tiene `VITE_ENABLE_CHECKOUT=true`;
 *  - el backend al que apunta NO es el de producción (para no cobrar ni suscribir cuentas reales
 *    por error, ya que `.env.local` suele apuntar a producción).
 */
const CHECKOUT_TEST = import.meta.env.DEV && import.meta.env.VITE_ENABLE_CHECKOUT === "true" && !API_BASE.includes("padelfilmroom.com")

type FeatureRow = { label: (t: TFunc) => string; tiers: PlanTier[] } // qué tiers incluyen esta fila

const FEATURE_ROWS: FeatureRow[] = [
  { label: (t) => t("precios.feature.catalog-v2", "Todos los clips y análisis, incluidos los nuevos"), tiers: ["Starter", "Club", "Coach"] },
  { label: (t) => t("precios.feature.mi-juego", "Favoritos, Mi Juego, estadísticas y story"), tiers: ["Starter", "Club", "Coach"] },
  { label: (t) => t("precios.feature.session", "Sesión táctica mensual grabada con Guille, en ES/EN"), tiers: ["Club", "Coach"] },
  { label: (t) => t("precios.feature.questions", "Enviar preguntas para esa sesión"), tiers: ["Club", "Coach"] },
  { label: (t) => t("precios.feature.monthly-pick", "Propuesta mensual de conceptos y clips para trabajar tras la sesión"), tiers: ["Club", "Coach"] },
  { label: (t) => t("precios.feature.archive", "Acceso al archivo de sesiones grabadas del Club"), tiers: ["Club", "Coach"] },
  { label: (t) => t("precios.feature.personal-analysis", "Análisis táctico personalizado mensual de 20 min de un partido tuyo"), tiers: ["Coach"] },
]

const PLANS: { tier: PlanTier; price: number; availability: (t: TFunc) => string; accent: boolean }[] = [
  { tier: "Starter", price: 9.9, availability: (t) => t("precios.availability.open", "Abierta"), accent: false },
  { tier: "Club", price: 24.9, availability: (t) => t("precios.availability.open", "Abierta"), accent: true },
  { tier: "Coach", price: 74.9, availability: (t) => t("precios.availability.limited", "Plazas limitadas"), accent: false },
]

/** Nombre comercial de cada plan. El primero se llama "Essential" de cara al usuario (decisión
 * de octubre de 2026); por dentro — API, base de datos, `PlanTier` — sigue siendo "Starter". */
const TIER_NAME: Record<PlanTier, string> = { Starter: "Essential", Club: "Club", Coach: "Coach" }

const currencyFormat = (amount: number, lang: string) =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", { style: "currency", currency: "EUR" }).format(amount)

const PlanCard = ({ plan, isCurrent, backend }: { plan: (typeof PLANS)[number]; isCurrent: boolean; backend: BillingPlans | null }) => {
  const { t, lang } = useI18n()
  // Solo en el modo de prueba: el precio mensual que el backend tiene para este plan (tabla
  // PricingPlans) y el salto al checkout de Stripe.
  const backendPrice = backend?.plans.find((p) => p.tier === plan.tier)?.prices.find((p) => p.interval === "Monthly") ?? null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscribe = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { url } = await createCheckoutSession("Monthly", plan.tier)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el pago.")
      setBusy(false)
    }
  }
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        isCurrent
          ? "border-neon-lime/50 bg-neon-lime/[0.06]"
          : plan.accent
            ? "border-neon-cyan/40 bg-neon-cyan/[0.06]"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {(isCurrent || plan.accent) && (
        <span
          className={`absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
            isCurrent ? "bg-neon-lime text-midnight" : "bg-neon-cyan text-midnight"
          }`}
        >
          {isCurrent ? t("precios.current-plan", "Tu plan actual") : t("precios.most-popular", "Más popular")}
        </span>
      )}

      <h2 className="font-display text-xl font-bold text-white">
        {t(`precios.tier.${plan.tier.toLowerCase()}`, `PFR ${TIER_NAME[plan.tier]}`)}
      </h2>
      <p className="mt-2 text-3xl font-bold text-white">
        {currencyFormat(plan.price, lang)}
        <span className="text-sm font-normal text-white/50"> / {t("precios.interval.monthly", "mensual")}</span>
      </p>
      <p className="mt-1 text-xs text-white/40">{t("precios.availability-label", "Disponibilidad:")} {plan.availability(t)}</p>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {FEATURE_ROWS.map((row) => {
          const included = row.tiers.includes(plan.tier)
          return (
            <li key={row.label(t)} className={`flex items-start gap-2 ${included ? "text-white/80" : "text-white/30"}`}>
              {included ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-lime" />
              ) : (
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-white/20" />
              )}
              {row.label(t)}
            </li>
          )
        })}
      </ul>

      {CHECKOUT_TEST ? (
        // Modo de prueba local (textos sin traducir a propósito: no los ve ningún usuario).
        <div className="mt-6 space-y-2">
          <p className="text-xs text-amber-200/80">
            {backendPrice
              ? `Precio en el backend: ${new Intl.NumberFormat("es-ES", { style: "currency", currency: backendPrice.currency }).format(backendPrice.displayAmount)} / mes`
              : "Sin precio mensual en el backend para este plan."}
          </p>
          <button
            type="button"
            onClick={subscribe}
            disabled={!backendPrice || busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            {busy ? "Abriendo Stripe…" : "Suscribirme (prueba)"}
          </button>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-3 text-sm font-bold text-white/50 cursor-not-allowed"
        >
          <Clock className="h-4 w-4" />
          {t("precios.coming-soon", "Próximamente")}
        </button>
      )}
    </div>
  )
}

const Precios = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  const [backend, setBackend] = useState<BillingPlans | null>(null)
  useEffect(() => {
    if (CHECKOUT_TEST) getBillingPlans().then(setBackend).catch(() => {})
  }, [])

  return (
    <main className="mx-auto w-full max-w-5xl py-8">
      {CHECKOUT_TEST && (
        <p className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <strong>Modo de prueba de pagos.</strong> Los botones abren el checkout de Stripe contra {API_BASE}. Solo se ve en tu ordenador; en la app publicada
          siguen en «Próximamente».
        </p>
      )}
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("precios.title", "Suscripción")}</h1>
          <p className="text-sm text-white/60">{t("precios.subtitle-v2", "Tres niveles de acompañamiento. Muy pronto podrás suscribirte.")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.tier} plan={plan} isCurrent={user?.planTier === plan.tier} backend={backend} />
        ))}
      </div>
    </main>
  )
}

export default Precios
