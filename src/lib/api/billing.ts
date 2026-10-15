import { apiPost, apiGet } from "./client"
import type { PlanTier } from "../auth/store"

export type BillingInterval = "Monthly" | "Yearly"

/** Un precio ya resuelto para el país del comprador (detectado por IP en el backend). */
export type PriceOption = {
  interval: BillingInterval
  displayAmount: number
  currency: string
}

export type TierPlan = {
  tier: PlanTier
  /** Puede venir vacío si ese tier todavía no tiene precio dado de alta en Stripe/backend
   * (p. ej. Starter/Coach recién añadidos, antes de la Fase 4). */
  prices: PriceOption[]
}

export type BillingPlans = {
  /** Compat: precios del tier Club "aplanados" — misma forma que antes de tener tiers, la sigue
   * consumiendo tal cual PFR_Landing. No quitar hasta que la landing también migre a `plans`. */
  prices: PriceOption[]
  plans: TierPlan[]
}

/** GET /api/billing/plans → precios (mensual/anual) por tier y país. Pública, no necesita sesión. */
export const getBillingPlans = () => apiGet<BillingPlans>("/api/billing/plans")

/** POST /api/billing/checkout-session → URL de Stripe Checkout a la que redirigir. Tier por
 * defecto "Club" mientras Precios.tsx siga siendo la pantalla de un único plan (Fase 0-3) — pasa
 * a ser obligatorio en la práctica en la Fase 4, cuando la pantalla ya pida elegir plan. */
export const createCheckoutSession = (interval: BillingInterval, tier: PlanTier = "Club") =>
  apiPost<{ url: string }>("/api/billing/checkout-session", { interval, tier })

/** POST /api/billing/portal → URL del Customer Portal de Stripe (cancelar, cambiar método de
 * pago, ver facturas). */
export const createPortalSession = () => apiPost<{ url: string }>("/api/billing/portal")
