import { ApiError } from "./api/client"
import type { TFunc } from "./i18n/store"

/**
 * Textos de error que ve el cliente al pagar, crear cuenta o iniciar sesión (24/10/2026). Se
 * eligen por el código o el estado de la respuesta; el `message` del servidor no se enseña nunca
 * (es para nosotros: falta un precio, la clave de Stripe, etc. Eso va al log y a hello@). Los
 * textos viven en la base de datos de traducciones, así que se pueden cambiar sin publicar.
 */

/** Al abrir el pago de Stripe. */
export function checkoutErrorText(err: unknown, t: TFunc): string {
  const code = err instanceof ApiError ? err.code : undefined
  if (code === "has_subscription")
    return t("checkout.error.has-subscription", "Ya tienes una suscripción activa. Puedes cambiar de plan desde Mi Cuenta.")
  if (code === "coach_full") return t("checkout.error.coach-full", "PFR Coach no tiene plazas libres en este momento.")
  return t(
    "checkout.error.generic",
    "No hemos podido abrir el pago. Inténtalo de nuevo en unos minutos y, si sigue sin funcionar, escríbenos a hello@padelfilmroom.com.",
  )
}

/** Al crear la cuenta o iniciar sesión. */
export function authErrorText(err: unknown, mode: "login" | "register", t: TFunc): string {
  const status = err instanceof ApiError ? err.status : undefined
  if (err instanceof ApiError && err.code === "name_required")
    return t("login.error.name-required", "Escribe tu nombre o un nombre de usuario.")
  if (mode === "login" && status === 401) return t("login.error.invalid-credentials", "El email o la contraseña no son correctos.")
  // Cuenta a medias (creada sin código y sin llegar a pagar): no es un error, le falta elegir plan.
  if (mode === "register" && err instanceof ApiError && err.code === "account_incomplete")
    return t("login.error.account-incomplete", "Ya empezaste a crear tu cuenta con este email. Inicia sesión para elegir tu plan.")
  if (mode === "register" && status === 409)
    return t("login.error.account-exists", "Ya existe una cuenta con este email. Inicia sesión o recupera tu contraseña.")
  if (mode === "register" && (status === 400 || status === 403 || status === 410))
    // Código de invitación que falta, no vale, está gastado o ha caducado.
    return t("login.error.invite", "El código de invitación no es válido o ha caducado. Si crees que es un error, escríbenos a hello@padelfilmroom.com.")
  return t("login.error.generic", "No se pudo completar la operación.")
}
