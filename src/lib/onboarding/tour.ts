import { driver, type Driver, type DriveStep } from "driver.js"
import "driver.js/dist/driver.css"
import type { NavigateFunction } from "react-router-dom"
import { markOnboardingSeenAndSync } from "../auth/store"
import { t, whenI18nReady } from "../i18n/store"

/**
 * Tour de bienvenida para los miembros fundadores (acceso anticipado): bienvenida → Explorar →
 * el plan del mes en Inicio → entrar en Club (lleva de verdad a /app/club) → la masterclass del
 * mes → enviar preguntas → feedback → Cómo funciona. Recorrido y textos decididos con Andrea el
 * 15 de octubre de 2026.
 *
 * Sin paso de idioma: quien entra ahora lo hace por invitación, y la invitación ya fija el idioma
 * de la cuenta (InviteCode.Language → User.PreferredLanguage).
 *
 * "Visto" se recuerda en el backend (User.HasSeenOnboarding), no por dispositivo: quien lo
 * decide es AppLayout mirando `user.hasSeenOnboarding` (ver useAuth). Esta función solo sabe
 * reproducir el tour y avisar al backend cuando termina.
 *
 * Textos vía `t()` (§i18n): se resuelven una vez, al construir el tour — driver.js no es
 * reactivo. Por eso login()/register() (auth/store.ts) esperan a que cargue el diccionario del
 * idioma de la cuenta antes de devolver el control.
 */

// Corte desktop/móvil de la app (mismo breakpoint xl que Header/MobileNav). Explorar, Club y
// "Cómo funciona" viven en sitios distintos según el layout: en el nav de la cabecera en
// escritorio; en la barra inferior (Explorar, Club) o en el menú del avatar (Cómo funciona) en
// móvil/tablet.
const isDesktopLayout = () => window.innerWidth >= 1280

// Se recalcula en el momento exacto en que driver.js va a destacar el paso (no al arrancar el
// tour): si se calculara una sola vez y el ancho de ventana cambiase entre medias, se quedaría
// "enganchado" al elemento del layout equivocado — que existe en el DOM pero con display:none,
// con lo que su posición es (0,0) y el popover aparece en la esquina.
const byLayout = (desktopId: string, mobileId: string) => () =>
  document.getElementById(isDesktopLayout() ? desktopId : mobileId) as Element

// Elemento que puede no estar (p. ej. el plan del mes si ese mes no hay): si falta, driver.js
// enseña el paso centrado, sin señalar nada — el texto sigue teniendo sentido.
const optional = (id: string) => () => document.getElementById(id) as Element

/**
 * Espera a que un elemento exista Y se haya quedado quieto. Al llegar a Club, la sección existe
 * enseguida pero la pantalla sigue cargando (el plan, las masterclasses) y lo empuja hacia abajo:
 * si el tour señalase entonces, la ventanita se quedaría donde estaba el elemento y el foco donde
 * acaba (§reporte de Pablo, 15 oct). Quieto = misma posición en varias lecturas seguidas.
 */
const waitForStableElement = (id: string, timeoutMs = 8000) =>
  new Promise<void>((resolve) => {
    const start = Date.now()
    let last = ""
    let stableReads = 0
    const tick = () => {
      const el = document.getElementById(id)
      if (el) {
        const r = el.getBoundingClientRect()
        const pos = `${Math.round(r.top + window.scrollY)}:${Math.round(r.height)}`
        stableReads = pos === last ? stableReads + 1 : 0
        last = pos
      }
      if (stableReads >= 4 || Date.now() - start > timeoutMs) return resolve()
      window.setTimeout(tick, 120)
    }
    tick()
  })

/** Elemento de un paso, tal y como lo resuelve driver.js (puede ser id, elemento o función). */
const stepElement = (step: DriveStep | undefined): Element | null => {
  const target = step?.element
  if (!target) return null
  if (typeof target === "function") return target() ?? null
  return typeof target === "string" ? document.querySelector(target) : target
}

/**
 * Desplaza la página hasta el elemento del paso siguiente ANTES de pasar a él. Si se deja a
 * driver.js, primero pinta la ventanita donde estaba la anterior, luego desplaza y entonces la
 * mueve: se ve un salto (§reporte de Pablo, 15 oct). Centrado si cabe; si no, arriba, por debajo
 * de la cabecera fija. Los elementos fijos (menú, barra inferior) no necesitan desplazamiento.
 */
