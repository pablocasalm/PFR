import type { FormEvent, RefObject } from "react"
import { useEffect, useState } from "react"
import { cn } from "../../lib/utils"
import { sendLandingEmail } from "../../../services/landingService"
import { usePrefersReducedMotion } from "./motion"

type EmailCaptureProps = {
  id?: string
  inputId?: string
  inputRef?: RefObject<HTMLInputElement | null>
  placeholder?: string
  buttonLabel?: string
  microcopy?: string
  className?: string
}

const STORAGE_KEY = "padel-film-room-waitlist"

const EmailCapture = ({
  id,
  inputId,
  inputRef,
  placeholder = "Tu email",
  buttonLabel = "Únete a la lista privada",
  microcopy,
  className,
}: EmailCaptureProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "stored">("idle")
  const [error, setError] = useState("")
  const [storedEmail, setStoredEmail] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[]
      if (stored.length > 0) {
        setStoredEmail(stored[stored.length - 1])
        setStatus("stored")
      }
    } catch {
      // ignore
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === "loading") return
    const trimmed = email.trim().toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)

    if (!isValid) {
      setError("Revisa el email e inténtalo de nuevo.")
      setStatus("error")
      return
    }

    setError("")
    setStatus("loading")

    try {
      await sendLandingEmail(trimmed)

      setStatus("success")
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[]
        const updated = Array.from(new Set([...stored, trimmed]))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        setStoredEmail(trimmed)
      } catch {
        // Silent fail for browsers without localStorage access.
      }

      setEmail("")
      setTimeout(() => setStatus("idle"), 4000)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo enviar el email. Inténtalo de nuevo."
      setError(message)
      setStatus("error")
    }
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex w-full flex-col gap-3 md:flex-row md:items-center", className)}
      aria-label="Formulario de lista privada"
    >
      <div className="flex w-full flex-col gap-2">
        <input
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          ref={inputRef}
          onChange={(event) => {
            setEmail(event.target.value)
            if (status !== "loading") {
              setStatus("idle")
              setError("")
            }
          }}
          placeholder={placeholder}
          aria-label="Correo electrónico"
          aria-invalid={status === "error"}
          className={cn(
            "h-12 w-full rounded-full border border-white/10 bg-[#0a0f18] px-5 text-sm text-white placeholder:text-white/35 shadow-inner shadow-black/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60",
            status === "error" && "border-rose-400/60"
          )}
        />
        {(error || status === "success" || status === "stored" || microcopy) && (
          <p
            className={cn(
              "text-xs text-white/60",
              status === "error" && "text-rose-300",
              (status === "success" || status === "stored") && "text-emerald-300"
            )}
            aria-live="polite"
          >
            {error ||
              (status === "success"
                ? "Estás dentro. Te avisaremos pronto."
                : status === "stored"
                  ? `Ya estás apuntado${storedEmail ? ` (${storedEmail})` : ""}.`
                  : microcopy)}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className={cn(
          "group relative inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-70",
          !reduceMotion && "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 active:scale-[0.98]"
        )}
        aria-busy={status === "loading"}
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <span className="absolute inset-0 rounded-full bg-white/80 blur-sm" />
        </span>
        <span className="relative flex items-center gap-2">
          {status === "success" ? (
            <>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Estás dentro
            </>
          ) : status === "loading" ? (
            "Enviando..."
          ) : (
            buttonLabel
          )}
        </span>
      </button>
      {(status === "success" || status === "stored") && (
        <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#0b111b] px-4 py-2 text-[10px] font-mono uppercase tracking-[0.28em] text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Added to private list
        </div>
      )}
    </form>
  )
}

export default EmailCapture
