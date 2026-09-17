import { driver, type PopoverDOM } from "driver.js"
import "driver.js/dist/driver.css"
import type { NavigateFunction } from "react-router-dom"
import { markOnboardingSeenAndSync } from "../auth/store"
import { t, setLanguage, getLanguage } from "../i18n/store"
import { updateMyPreferences } from "../api/profile"
import { TOUR_OPEN_FEEDBACK_EVENT } from "../../pages/App/components/FeedbackButton"

/**
 * Tour de bienvenida (beta): idioma → botón de feedback → se abre el modal para enseñarlo →
 * Cómo funciona. El resto de la app se explica sola (iconos/etiquetas) o ya está cubierto por
 * "Cómo funciona".
 *
 * "Visto" se recuerda en el backend (User.HasSeenOnboarding), no por dispositivo: quien lo
 * decide es AppLayout mirando `user.hasSeenOnboarding` (ver useAuth). Esta función solo sabe
 * reproducir el tour y avisar al backend cuando termina.
 *
 * Textos vía `t()` (§i18n): se resuelven una vez, al construir el tour — driver.js no es
 * reactivo, así que si el diccionario cambiase después no se refrescarían. Por eso login()/
 * register() (auth/store.ts) esperan a que cargue el diccionario del idioma de la cuenta antes
 * de devolver el control: cuando este tour arranca (justo después), el idioma ya es el correcto
 * salvo que se haya elegido mal al invitar — de ahí el primer paso, ver más abajo.
 */

// Corte desktop/móvil de la app (mismo breakpoint xl que Header/MobileNav): el botón de
// "Cómo funciona" vive en dos sitios distintos según el layout.
const isDesktopLayout = () => window.innerWidth >= 1280

const toggleFeedbackModal = (open: boolean) =>
  window.dispatchEvent(new CustomEvent(TOUR_OPEN_FEEDBACK_EVENT, { detail: open }))

// Se recalcula en el momento exacto en que driver.js va a destacar este paso (no al arrancar
// el tour): si se calculara una sola vez al principio y el ancho de ventana cambiase entre
// medias, se quedaría "enganchado" al elemento del layout equivocado — que existe en el DOM
// pero con display:none, con lo que su posición es (0,0) y el popover aparece en la esquina.
const getComoFuncionaElement = () =>
  document.getElementById(isDesktopLayout() ? "tour-como-funciona-desktop" : "tour-como-funciona-mobile") as Element

const LANG_BTN_CLS =
  "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
const langBtnActiveCls = (active: boolean) =>
  active ? `${LANG_BTN_CLS} border-neon-cyan bg-neon-cyan text-midnight` : `${LANG_BTN_CLS} border-white/15 text-white hover:border-white/30`

// Paso 1: siempre bilingüe y sin depender de t() — si el idioma que se preseleccionó (desde la
// invitación) fuera el equivocado, es lo único que la persona tiene garantizado poder leer, y
// desde aquí mismo se corrige sin tener que buscar el selector del header.
function languageStepHtml() {
  const current = getLanguage()
  return `
    <div class="space-y-3">
      <p class="text-sm text-white/80">Elige el idioma de la app. Podrás cambiarlo cuando quieras.</p>
      <p class="text-sm text-white/80">Choose the app's language. You can change it again anytime.</p>
      <div class="flex gap-2 pt-1">
        <button type="button" id="tour-lang-es" class="${langBtnActiveCls(current === "es")}">Español</button>
        <button type="button" id="tour-lang-en" class="${langBtnActiveCls(current === "en")}">English</button>
      </div>
    </div>
  `
}

export function startOnboardingTour(navigate: NavigateFunction) {
  const tour = driver({
    showProgress: true,
    progressText: t("onboarding.progress-text", "{{current}} de {{total}}"),
    nextBtnText: t("onboarding.next", "Siguiente"),
    prevBtnText: t("onboarding.prev", "Atrás"),
    doneBtnText: t("onboarding.done", "Entendido"),
    // En móvil es fácil tocar fuera sin querer (§reporte de beta) — que solo se cierre con la "x".
    allowClose: false,
    onCloseClick: () => {
      toggleFeedbackModal(false) // por si se cierra el tour con el modal abierto (paso 2)
      tour.destroy()
      markOnboardingSeenAndSync()
    },
    steps: [
      {
        popover: {
          title: "🌐 Español / English",
          description: languageStepHtml(),
          nextBtnText: "Continuar · Continue",
          showButtons: ["next"],
          onPopoverRender: (popover: PopoverDOM) => {
            const esBtn = popover.description.querySelector<HTMLButtonElement>("#tour-lang-es")
            const enBtn = popover.description.querySelector<HTMLButtonElement>("#tour-lang-en")
            const pick = async (l: "es" | "en") => {
              if (l === getLanguage() || !esBtn || !enBtn) return
              esBtn.disabled = true
              enBtn.disabled = true
              await setLanguage(l)
              updateMyPreferences({ preferredLanguage: l }).catch(() => {})
              // El resto de pasos ya tienen su texto fijado en el idioma anterior (driver.js no
              // es reactivo) — se reconstruye el tour entero para que salga todo bien desde aquí.
              tour.destroy()
              startOnboardingTour(navigate)
            }
            esBtn?.addEventListener("click", () => pick("es"))
            enBtn?.addEventListener("click", () => pick("en"))
          },
        },
      },
      {
        element: "#tour-feedback-button",
        popover: {
          title: t("onboarding.step-feedback.title", "Estamos en beta"),
          description: t(
            "onboarding.step-feedback.description",
            "Si ves algo raro o se te ocurre una idea, avísanos con este botón — puedes usarlo en cualquier momento, desde cualquier pantalla.",
          ),
          onNextClick: () => {
            toggleFeedbackModal(true)
            // margen para que el modal monte antes de que driver.js busque el siguiente elemento
            window.setTimeout(() => tour.moveNext(), 250)
          },
        },
      },
      {
        element: "#tour-feedback-modal",
        popover: {
          title: t("onboarding.step-feedback-modal.title", "Así se ve"),
          description: t(
            "onboarding.step-feedback-modal.description",
            "Eliges el tipo, escribes el mensaje y, si hace falta, adjuntas una captura de pantalla.",
          ),
          onNextClick: () => {
            toggleFeedbackModal(false)
            window.setTimeout(() => tour.moveNext(), 200)
          },
        },
      },
      {
        element: getComoFuncionaElement,
        popover: {
          title: t("onboarding.step-como-funciona.title", "Cómo funciona"),
          description: t(
            "onboarding.step-como-funciona.description",
            "Por aquí te explicamos cómo sacarle el máximo partido a Padel Film Room.",
          ),
          onNextClick: () => {
            tour.destroy()
            markOnboardingSeenAndSync()
            navigate("/app/como-funciona")
          },
        },
      },
    ],
  })

  tour.drive()
}