const HEADER_OFFSET = 90
const scrollToStep = (step: DriveStep | undefined) => {
  const el = stepElement(step)
  if (!el || getComputedStyle(el).position === "fixed" || el.closest("header, nav.fixed")) return
  const r = el.getBoundingClientRect()
  const visible = r.top >= HEADER_OFFSET && r.bottom <= window.innerHeight - 80
  if (visible) return
  const fits = r.height < window.innerHeight - HEADER_OFFSET - 160
  const top = fits ? r.top + window.scrollY - (window.innerHeight - r.height) / 2 : r.top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top: Math.max(0, top) })
}

/** Pasa al paso siguiente/anterior con la página ya colocada (dos frames para que pinte). */
const moveWithScroll = (tour: Driver, steps: DriveStep[], direction: 1 | -1) => {
  const index = tour.getActiveIndex() ?? 0
  scrollToStep(steps[index + direction])
  requestAnimationFrame(() => requestAnimationFrame(() => (direction === 1 ? tour.moveNext() : tour.movePrevious())))
}

/** Si el elemento se ha movido después de señalarlo (algo que terminó de cargar), recoloca foco
 * y ventanita una sola vez. Si no se ha movido, no toca nada: recolocar "por si acaso" también se
 * ve como un salto. */
const fixIfMoved = (tour: Driver, element: Element | undefined) => {
  if (!element) return
  const before = element.getBoundingClientRect()
  window.setTimeout(() => {
    if (!tour.isActive()) return
    const after = element.getBoundingClientRect()
    if (Math.abs(after.top - before.top) > 4 || Math.abs(after.left - before.left) > 4) tour.refresh()
  }, 700)
}

// Anillo que late alrededor de "Club" en el paso que invita a pulsarlo (estilo en index.css).
const PULSE_CLS = "tour-pulse"

/** Arranca el tour cuando ya están cargados los textos del idioma de la cuenta (sus textos se
 * fijan al construirlo). */
export function startOnboardingTour(navigate: NavigateFunction) {
  void whenI18nReady().then(() => runTour(navigate))
}

