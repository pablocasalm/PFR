import { useState } from "react"

/**
 * Compartir contenido (§9.4/§10.5). Usa la Web Share API nativa cuando existe
 * (hoja de compartir del sistema, ideal en móvil) y, si no, copia el enlace al
 * portapapeles y devuelve `copied` para dar feedback visual ("¡Enlace copiado!").
 */
export function useShare(title?: string) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? document.title, url })
        return
      } catch (e) {
        // El usuario canceló la hoja de compartir: no hacemos fallback.
        if ((e as Error)?.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sin portapapeles disponible: no hay más que hacer */
    }
  }

  return { share, copied }
}
