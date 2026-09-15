import { useEffect, useRef, useState } from "react"
import { Globe } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Selector de idioma de la interfaz (§i18n). Solo se muestra si hay más de un idioma
 * activo (hoy es/en, sembrados por la migración) — con uno solo no aporta nada.
 * Mismo patrón de dropdown + cierre al clicar fuera que SessionControl en este archivo.
 */
const LanguageSelector = () => {
  const { lang, languages, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  if (languages.length < 2) return null

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-medium text-white/70 transition hover:text-white"
        aria-label="Idioma"
      >
        <Globe className="h-4 w-4" />
        {lang.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-40 rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setOpen(false)
                setLanguage(l.code)
              }}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5 ${
                l.code === lang ? "text-neon-cyan" : "text-white/80"
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector
