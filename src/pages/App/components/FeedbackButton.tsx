import { useEffect, useRef, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { MessageSquarePlus, X, Check, Bug, Lightbulb, MessageCircle, UploadCloud, Trash2 } from "lucide-react"
import { sendFeedback, type FeedbackType } from "../../../lib/api/feedback"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Botón flotante de feedback para la beta. Visible en toda la app. El usuario elige primero
 * el tipo (fallo / idea / otro) y escribe el mensaje. Se adjunta automáticamente el contexto:
 * la ruta actual y, si está viendo un clip/análisis, su id (el navegador lo añade el backend).
 */

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug; hint: string }[] = [
  { key: "bug", label: "Fallo", icon: Bug, hint: "Algo no funciona o se ve mal. Cuéntanos qué pasó y qué esperabas." },
  { key: "idea", label: "Idea", icon: Lightbulb, hint: "Una mejora o algo que echas en falta. ¡Nos encanta leerlas!" },
  { key: "other", label: "Otro", icon: MessageCircle, hint: "Cualquier otro comentario que quieras hacernos llegar." },
]

const FeedbackButton = () => {
  const location = useLocation()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>("bug")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // En móvil el botón flota sobre contenido largo con scroll: se aparta mientras se
  // hace scroll hacia abajo (para no tapar tarjetas/enlaces) y vuelve al parar o subir.
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  useEffect(() => {
    lastY.current = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        setHidden(y > lastY.current && y > 120)
        lastY.current = y
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(null)
    setImagePreview(null)
    setImageError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const close = () => {
    setOpen(false)
    setSent(false)
    setMessage("")
    setType("bug")
    clearImage()
  }

  const onPickImage = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setImageError("El archivo debe ser una imagen.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("La imagen no puede superar 5 MB.")
      return
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setImageError(null)
  }

  const onSubmit = async () => {
    const text = message.trim()
    if (!text || sending) return
    setSending(true)
    // Contexto: en /app/watch el clip va en ?c= y el análisis en ?v=.
    const clip = params.get("c")
    const analysis = params.get("v")
    try {
      await sendFeedback({
        message: text,
        type,
        page: location.pathname + location.search,
        contentType: clip ? "clip" : analysis ? "analysis" : undefined,
        contentId: clip ?? analysis ?? undefined,
        image: image ?? undefined,
      })
      setSent(true)
      setMessage("")
      clearImage()
    } catch {
      // Silencioso: no bloqueamos al usuario si falla el envío.
    } finally {
      setSending(false)
    }
  }

  const activeHint = TYPES.find((t) => t.key === type)?.hint ?? ""

  return (
    <>
      <button
        id="tour-feedback-button"
        onClick={() => setOpen(true)}
        aria-label="Reportar un fallo o enviar feedback"
        className={`fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-midnight/90 px-4 py-2.5 text-sm font-semibold text-neon-cyan shadow-lg backdrop-blur transition-all duration-300 hover:bg-neon-cyan/10 xl:bottom-6 xl:left-auto xl:right-6 xl:translate-y-0 xl:opacity-100 ${
          hidden ? "translate-y-20 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Reportar / Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-midnight p-5 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">¿Qué quieres contarnos?</h2>
              <button onClick={close} aria-label="Cerrar" className="text-white/60 transition hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                  <Check className="h-6 w-6" />
                </span>
                <p className="text-sm text-white">¡Gracias! Lo revisaremos y lo iremos solucionando.</p>
                <button
                  onClick={close}
                  className="mt-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Selector de tipo */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {TYPES.map(({ key, label, icon: Icon }) => {
                    const active = type === key
                    return (
                      <button
                        key={key}
                        onClick={() => setType(key)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-semibold transition ${
                          active
                            ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan"
                            : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    )
                  })}
                </div>

                <p className="mb-3 text-sm text-white/60">{activeHint}</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                {imagePreview ? (
                  <div className="mb-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
                    <img src={imagePreview} alt="Captura adjunta" className="h-12 w-12 shrink-0 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate text-xs text-white/60">{image?.name}</span>
                    <button
                      onClick={clearImage}
                      aria-label="Quitar imagen"
                      className="shrink-0 p-1 text-white/50 transition hover:text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-center transition hover:border-neon-cyan/40 hover:bg-white/5 active:bg-white/5"
                  >
                    <UploadCloud className="h-5 w-5 text-white/50" />
                    <span className="text-xs font-medium text-white/70">Adjuntar una captura (opcional)</span>
                    <span className="text-[11px] text-white/35">PNG, JPG o WEBP · máx. 5&nbsp;MB</span>
                  </button>
                )}
                {imageError && <p className="-mt-2 mb-3 text-xs text-red-400">{imageError}</p>}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={type === "bug" ? "¿Qué ocurrió? ¿En qué pantalla?" : "Escribe tu comentario..."}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
                />

                <button
                  onClick={onSubmit}
                  disabled={!message.trim() || sending}
                  className="mt-3 w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FeedbackButton
