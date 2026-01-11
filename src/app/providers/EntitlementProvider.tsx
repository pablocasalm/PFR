import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

export type Entitlement = "FREE" | "PREMIUM"

type EntitlementContextValue = {
  entitlement: Entitlement
  setEntitlement: (value: Entitlement) => void
  toggleEntitlement: () => void
}

const ENTITLEMENT_STORAGE_KEY = "pfr_entitlement_v1"

const readEntitlement = (): Entitlement => {
  const raw = localStorage.getItem(ENTITLEMENT_STORAGE_KEY)
  return raw === "PREMIUM" ? "PREMIUM" : "FREE"
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null)

export const EntitlementProvider = ({ children }: { children: ReactNode }) => {
  const [entitlement, setEntitlementState] = useState<Entitlement>(() => readEntitlement())

  const setEntitlement = (value: Entitlement) => {
    localStorage.setItem(ENTITLEMENT_STORAGE_KEY, value)
    setEntitlementState(value)
  }

  const toggleEntitlement = () => {
    setEntitlement(entitlement === "PREMIUM" ? "FREE" : "PREMIUM")
  }

  const value = useMemo(
    () => ({
      entitlement,
      setEntitlement,
      toggleEntitlement,
    }),
    [entitlement],
  )

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>
}

export const useEntitlement = () => {
  const context = useContext(EntitlementContext)
  if (!context) {
    throw new Error("useEntitlement debe usarse dentro de EntitlementProvider")
  }
  return context
}
