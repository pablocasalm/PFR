import { apiPost, apiGet } from "./client"

export type BillingInterval = "Monthly" | "Yearly"

/** Un precio ya resuelto para el país del comprador (detectado por IP en el backend). */
export type PriceOption = {
  interval: BillingInterval
  displayAmount: number
  currency: string
}

export type BillingPlans = {
  prices: PriceOption[]
}

/** GET /api/billing/plans → precios (mensual/anual) por país. Pública, no necesita sesión. */
export const getBillingPlans = () => apiGet<BillingPlans>("/api/billing/plans")

/** POST /api/billing/checkout-session → URL de Stripe Checkout a la que redirigir. */
export const createCheckoutSession = (interval: BillingInterval) =>
  apiPost<{ url: string }>("/api/billing/checkout-session", { interval })

/** POST /api/billing/portal → URL del Customer Portal de Stripe (cancelar, cambiar método de
 * pago, ver facturas). */
export const createPortalSession = () => apiPost<{ url: string }>("/api/billing/portal")
