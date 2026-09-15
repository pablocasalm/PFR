import { apiGet } from "./client"

/** Textos de la interfaz (i18n): endpoints públicos, hacen falta incluso antes de iniciar sesión. */

export type LanguageOption = { code: string; name: string }

/** GET /api/i18n/languages → idiomas activos para el selector, ya ordenados. */
export const getLanguages = () => apiGet<LanguageOption[]>("/api/i18n/languages")

/** GET /api/i18n/{lang} → { "clave": "valor" } (cae a español en el backend si falta la traducción). */
export const getTranslations = (lang: string) => apiGet<Record<string, string>>(`/api/i18n/${lang}`)
