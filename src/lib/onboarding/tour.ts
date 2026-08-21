import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import type { NavigateFunction } from "react-router-dom"
import { markOnboardingSeenAndSync } from "../auth/store"

/**
 * Tour de bienvenida (beta): solo 2 pasos, botón de feedback → Cómo funciona. Nada más — el
 * resto de la app se explica sola (iconos/etiquetas) o ya está cubierto por "Cómo funciona".
 *
 * "Visto" se recuerda en el backend (User.HasSeenOnboarding), no por dispositivo: quien lo
 * decide es AppLayout mirando `user.hasSeenOnboarding` (ver useAuth). Esta función solo sabe
 * reproducir el tour y avisar al backend cuando termina.
 */

// Corte desktop/móvil de la app (mismo breakpoint xl que Header/MobileNav): el botón de
// "Cómo funciona" vive en dos sitios distintos según el layout.
const isDesktopLayout = () => window.innerWidth >= 1280

export function startOnboardingTour(navigate: NavigateFunction) {
  const comoFuncionaId = isDesktopLayout() ? "tour-como-funciona-desktop" : "tour-como-funciona-mobile"

  const tour = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    doneBtnText: "Entendido",
    onCloseClick: () => {
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
        },
      },
      {
        element: `#${comoFuncionaId}`,
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
