import { useState } from "react"
import { NavLink, Link, useNavigate } from "react-router-dom"
import { Search, ChevronDown, LogOut, UploadCloud, Ticket } from "lucide-react"
import { useAuth, canPublish, isAdmin, type AuthUser } from "../../../lib/auth/store"

/**
 * Header compartido del nuevo dashboard (/app).
 * Usa NavLink para resaltar la sección activa de forma real.
 */

const NAV_ITEMS = [
  { label: "Inicio", to: "/app/inicio" },
  { label: "Explorar", to: "/app/explorar" },
  { label: "Mi Lista", to: "/app/mi-lista" },
  { label: "Mi Juego", to: "/app/mi-juego" },
  { label: "Cómo funciona", to: "/app/como-funciona" },
]

const Header = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const { user } = useAuth()

  const submitSearch = () => {
    const q = query.trim()
    if (q) navigate(`/app/search?q=${encodeURIComponent(q)}`)
  }

  return (
  <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
    <div className="flex w-full items-center gap-4 px-4 py-4 sm:px-6 md:gap-6 lg:px-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/Logos/favicon.png"
          alt="Padel Film Room"
          className="h-11 w-11 shrink-0 rounded-full object-contain"
        />
        <div className="leading-none">
          <p className="text-sm font-bold uppercase tracking-wide text-white">Padel</p>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Film Room</p>
        </div>
      </div>

      {/* Nav (solo escritorio; en móvil se usa la barra inferior) */}
      <nav className="hidden items-center gap-7 md:flex">
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
        {canPublish(user) && (
          <NavLink
            to="/app/publicar"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            <UploadCloud className="h-4 w-4" />
            Publicar
          </NavLink>
        )}
        {isAdmin(user) && (
          <NavLink
            to="/app/admin/invitaciones"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            <Ticket className="h-4 w-4" />
            Invitaciones
          </NavLink>
        )}
      </nav>

      {/* Buscador (escritorio) */}
      <div className="ml-auto hidden max-w-xl flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 md:flex">
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          placeholder="Buscar clips, conceptos, jugadores..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {/* Buscar (móvil): icono que lleva a la pantalla de búsqueda */}
      <button
        onClick={() => navigate("/app/search")}
        className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white md:hidden"
        aria-label="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Sesión */}
      <SessionControl />
    </div>
  </header>
  )
}

/** Iniciales a partir del nombre o, si no hay, del email. */
const initials = (user: AuthUser) => {
  const base = user.displayName?.trim() || user.email
  const parts = base.split(/[\s@.]+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Avatar con menú de logout. Dentro de /app siempre hay sesión (lo garantiza RequireAuth). */
const SessionControl = () => {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-cyan text-sm font-bold text-midnight">
          {initials(user)}
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>

      {menuOpen && (
        <>
          {/* Capa para cerrar al hacer clic fuera */}
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{user.displayName || "Mi cuenta"}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
            {canPublish(user) && (
              <Link
                to="/app/publicar"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <UploadCloud className="h-4 w-4" />
                Publicar
              </Link>
            )}
            {isAdmin(user) && (
              <Link
                to="/app/admin/invitaciones"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <Ticket className="h-4 w-4" />
                Invitaciones
              </Link>
            )}
            <button
              onClick={() => {
                setMenuOpen(false)
                logout()
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Header
