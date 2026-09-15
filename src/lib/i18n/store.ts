import { useSyncExternalStore } from "react"
import { getTranslations, getLanguages, type LanguageOption } from "../api/i18n"

/**
 * Textos de la interfaz (i18n) — store de módulo (sin provider global, coherente con el
 * README) con persistencia del idioma elegido en localStorage y suscripción vía
 * useSyncExternalStore, igual que auth/store.ts y saved/store.ts.
 *
 * Las claves nunca se hardcodean por idioma en los componentes: se referencian por id
 * (p. ej. `t("header.nav.explorar")`) y el valor viene del diccionario cargado aquí.
 * `t(key, fallback)` siempre recibe también el texto en español como `fallback` desde el
 * propio componente — así, mientras una clave no exista todavía en BD (import pendiente),
 * la pantalla se sigue viendo exactamente igual que antes, sin roturas ni "[missing key]".
 */

const LANG_KEY = "lang"
const DEFAULT_LANG = "es"

type I18nState = {
  lang: string
  dict: Record<string, string>
  languages: LanguageOption[]
  ready: boolean // true tras la primera carga (idiomas + diccionario ya intentados)
}

function readLang(): string {
  try {
    return localStorage.getItem(LANG_KEY) ?? DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

let state: I18nState = { lang: readLang(), dict: {}, languages: [], ready: false }
const listeners = new Set<() => void>()

function setState(next: Partial<I18nState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function getSnapshot() {
  return state
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Carga inicial: idiomas activos + diccionario del idioma actual. Se llama una vez al arrancar la app (App.tsx). */
export async function hydrateI18n() {
  try {
    const [languages, dict] = await Promise.all([getLanguages(), getTranslations(state.lang)])
    setState({ languages, dict, ready: true })
  } catch {
    // Sin backend / red caída: seguimos con el diccionario vacío — t() usa su `fallback` en español.
    setState({ ready: true })
  }
}

/** Cambia el idioma activo, lo persiste (por dispositivo, no por cuenta) y recarga el diccionario. */
export async function setLanguage(lang: string) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    /* modo privado: sigue funcionando solo en memoria para esta sesión */
  }
  setState({ lang })
  try {
    const dict = await getTranslations(lang)
    setState({ dict })
  } catch {
    // Si falla la carga, se queda con el diccionario anterior (mejor que vaciarlo de golpe).
  }
}

type I18nParams = Record<string, string | number>

/** Firma de `t()` — para tipar funciones auxiliares fuera de un componente que la reciben como parámetro. */
export type TFunc = (key: string, fallback?: string, params?: I18nParams) => string

/** Sustituye `{nombre}` en el texto ya resuelto — mismo formato tanto en español como traducido. */
function interpolate(text: string, params?: I18nParams): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
}

function translate(dict: Record<string, string>, key: string, fallback?: string, params?: I18nParams): string {
  return interpolate(dict[key] ?? fallback ?? key, params)
}

/** Fuera de React (p. ej. un mensaje en un catch): usa el diccionario tal como esté en ese momento. */
export const t = (key: string, fallback?: string, params?: I18nParams) => translate(state.dict, key, fallback, params)

/** Hook de i18n: { t, lang, languages, ready, setLanguage }. Re-renderiza al cambiar de idioma. */
export function useI18n() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    t: (key: string, fallback?: string, params?: I18nParams) => translate(s.dict, key, fallback, params),
    lang: s.lang,
    languages: s.languages,
    ready: s.ready,
    setLanguage,
  }
}
