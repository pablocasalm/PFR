import { NavLink } from "react-router-dom"
import { Home, Compass, BarChart2, Crown, Sparkles, Lock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAuth, hasFeature, type PlanFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Barra de navegación inferior — móvil y tablet (xl:hidden; el nav de escritorio del
 * Header no cabe bien por debajo de 1280px, ni siquiera en iPad). Mismo punto de corte
 * para todos los roles: las pestañas de Admin ya no viven en el nav de escritorio (solo
 * en el desplegable del avatar), así que no hace falta un caso especial aquí tampoco.
 *
 * Cinco accesos, priorizando lo que vende el producto: Inicio, Mi Juego, Explorar, Club y
 * Coach (en ese orden, de menos a más plan). Coach y Club salen SIEMPRE, también para quien no tiene ese plan (con un candado
 * pequeño): al entrar, la propia pantalla le lleva a /app/precios, así que la pestaña hace de
 * escaparate. "Mi Lista" y "Cómo funciona" viven en el menú del avatar (Header.tsx), que es
 * también donde apunta el último paso del tour de bienvenida en este layout.
 *
 * Sin "Buscar": la lupa vive en el Header (junto al avatar, como en escritorio) y abre el
 * overlay de búsqueda en vez de ser una pestaña propia.
 */

// Mismas claves de i18n que Header.tsx (header.nav.*): es el mismo texto, solo cambia el layout.
// `feature`: función del plan que hace falta para entrar — sin ella, la pestaña lleva candado.
const ITEMS: { to: string; key: string; label: string; icon: LucideIcon; feature?: PlanFeature }[] = [
  { to: "/app/inicio", key: "header.nav.inicio", label: "Inicio", icon: Home },
  { to: "/app/mi-juego", key: "header.nav.mi-juego", label: "Mi Juego", icon: BarChart2 },
  { to: "/app/explorar", key: "header.nav.explorar", label: "Explorar", icon: Compass },
  { to: "/app/club", key: "header.nav.club", label: "Club", icon: Crown, feature: "monthlyPicks" },
  { to: "/app/coach", key: "header.nav.coach", label: "Coach", icon: Sparkles, feature: "personalAnalysis" },
]

const MobileNav = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-1 py-2 backdrop-blur-md xl:hidden">
      {ITEMS.map(({ to, key, label, icon: Icon, feature }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? "text-neon-cyan" : "text-white/50"
            }`
          }
        >
          <span className="relative">
            <Icon className="h-5 w-5" />
            {feature && !hasFeature(user, feature) && (
              <Lock className="absolute -right-2 -top-1 h-2.5 w-2.5 text-white/60" strokeWidth={3} aria-hidden />
            )}
          </span>
          {t(key, label)}
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileNav
