import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { Check, Minus, CreditCard, Clock } from "lucide-react"
import { useAuth, hasActiveSubscription, PLAN_NAME, type PlanTier } from "../../../lib/auth/store"
import PendingPlanNote from "../components/PendingPlanNote"
import { canStartCheckout } from "../../../lib/payments"
import { trackActivity } from "../../../lib/api/activity"
import { LegalLink } from "../../../lib/ui/LegalLinks"
import { useI18n, type TFunc } from "../../../lib/i18n/store"
import { changePlan, createCheckoutSession, getBillingPlans, type BillingPlans } from "../../../lib/api/billing"

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
 * botones con el checkout — ver PAYMENTS_ENABLED en lib/payments.ts. Nunca se activa en la app publicada.
 *
 * §24/10/2026: quien no tiene acceso (cuenta creada sin código desde la landing, prueba ya
 * acabada) sí ve los botones, que abren Stripe Checkout — ver canStartCheckout en lib/payments.ts.
 */

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
  { tier: "Starter", price: 14.9, availability: (t) => t("precios.availability.open", "Abierta"), accent: false },
  { tier: "Club", price: 24.9, availability: (t) => t("precios.availability.open", "Abierta"), accent: true },
  { tier: "Coach", price: 74.9, availability: (t) => t("precios.availability.limited", "Plazas limitadas"), accent: false },
]

const currencyFormat = (amount: number, lang: string) =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "es-ES", { style: "currency", currency: "EUR" }).format(amount)

const PlanCard = ({
  plan,
  isCurrent,
  hasSubscription,
  canCheckout,
  backend,
}: {
  plan: (typeof PLANS)[number]
  isCurrent: boolean
  /** Ya paga una suscripción: el botón cambia de plan en vez de abrir otro Checkout. */
  hasSubscription: boolean
  /** Puede contratar desde aquí (botón que abre Stripe); si no, "Próximamente". */
  canCheckout: boolean
  backend: BillingPlans | null
}) => {
  const { t, lang } = useI18n()
  // El precio que le toca a quien mira, leído de Stripe por el servidor (fundador o normal,
  // España o resto del mundo). Si no llega, el de PLANS.
  const backendPrice = backend?.plans?.find((p) => p.tier === plan.tier)?.prices?.find((p) => p.interval === "Monthly") ?? null
  const coachFull = plan.tier === "Coach" && !!backend?.coachFull && !isCurrent
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscribe = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { url } = hasSubscription ? await changePlan(plan.tier) : await createCheckoutSession("Monthly", plan.tier)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t("precios.checkout-error", "No se pudo abrir el pago."))
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
        {t(`precios.tier.${plan.tier.toLowerCase()}`, PLAN_NAME[plan.tier])}
      </h2>
      <p className="mt-2 text-3xl font-bold text-white">
        {currencyFormat(backendPrice?.displayAmount ?? plan.price, lang)}
        <span className="text-sm font-normal text-white/50"> / {t("precios.interval.monthly", "mensual")}</span>
      </p>
      {backend?.isFounder && (
        <p className="mt-1 text-xs font-semibold text-neon-lime">
          {backend.founderSlotsLeft
            ? t("precios.founder-left", "Precio fundador · quedan {count} plazas", { count: backend.founderSlotsLeft })
            : t("precios.founder", "Precio fundador")}
        </p>
      )}
      <p className="mt-1 text-xs text-white/40">
        {t("precios.availability-label", "Disponibilidad:")} {coachFull ? t("precios.availability.full", "Completo") : plan.availability(t)}
      </p>

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

      {canCheckout ? (
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={subscribe}
            disabled={!backendPrice || busy || (hasSubscription && isCurrent) || coachFull}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
              plan.accent ? "bg-neon-cyan text-midnight" : "border border-white/20 bg-white/5 text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            {busy
              ? t("precios.opening-stripe", "Abriendo Stripe…")
              : hasSubscription
                ? t("precios.change-to-plan", "Cambiar a este plan")
                : t("precios.choose-plan", "Elegir este plan")}
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

/** `standalone`: dentro de /suscripcion (fuera de la app, para quien aún no tiene suscripción). */
const Precios = ({ standalone = false }: { standalone?: boolean }) => {
  const { t } = useI18n()
  const { user } = useAuth()
  const location = useLocation()
  const [backend, setBackend] = useState<BillingPlans | null>(null)
  const hasSubscription = ["Active", "Trialing", "PastDue"].includes(user?.subscriptionStatus ?? "")
  useEffect(() => {
    trackActivity("pricing_view") // métricas internas: quién llega a ver los precios
    // Precios reales (de Stripe, vía servidor) también con los pagos cerrados: así lo que se
    // enseña coincide con lo que se cobrará.
    getBillingPlans().then(setBackend).catch(() => {})
  }, [])

  // Sin suscripción no se entra en la app, ni siquiera a Precios: a /suscripcion, fuera de la app
  // (sin menú ni tour). Ahí vuelve también quien cierra Stripe sin pagar (?checkout=cancelled).
  if (!standalone && user && !hasActiveSubscription(user)) return <Navigate to={`/suscripcion${location.search}`} replace />

  return (
    <main className="mx-auto w-full max-w-5xl py-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <CreditCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("precios.title", "Suscripción")}</h1>
          <p className="text-sm text-white/60">
            {canStartCheckout(user)
              ? t("precios.subtitle-open", "Elige tu plan. El pago se hace de forma segura en Stripe.")
              : t("precios.subtitle-v2", "Tres niveles de acompañamiento. Muy pronto podrás suscribirte.")}
          </p>
        </div>
      </div>

      <PendingPlanNote user={user} className="mb-8" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            isCurrent={!!user && hasActiveSubscription(user) && user.planTier === plan.tier}
            hasSubscription={hasSubscription}
            canCheckout={canStartCheckout(user)}
            backend={backend}
          />
        ))}
      </div>

      {/* Condiciones de la suscripción (renovación, cancelación, desistimiento): en los términos. */}
      <p className="mt-6 text-xs leading-relaxed text-white/50">
        {t("precios.legal.prefix", "Las condiciones de la suscripción, la renovación y la cancelación están en los")} <LegalLink doc="terms" />.{" "}
        {t("precios.legal.privacy-prefix", "Cómo tratamos tus datos, en la")} <LegalLink doc="privacy" />.
      </p>
    </main>
  )
}

export default Precios
