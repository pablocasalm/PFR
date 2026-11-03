import { markVideoTourSeenAndSync, setLocalVideoPreferences } from "../auth/store"
import { updateMyPreferences } from "../api/profile"

/**
 * Fin del tour del vídeo (#130), compartido por Clip y Video: se marca como visto en la cuenta
 * (no vuelve a salir en ningún dispositivo) y, si lo ha pedido, lo elegido pasa a ser su ajuste
 * para todos los vídeos: los mismos dos ajustes que Mi Cuenta ("Audio de los vídeos" y
 * "Activar subtítulos automáticamente"). El idioma de la app no se toca.
 */
export async function handleVideoTourDone(choice: { audio: "es" | "en"; subtitles: boolean }, saveAsDefault: boolean) {
  void markVideoTourSeenAndSync()
  if (!saveAsDefault) return
  setLocalVideoPreferences({ videoAudioLanguage: choice.audio, subtitlesDefaultOn: choice.subtitles }) // optimista
  try {
    await updateMyPreferences({ videoAudioLanguage: choice.audio, subtitlesDefaultOn: choice.subtitles })
  } catch {
    // No crítico: el vídeo ya está como lo quiere y en Mi Cuenta lo puede volver a guardar.
  }
}

/** Audio de la cuenta para el reproductor ("es" si no hay o no es válido). */
export const audioDefaultOf = (videoAudioLanguage?: string): "es" | "en" => (videoAudioLanguage === "en" ? "en" : "es")
