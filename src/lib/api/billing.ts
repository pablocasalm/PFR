import { apiPost, apiGet } from "./client"
import type { SubscriptionTier } from "../auth/store"

export type BillingInterval = "Monthly" | "Yearly"

/** Un precio ya resuelto para el país del comprador (detectado por IP en el backend). */
export type PriceOption = {
  tier: SubscriptionTier
  interval: BillingInterval
  displayAmount: number
  currency: string
}

export type BillingPlans = {
  suggestedTier: SubscriptionTier
  prices: PriceOption[]
}

/** GET /api/billing/plans → precios por país + qué tier sugerir por defecto (el usuario puede
 * elegir el otro igualmente). */
export const getBillingPlans = () => apiGet<BillingPlans>("/api/billing/plans")

/** POST /api/billing/checkout-session → URL de Stripe Checkout a la que redirigir. */
export const createCheckoutSession = (tier: SubscriptionTier, interval: BillingInterval) =>
  apiPost<{ url: string }>("/api/billing/checkout-session", { tier, interval })

/** POST /api/billing/portal → URL del Customer Portal de Stripe (cancelar, cambiar método de
 * pago, ver facturas). */
export const createPortalSession = () => apiPost<{ url: string }>("/api/billing/portal")
