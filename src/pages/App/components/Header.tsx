import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { Search, Play, ChevronDown } from "lucide-react"

/**
 * Header compartido del nuevo dashboard (/app).
 * Usa NavLink para resaltar la sección activa de forma real.
 */

const NAV_ITEMS = [
  { label: "Inicio", to: "/app/inicio" },
  { label: "Explorar", to: "/app/explorar" },
  { label: "Mi Lista", to: "/app/mi-lista" },
  { label: "Mi Juego", to: "/app/mi-juego" },
]

const Header = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const submitSearch = () => {
    const q = query.trim()
    if (q) navigate(`/app/search?q=${encodeURIComponent(q)}`)
  }

  return (
  <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
    <div className="flex w-full items-center gap-6 px-10 py-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
          <Play className="h-5 w-5" fill="currentColor" />
        </div>
        <div className="leading-none">
          <p className="text-sm font-bold uppercase tracking-wide text-white">Padel</p>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Film Room</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-7">
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {label}
                {isActive && (
                  <span className="absolute -bottom-[18px] left-0 h-[2px] w-full rounded-full bg-neon-cyan" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Buscador */}
      <div className="ml-auto flex max-w-xl flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5">
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          placeholder="Buscar clips, conceptos, jugadores..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {/* Avatar */}
      <button className="flex items-center gap-1.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-cyan text-sm font-bold text-midnight">
          MP
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>
    </div>
  </header>
  )
}

export default Header
