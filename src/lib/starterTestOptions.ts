import type { TFunc } from "./i18n/store"
import type { Frequency, GameLevel, Phrase, PlaytomicLevel, TestOrigin } from "./api/starterTest"

/**
 * Opciones del test inicial «¿Por dónde empiezo?» con sus textos. Las usan el test
 * (TestInicial) y las gráficas de respuestas del panel (AdminEncuestas).
 */

export const GAME: { value: GameLevel; label: (t: TFunc) => string }[] = [
  {
    value: "new",
    label: (t) => t("starter-test.q1.new", "Llevo poco tiempo jugando"),
  },
  {
    value: "friends",
    label: (t) => t("starter-test.q1.friends", "Juego partidos con amigos con regularidad"),
  },
  {
    value: "amateur",
    label: (t) => t("starter-test.q1.amateur", "Juego americanas o liga amateur"),
  },
  {
    value: "tournaments",
    label: (t) => t("starter-test.q1.tournaments", "Compito en torneos"),
  },
]

export const PLAYTOMIC: { value: PlaytomicLevel; es: string; en: string }[] = [
  { value: "none", es: "No uso Playtomic", en: "I don't use Playtomic" },
  { value: "lt1", es: "Menos de 1", en: "Less than 1" },
  { value: "1.0", es: "1,0–1,49", en: "1.0–1.49" },
  { value: "1.5", es: "1,5–2,49", en: "1.5–2.49" },
  { value: "2.5", es: "2,5–3,49", en: "2.5–3.49" },
  { value: "3.5", es: "3,5–4,49", en: "3.5–4.49" },
  { value: "4.5", es: "4,5–5,49", en: "4.5–5.49" },
  { value: "5.5", es: "5,5 o más", en: "5.5 or higher" },
]

export const FREQUENCY: { value: Frequency; label: (t: TFunc) => string }[] = [
  { value: "1", label: (t) => t("starter-test.q2.1", "1 o menos") },
  { value: "2-3", label: (t) => t("starter-test.q2.2-3", "2 o 3") },
  { value: "4+", label: (t) => t("starter-test.q2.4", "4 o más") },
]

export const PHRASES: { value: Phrase; label: (t: TFunc) => string }[] = [
  {
    value: "lose_net",
    label: (t) => t("starter-test.q3.lose-net", "Me quitan la red enseguida"),
  },
  {
    value: "defend_back",
    label: (t) => t("starter-test.q3.defend-back", "Me cuesta defender desde el fondo"),
  },
  {
    value: "when_net",
    label: (t) => t("starter-test.q3.when-net", "No sé cuándo subir a la red"),
  },
  {
    value: "lobs",
    label: (t) => t("starter-test.q3.lobs", "Tiro globos, pero no me funcionan"),
  },
  {
    value: "rush",
    label: (t) => t("starter-test.q3.rush", "Me precipito y quiero acabar el punto demasiado pronto"),
  },
  {
    value: "volleys",
    label: (t) => t("starter-test.q3.volleys", "Mis voleas no hacen daño"),
  },
  {
    value: "partner",
    label: (t) => t("starter-test.q3.partner", "Con mi compañero no nos coordinamos"),
  },
  {
    value: "read",
    label: (t) => t("starter-test.q3.read", "No sé leer al rival"),
  },
  {
    value: "unsure",
    label: (t) => t("starter-test.q3.unsure", "No lo tengo claro"),
  },
]

export const ORIGINS: { value: TestOrigin; label: (t: TFunc) => string }[] = [
  {
    value: "how_it_works",
    label: (t) => t("admin-starter.origin.how-it-works", "Cómo funciona"),
  },
  {
    value: "home_banner",
    label: (t) => t("admin-starter.origin.home-banner", "Banner de Inicio"),
  },
  {
    value: "my_list",
    label: (t) => t("admin-starter.origin.my-list", "Mi Lista"),
  },
  {
    value: "account",
    label: (t) => t("admin-starter.origin.account", "Mi Cuenta"),
  },
]
