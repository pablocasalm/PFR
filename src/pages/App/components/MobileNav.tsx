import { NavLink } from "react-router-dom"
import { Home, Compass, Bookmark, BarChart2, BookOpen } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { useAuth, isAdmin } from "../../../lib/auth/store"

/**
 * Barra de navegación inferior — móvil y tablet (xl:hidden; el nav de escritorio del
 * Header no cabe bien por debajo de 1280px, ni siquiera en iPad). Para Admin, que tiene 4
 * pestañas más en el Header, el corte se retrasa a 2xl (§reporte de beta #52) — mismo
 * punto que usa Header.tsx, para que ninguno de los dos deje un hueco sin nav.
 *
 * Sin "Buscar": la lupa vive ahora en el Header (junto al avatar, como en escritorio) y
 * abre el overlay de búsqueda en vez de ser una pestaña propia — antes navegaba directo a
 * la pantalla de Resultados, que es un destino de "después de buscar", no de navegación.
 */

// Mismas claves de i18n que Header.tsx (header.nav.*): es el mismo texto, solo cambia el layout.
const ITEMS = [
  { to: "/app/inicio", key: "header.nav.inicio", label: "Inicio", icon: Home },
  { to: "/app/explorar", key: "header.nav.explorar", label: "Explorar", icon: Compass },
  { to: "/app/mi-lista", key: "header.nav.mi-lista", label: "Mi Lista", icon: Bookmark },
  { to: "/app/mi-juego", key: "header.nav.mi-juego", label: "Mi Juego", icon: BarChart2 },
  { to: "/app/como-funciona", key: "header.nav.como-funciona", label: "Cómo funciona", icon: BookOpen },
]

const MobileNav = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  // Mismo punto de corte que Header.tsx — ver ahí el porqué de 1460px para Admin.
  const navBp = isAdmin(user) ? "min-[1460px]" : "xl"
  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-1 py-2 backdrop-blur-md ${navBp === "xl" ? "xl:hidden" : "min-[1460px]:hidden"}`}
    >
      {ITEMS.map(({ to, key, label, icon: Icon }) => (
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
          {t(key, label)}
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileNav
