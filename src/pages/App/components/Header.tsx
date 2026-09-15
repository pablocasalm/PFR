import { useEffect, useRef, useState } from "react"
import { NavLink, Link, useNavigate } from "react-router-dom"
import { Search, ChevronDown, LogOut, UploadCloud, Ticket, Inbox, Megaphone, UserCircle } from "lucide-react"
import { useAuth, canPublish, isAdmin, type AuthUser } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import SearchOverlay from "./SearchOverlay"
import NewsBell from "./NewsBell"
import LanguageSelector from "./LanguageSelector"

/**
 * Header compartido del nuevo dashboard (/app).
 * Usa NavLink para resaltar la sección activa de forma real.
 */

// `key`: id de traducción (i18n, por ahora sin importar en BD). `label`: texto en español,
// se pasa como fallback a t() — así la pantalla no cambia hasta que se importe la traducción.
const NAV_ITEMS = [
  { key: "header.nav.inicio", label: "Inicio", to: "/app/inicio" },
  { key: "header.nav.explorar", label: "Explorar", to: "/app/explorar" },
  { key: "header.nav.mi-lista", label: "Mi Lista", to: "/app/mi-lista" },
  { key: "header.nav.mi-juego", label: "Mi Juego", to: "/app/mi-juego" },
  { key: "header.nav.como-funciona", label: "Cómo funciona", to: "/app/como-funciona" },
]

const Header = () => {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { user } = useAuth()
  const { t } = useI18n()
  // Admin tiene 4 pestañas más que un usuario normal (Publicar, Invitaciones, Reportes,
  // Noticias) y no cabían ya en el punto de corte "xl" (1280px) pensado para las 5 base — se
  // pasa al menú inferior (barra + avatar) más tarde, en "2xl" (§reporte de beta #52).
  const navBp = isAdmin(user) ? "2xl" : "xl"

  const submitSearch = () => {
    const q = query.trim()
    if (q) navigate(`/app/search?q=${encodeURIComponent(q)}`)
  }

  return (
  <>
  <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-md">
    <div className="flex w-full items-center gap-4 px-4 py-4 sm:px-6 md:gap-6 lg:px-10">
      {/* Logo: vuelve a Inicio */}
      <Link to="/app/inicio" className="flex items-center gap-3">
        <img
          src="/Logos/favicon_sinfondo.png"
          alt="Padel Film Room"
          className="h-11 w-11 shrink-0 object-contain"
        />
        <div className="leading-none">
          <p className="text-sm font-bold uppercase tracking-wide text-white">Padel</p>
          <p className="text-sm font-bold uppercase tracking-wide text-white">Film Room</p>
        </div>
      </Link>

      {/* Nav (solo escritorio; en móvil/tablet se usa la barra inferior) */}
      <nav className={`hidden items-center gap-7 ${navBp === "2xl" ? "2xl:flex" : "xl:flex"}`}>
        {NAV_ITEMS.map(({ key, label, to }) => (
          <NavLink
            key={to}
            to={to}
            id={to === "/app/como-funciona" ? "tour-como-funciona-desktop" : undefined}
            className={({ isActive }) =>
              `relative text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {t(key, label)}
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
            {t("header.nav.publicar", "Publicar")}
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
            {t("admin-invites.title", "Invitaciones")}
          </NavLink>
        )}
        {isAdmin(user) && (
          <NavLink
            to="/app/admin/reportes"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            <Inbox className="h-4 w-4" />
            {t("admin-feedback.title", "Reportes")}
          </NavLink>
        )}
        {isAdmin(user) && (
          <NavLink
            to="/app/admin/noticias"
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
              }`
            }
          >
            <Megaphone className="h-4 w-4" />
            {t("header.nav.noticias", "Noticias")}
          </NavLink>
        )}
      </nav>

      {/* Buscador (escritorio) */}
      <div
        className={`ml-auto hidden max-w-xl flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 ${navBp === "2xl" ? "2xl:flex" : "xl:flex"}`}
      >
        <Search className="h-4 w-4 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          placeholder={t("header.search.placeholder", "Buscar clips, conceptos, jugadores...")}
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
      </div>

      {/* Buscar (móvil/tablet): abre el overlay de búsqueda, no navega directo */}
      <button
        onClick={() => setMobileSearchOpen(true)}
        className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white ${navBp === "2xl" ? "2xl:hidden" : "xl:hidden"}`}
        aria-label="Buscar"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Idioma */}
      <LanguageSelector />

      {/* Noticias */}
      <NewsBell />

      {/* Sesión */}
      <SessionControl />
    </div>
  </header>
  <SearchOverlay open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />
  </>
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
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // El header tiene backdrop-blur, y eso convierte a `fixed` en descendientes en algo anclado al
    // propio header (no al viewport) — un `fixed inset-0` para detectar clics fuera no cubriría el
    // resto de la página. Por eso el cierre al clicar fuera se hace con un listener real, no con una
    // capa superpuesta.
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [menuOpen])

  if (!user) return null

  return (
    <div className="relative" ref={rootRef}>
      <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-cyan text-sm font-bold text-midnight">
          {initials(user)}
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>

      {menuOpen && (
          <div className="absolute right-0 top-12 z-40 w-56 rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{user.displayName || t("mi-cuenta.title", "Mi cuenta")}</p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
            <Link
              to="/app/mi-cuenta"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              <UserCircle className="h-4 w-4" />
              {t("mi-cuenta.title", "Mi cuenta")}
            </Link>
            {canPublish(user) && (
              <Link
                to="/app/publicar"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <UploadCloud className="h-4 w-4" />
                {t("header.nav.publicar", "Publicar")}
              </Link>
            )}
            {isAdmin(user) && (
              <Link
                to="/app/admin/invitaciones"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <Ticket className="h-4 w-4" />
                {t("admin-invites.title", "Invitaciones")}
              </Link>
            )}
            {isAdmin(user) && (
              <Link
                to="/app/admin/reportes"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <Inbox className="h-4 w-4" />
                {t("admin-feedback.title", "Reportes")}
              </Link>
            )}
            {isAdmin(user) && (
              <Link
                to="/app/admin/noticias"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
              >
                <Megaphone className="h-4 w-4" />
                {t("header.nav.noticias", "Noticias")}
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
              {t("header.logout", "Cerrar sesión")}
            </button>
          </div>
      )}
    </div>
  )
}

export default Header
