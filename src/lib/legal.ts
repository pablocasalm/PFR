/**
 * Documentos legales, alojados y mantenidos en Lawwwing (ellos los actualizan cuando cambia la
 * normativa). Un único sitio para las URLs: si cambian, se cambian aquí. Las mismas que usa la
 * landing (PFR_Landing/src/lib/legal.ts) y los emails (backend, LegalLinks).
 */
const BASE = "https://app.lawwwing.com/documents/f58ac419-ab32-48c6-ab6d-49369468cc2c"

export type LegalDoc = "legalNotice" | "privacy" | "cookies" | "terms"

const SLUG: Record<LegalDoc, string> = {
  legalNotice: "legal-notice",
  privacy: "privacy-notice",
  cookies: "cookie-policy",
  terms: "terms-and-conditions",
}

/** URL del documento en el idioma de la interfaz (los documentos existen en español e inglés). */
export const legalUrl = (doc: LegalDoc, lang: string) => `${BASE}/${SLUG[doc]}/${lang === "en" ? "en" : "es"}/`
