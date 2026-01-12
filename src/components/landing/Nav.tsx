import { useEffect, useState } from "react"
import { cn } from "../../lib/utils"

const links = [
  { label: "Que es", href: "#que-es" },
  { label: "Contenido", href: "#contenido" },
  { label: "Canales", href: "#canales" },
  { label: "FAQ", href: "#faq" },
]

const Nav = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-white/5 backdrop-blur transition",
        scrolled ? "bg-[#0b0f12]/80 shadow-lg shadow-black/20" : "bg-transparent"
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
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/30 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Unete
        </a>
      </div>
    </header>
  )
}

export default Nav
