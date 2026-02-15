import { useEffect, useState } from "react"
import { cn } from "../../lib/utils"

type NavProps = {
  onWaitlistClick?: () => void
}

const links = [
  { label: "Qué es", href: "#que-es" },
  { label: "Ejemplo", href: "#ejemplo" },
  { label: "Contenido", href: "#contenido" },
  { label: "FAQ", href: "#faq" },
]

const Nav = ({ onWaitlistClick }: NavProps) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-black"
      >
        Saltar al contenido
      </a>
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b border-white/5 backdrop-blur transition",
          scrolled ? "bg-[#0b0f12]/85 shadow-lg shadow-black/20" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a
            href="#top"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:text-white"
            aria-label="Padel Film Room"
          >
            Padel Film Room
          </a>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex" aria-label="Principal">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={onWaitlistClick}
            className="group relative inline-flex items-center justify-center rounded-full border border-white/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <span className="absolute inset-0 rounded-full bg-white/80 blur-sm" />
            </span>
            <span className="relative">Waitlist</span>
          </button>
        </div>
      </header>
    </>
  )
}

export default Nav
