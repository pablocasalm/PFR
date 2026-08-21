import { NavLink } from "react-router-dom"
import { Home, Compass, Bookmark, BarChart2, BookOpen } from "lucide-react"

/**
 * Barra de navegación inferior — móvil y tablet (xl:hidden; el nav de escritorio del
 * Header no cabe bien por debajo de 1280px, ni siquiera en iPad).
 *
 * Sin "Buscar": la lupa vive ahora en el Header (junto al avatar, como en escritorio) y
 * abre el overlay de búsqueda en vez de ser una pestaña propia — antes navegaba directo a
 * la pantalla de Resultados, que es un destino de "después de buscar", no de navegación.
 */

const ITEMS = [
  { to: "/app/inicio", label: "Inicio", icon: Home },
  { to: "/app/explorar", label: "Explorar", icon: Compass },
  { to: "/app/mi-lista", label: "Mi Lista", icon: Bookmark },
  { to: "/app/mi-juego", label: "Mi Juego", icon: BarChart2 },
  { to: "/app/como-funciona", label: "Cómo funciona", icon: BookOpen },
]

const MobileNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-1 py-2 backdrop-blur-md xl:hidden">
    {ITEMS.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        id={to === "/app/como-funciona" ? "tour-como-funciona-mobile" : undefined}
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
