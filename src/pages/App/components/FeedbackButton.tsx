import { useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { MessageSquarePlus, X, Check } from "lucide-react"
import { sendFeedback } from "../../../lib/api/feedback"

/**
 * Botón flotante de feedback para la beta. Visible en toda la app. Al enviar, adjunta
 * automáticamente el contexto: la ruta actual y, si estás viendo un clip/análisis, su id.
 */
const FeedbackButton = () => {
  const location = useLocation()
  const [params] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const close = () => {
    setOpen(false)
    setSent(false)
    setMessage("")
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
        page: location.pathname + location.search,
        contentType: clip ? "clip" : analysis ? "analysis" : undefined,
        contentId: clip ?? analysis ?? undefined,
      })
      setSent(true)
      setMessage("")
    } catch {
      // Silencioso: no bloqueamos al usuario si falla el envío.
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-neon-cyan/40 bg-midnight/90 px-4 py-2.5 text-sm font-semibold text-neon-cyan shadow-lg backdrop-blur transition hover:bg-neon-cyan/10 md:bottom-6"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-midnight p-5 sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Enviar feedback</h2>
              <button onClick={close} aria-label="Cerrar" className="text-white/60 transition hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                  <Check className="h-6 w-6" />
                </span>
                <p className="text-sm text-white">¡Gracias! Lo tendremos en cuenta.</p>
                <button
                  onClick={close}
                  className="mt-1 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-white/60">¿Qué mejorarías? ¿Has visto algún fallo? Cuéntanoslo.</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Escribe tu comentario..."
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none"
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
