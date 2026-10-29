import type { AuthUser } from "./auth/store"

/**
 * Contratar desde la app (los botones abren Stripe Checkout; el pago es siempre en Stripe).
 *
 * Desde el 29/10/2026 los pagos están abiertos para cualquier cuenta con sesión, también para los
 * beta testers en sus 14 días: si se suscriben antes de tiempo, Stripe no cobra hasta el último
 * día de su beta (BillingController.TrialForAsync). Antes, el interruptor PAYMENTS_ENABLED los
 * cerraba en la app publicada y solo podía contratar quien no tenía acceso (desde el 24/10).
 */
export const canStartCheckout = (user: AuthUser | null) => !!user
