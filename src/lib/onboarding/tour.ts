import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import type { NavigateFunction } from "react-router-dom"
import { markOnboardingSeenAndSync } from "../auth/store"
import { TOUR_OPEN_FEEDBACK_EVENT } from "../../pages/App/components/FeedbackButton"

/**
 * Tour de bienvenida (beta): 3 pasos — botón de feedback → se abre el modal para enseñarlo →
 * Cómo funciona. Nada más — el resto de la app se explica sola (iconos/etiquetas) o ya está
 * cubierto por "Cómo funciona".
 *
 * "Visto" se recuerda en el backend (User.HasSeenOnboarding), no por dispositivo: quien lo
 * decide es AppLayout mirando `user.hasSeenOnboarding` (ver useAuth). Esta función solo sabe
 * reproducir el tour y avisar al backend cuando termina.
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

export function startOnboardingTour(navigate: NavigateFunction) {
  const tour = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    doneBtnText: "Entendido",
    onCloseClick: () => {
      toggleFeedbackModal(false) // por si se cierra el tour con el modal abierto (paso 2)
      tour.destroy()
      markOnboardingSeenAndSync()
    },
    steps: [
      {
        element: "#tour-feedback-button",
        popover: {
          title: "Estamos en beta",
          description:
            "Si ves algo raro o se te ocurre una idea, avísanos con este botón — puedes usarlo en cualquier momento, desde cualquier pantalla.",
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
          title: "Así se ve",
          description: "Eliges el tipo, escribes el mensaje y, si hace falta, adjuntas una captura de pantalla.",
          onNextClick: () => {
            toggleFeedbackModal(false)
            window.setTimeout(() => tour.moveNext(), 200)
          },
        },
      },
      {
        element: getComoFuncionaElement,
        popover: {
          title: "Cómo funciona",
          description: "Por aquí te explicamos cómo sacarle el máximo partido a Padel Film Room.",
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
