import { NavLink } from "react-router-dom"
import { Home, Compass, Search, Bookmark, BarChart2 } from "lucide-react"

/**
 * Barra de navegación inferior — solo móvil (md:hidden). Las 4 secciones + Buscar,
 * patrón habitual en apps de móvil. En escritorio se usa el nav del Header.
 */

const ITEMS = [
  { to: "/app/inicio", label: "Inicio", icon: Home },
  { to: "/app/explorar", label: "Explorar", icon: Compass },
  { to: "/app/search", label: "Buscar", icon: Search },
  { to: "/app/mi-lista", label: "Mi Lista", icon: Bookmark },
  { to: "/app/mi-juego", label: "Mi Juego", icon: BarChart2 },
]

const MobileNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-1 py-2 backdrop-blur-md md:hidden">
    {ITEMS.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
            isActive ? "text-neon-cyan" : "text-white/50"
          }`
        }
      >
        <Icon className="h-5 w-5" />
        {label}
      </NavLink>
    ))}
  </nav>
)

export default MobileNav
