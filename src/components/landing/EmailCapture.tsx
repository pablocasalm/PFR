import type { FormEvent } from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"

type EmailCaptureProps = {
  id?: string
  placeholder?: string
  buttonLabel?: string
  microcopy?: string
  className?: string
}

const STORAGE_KEY = "padel-film-room-waitlist"

const EmailCapture = ({
  id,
  placeholder = "Tu email",
  buttonLabel = "Unete a la lista privada",
  microcopy,
  className,
}: EmailCaptureProps) => {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = email.trim().toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)

    if (!isValid) {
      setError("Introduce un email valido.")
      setSubmitted(false)
      return
    }

    setError("")
    setSubmitted(true)

    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[]
      const updated = Array.from(new Set([...stored, trimmed]))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Silent fail for browsers without localStorage access.
    }

    setEmail("")
    setTimeout(() => setSubmitted(false), 4000)
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
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={placeholder}
          aria-label="Correo electronico"
          aria-invalid={Boolean(error)}
          className={cn(
            "h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white placeholder:text-white/40 shadow-inner shadow-black/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            error && "border-rose-400/60"
          )}
        />
        {(error || submitted || microcopy) && (
          <p
            className={cn(
              "text-xs text-white/60",
              error && "text-rose-300",
              submitted && !error && "text-emerald-300"
            )}
            aria-live="polite"
          >
            {error || (submitted ? "Dentro. Te avisaremos pronto." : microcopy)}
          </p>
        )}
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:translate-y-0"
      >
        {buttonLabel}
      </button>
    </form>
  )
}

export default EmailCapture
