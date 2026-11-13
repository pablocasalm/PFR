/**
 * Interruptor del muñeco (asistente, tarjeta #147). Apagado por defecto, como las píldoras: sin
 * `VITE_ASSISTANT_ENABLED=true` (en Netlify o en .env.local) no sale el botón, ni el globo de avisos
 * ni el panel, y la app no pide avisos al backend.
 */
export const ASSISTANT_ENABLED = import.meta.env.VITE_ASSISTANT_ENABLED === "true"

/**
 * Hueco que ocupa el muñeco (px). Todavía no hay personaje: el botón provisional tiene ya el
 * tamaño final para ver cómo encaja encima de la barra del móvil y del botón de Feedback.
 */
export const MUNECO_SIZE = 64

/**
 * Pantallas donde el muñeco se esconde para no estorbar: reproductores, formularios y paneles de
 * administración. Precios también: es adonde lleva el adelanto de Essential.
 */
const HIDDEN_PATHS = [/^\/app\/(watch|pildoras|encuesta|publicar|editar|admin|precios|mi-cuenta)(\/|$)/]

export const isAssistantHiddenOn = (pathname: string) => HIDDEN_PATHS.some((re) => re.test(pathname))
