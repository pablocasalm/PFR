import { useEffect, useState } from "react"
import { checkDiscountCode, type DiscountCodeInfo } from "./api/billing"
import type { PlanTier } from "./auth/store"

/**
 * Código de descuento (11/11/2026, tarjeta #46): llega en el enlace (`?codigo=ANDREA20`, de la
 * landing o directo a la app) o se escribe en la casilla al crear la cuenta, y se manda al abrir
 * el pago para que Stripe lo aplique. Se guarda solo en esta pestaña (sessionStorage, igual que
 * las invitaciones): en un ordenador compartido no debe quedarse para la cuenta de otra persona.
 */

const KEY = "pfr_discount"

export const normalizeDiscountCode = (code: string | null | undefined) => (code ?? "").trim().toUpperCase()

export const readStoredDiscountCode = () => {
  try {
    return sessionStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}

export const storeDiscountCode = (code: string | null) => {
  try {
    const normalized = normalizeDiscountCode(code)
    if (normalized) sessionStorage.setItem(KEY, normalized)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* modo privado sin almacenamiento: vale con el de la casilla */
  }
}

/** Guarda el `?codigo=` de la dirección, si lo hay. Devuelve el código que queda guardado. */
export const captureDiscountCodeFromUrl = (params: URLSearchParams) => {
  const fromUrl = normalizeDiscountCode(params.get("codigo") ?? params.get("code"))
  if (fromUrl) storeDiscountCode(fromUrl)
  return fromUrl || readStoredDiscountCode()
}

export type DiscountCheck =
  | { state: "empty" }
  | { state: "checking" }
  | { state: "valid"; info: DiscountCodeInfo }
  | { state: "invalid" }

/** Comprueba el código mientras se escribe (con una pequeña espera) para ese plan. */
export function useDiscountCheck(code: string, tier: PlanTier | null): DiscountCheck {
  const [check, setCheck] = useState<DiscountCheck>({ state: "empty" })
  const normalized = normalizeDiscountCode(code)

  useEffect(() => {
    if (normalized.length < 3) {
      setCheck({ state: "empty" })
      return
    }
    let cancelled = false
    setCheck({ state: "checking" })
    const id = setTimeout(() => {
      checkDiscountCode(normalized, tier)
        .then((res) => !cancelled && setCheck(res.valid ? { state: "valid", info: res.code } : { state: "invalid" }))
        .catch(() => !cancelled && setCheck({ state: "invalid" }))
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [normalized, tier])

  return check
}

/** «20 % el primer mes», «20 % durante 3 meses», «20 % para siempre». */
export const describeDiscount = (
  info: DiscountCodeInfo,
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string,
) => {
  const amount = info.percentOff != null ? `${info.percentOff} %` : info.amountOff != null ? `${(info.amountOff / 100).toFixed(2)} ${info.currency?.toUpperCase() ?? ""}`.trim() : ""
  if (info.duration === "forever") return t("discount.forever", "{amount} para siempre", { amount })
  if (info.duration === "repeating" && info.durationInMonths && info.durationInMonths > 1)
    return t("discount.months", "{amount} durante {months} meses", { amount, months: info.durationInMonths })
  return t("discount.first-month", "{amount} el primer mes", { amount })
}
