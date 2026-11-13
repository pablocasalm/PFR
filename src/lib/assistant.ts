/**
 * Interruptor del muñeco (asistente, tarjeta #147). Apagado por defecto, como las píldoras: sin
 * `VITE_ASSISTANT_ENABLED=true` (en Netlify o en .env.local) no sale el botón, ni el globo de avisos
 * ni el panel, y la app no pide avisos al backend.
 */
export const ASSISTANT_ENABLED = import.meta.env.VITE_ASSISTANT_ENABLED === "true"

/** Nombre del muñeco (Padel Film Room Intelligence). Va en los textos como `{name}`: si cambia, solo aquí. */
export const ASSISTANT_NAME = "PAFRI"

/** Tamaño del muñeco (px), encima de la barra del móvil y del botón de Feedback. */
export const MUNECO_SIZE = 80

/**
 * Pantallas donde el muñeco se esconde para no estorbar: reproductores, formularios y paneles de
 * administración. Precios también: es adonde lleva el adelanto de Essential.
 */
const HIDDEN_PATHS = [/^\/app\/(watch|pildoras|encuesta|publicar|editar|admin|precios|mi-cuenta)(\/|$)/]

export const isAssistantHiddenOn = (pathname: string) => HIDDEN_PATHS.some((re) => re.test(pathname))

/** Si ya se ha abierto alguna vez en este navegador: hasta entonces, PAFRI saluda. */
const GREETED_KEY = "pfr.pafri.greeted"

export const hasGreeted = () => {
  try {
    return localStorage.getItem(GREETED_KEY) === "1"
  } catch {
    return true
  }
}

export const markGreeted = () => {
  try {
    localStorage.setItem(GREETED_KEY, "1")
  } catch {
    // Sin localStorage (modo privado estricto): saludará en cada visita, no pasa nada.
  }
}