function runTour(navigate: NavigateFunction) {
  // La app desplaza con suavidad (scroll-behavior: smooth en index.css). Durante el tour eso hace
  // que el elemento siga moviéndose mientras se coloca la ventanita, y se ve un salto: mientras
  // dure, el desplazamiento es instantáneo. Se restaura al cerrar (onDestroyed).
  const root = document.documentElement
  const previousScrollBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = "auto"

  const finish = (tour: Driver) => {
    tour.destroy()
    markOnboardingSeenAndSync()
  }

  // Paso "Entra en Club": tanto si pulsan "Ir a Club" como si pulsan el propio enlace del menú,
  // se va a Club y el tour sigue allí cuando la pantalla ya ha montado. Una sola vez.
  let goingToClub = false
  const goToClub = async () => {
    if (goingToClub) return
    goingToClub = true
    navigate("/app/club")
    window.scrollTo({ top: 0 })
    await waitForStableElement("tour-club-masterclasses")
    moveWithScroll(tour, steps, 1)
  }
  let clubLink: Element | undefined
  // Se rellena al crear el tour; los manejadores de Siguiente/Atrás la necesitan para saber qué
  // elemento viene después.
  let steps: DriveStep[] = []

  const tour = driver({
    showProgress: true,
    progressText: t("onboarding.progress-text", "{{current}} de {{total}}"),
    nextBtnText: t("onboarding.next", "Siguiente"),
    prevBtnText: t("onboarding.prev", "Atrás"),
    doneBtnText: t("onboarding.done", "Entendido"),
    // En móvil es fácil tocar fuera sin querer (§reporte de beta) — que solo se cierre con la "x".
    // allowClose:false también esconde la "x" en cada paso salvo que el paso la pida: por eso se
    // añade a todos los que no fijan sus botones (ver withCloseButton, al final).
    allowClose: false,
    onCloseClick: () => finish(tour),
    onDestroyed: () => {
      root.style.scrollBehavior = previousScrollBehavior
    },
    // Para todos los pasos salvo los que tienen su propio onHighlighted (que también lo llama).
    onHighlighted: (element) => fixIfMoved(tour, element),
    // Para todos los pasos salvo los que tienen su propio onNextClick (Club y el último).
    onNextClick: () => moveWithScroll(tour, steps, 1),
    onPrevClick: () => moveWithScroll(tour, steps, -1),
    steps: (steps = withCloseButton([
      {
        popover: {
          title: t("onboarding.v2.welcome.title", "Bienvenido a Padel Film Room"),
          description: t(
            "onboarding.v2.welcome.description",
            "Eres uno de nuestros miembros fundadores. Gracias por confiar en nosotros desde el principio: lo que nos cuentes estas semanas va a dar forma a Padel Film Room.",
          ),
          // Primer paso: no hay nada detrás.
          showButtons: ["next", "close"],
        },
      },
      {
        element: byLayout("tour-explorar-desktop", "tour-explorar-mobile"),
        popover: {
          title: t("onboarding.v2.explore.title", "Explorar"),
          description: t(
            "onboarding.v2.explore.description",
            "Aquí empieza todo: partidos profesionales desmenuzados en clips y análisis, para que aprendas a ver lo que pasa antes del golpe.",
          ),
        },
      },
      {
        element: optional("tour-plan-home"),
        popover: {
          title: t("onboarding.v2.plan.title", "Tu plan del mes"),
          description: t(
            "onboarding.v2.plan.description",
            "Con el Plan Club, cada mes te decimos qué trabajar y qué probar en tu próximo partido. Para que lo que veas aquí se note en la pista.",
          ),
        },
      },
      {
        element: byLayout("tour-club-desktop", "tour-club-mobile"),
        onHighlighted: (element) => {
          fixIfMoved(tour, element)
          clubLink = element
          element?.classList.add(PULSE_CLS)
          element?.addEventListener("click", goToClub)
        },
        onDeselected: (element) => {
          element?.classList.remove(PULSE_CLS)
          element?.removeEventListener("click", goToClub)
        },
        popover: {
          title: t("onboarding.v2.club.title", "Entra en Club"),
          description: t("onboarding.v2.club.description", "Pulsa aquí. Esto es lo que tienes por ser del Club."),
          nextBtnText: t("onboarding.v2.club.cta", "Ir a Club"),
          onNextClick: () => {
            clubLink?.classList.remove(PULSE_CLS)
            void goToClub()
          },
        },
      },
      {
        element: optional("tour-club-masterclasses"),
        popover: {
          title: t("onboarding.v2.masterclass.title", "La masterclass del mes"),
          description: t(
            "onboarding.v2.masterclass.description",
            "Con el Plan Club, cada mes Guille graba una masterclass nueva para ti, a partir de vuestras preguntas. Mírala cuando quieras; aquí están también las anteriores.",
          ),
          // Ya en Club: volver atrás llevaría a pasos de Inicio, que aquí no existen.
          showButtons: ["next", "close"],
        },
      },
      {
        element: optional("tour-club-questions"),
        popover: {
          title: t("onboarding.v2.questions.title", "Envía tus preguntas"),
          description: t(
            "onboarding.v2.questions.description",
            "¿Hay algo que no entiendes de tu juego? Pregúntanos. Leemos todas las preguntas y Guille va respondiéndolas en las próximas masterclasses.",
          ),
        },
      },
      {
        // El botón de feedback flota en escritorio y es un icono de la cabecera en móvil/tablet.
        element: byLayout("tour-feedback-button", "tour-feedback-button-mobile"),
        popover: {
          title: t("onboarding.v2.feedback.title", "Estamos construyendo esto contigo"),
          description: t(
            "onboarding.v2.feedback.description",
            "Si algo falla o se te ocurre una idea, cuéntanoslo aquí, desde cualquier pantalla. Cada mensaje nos ayuda a mejorar.",
          ),
        },
      },
      {
        element: byLayout("tour-como-funciona-desktop", "tour-como-funciona-mobile"),
        popover: {
          title: t("onboarding.v2.how.title", "Cómo funciona"),
          description: t("onboarding.v2.how.description", "Si quieres entender el método antes de empezar, está todo aquí. ¡Disfrútalo!"),
          onNextClick: () => {
            finish(tour)
            navigate("/app/como-funciona")
          },
        },
      },
    ])),
  })

  tour.drive()
}

/** Pone Siguiente, Atrás y la "x" en los pasos que no fijan sus propios botones. */
function withCloseButton(steps: DriveStep[]): DriveStep[] {
  return steps.map((step) =>
    step.popover && !step.popover.showButtons ? { ...step, popover: { ...step.popover, showButtons: ["next", "previous", "close"] } } : step,
  )
}
