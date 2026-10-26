import { NavLink } from "react-router-dom"
import { Home, Compass, Bookmark, Crown, Sparkles, Lock, BarChart2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAuth, hasFeature, isAdmin, type PlanFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Barra de navegación inferior — móvil y tablet (xl:hidden; el nav de escritorio del
 * Header no cabe bien por debajo de 1280px, ni siquiera en iPad). Mismo punto de corte
 * para todos los roles: las pestañas de Admin ya no viven en el nav de escritorio (solo
 * en el desplegable del avatar), así que no hace falta un caso especial aquí tampoco.
 *
 * Cinco accesos: Mi Lista, Explorar, Inicio (en el centro), Club y una quinta según el plan
 * (26/10/2026, reporte #94): Coach para quien tiene el plan Coach; Mi Juego para Essential y
 * Club, que no ven Coach bloqueado (se promociona en campañas puntuales). Con Coach, Mi Juego
 * va en el menú del avatar (Header.tsx), junto a "Cómo funciona", que es también donde apunta
 * el último paso del tour de bienvenida en este layout. Club sale siempre, también sin el plan
 * (con un candado pequeño): al entrar, la propia pantalla lleva a /app/precios.
 *
 * Sin "Buscar": la lupa vive en el Header (junto al avatar, como en escritorio) y abre el
 * overlay de búsqueda en vez de ser una pestaña propia.
 */

// Mismas claves de i18n que Header.tsx (header.nav.*): es el mismo texto, solo cambia el layout.
// `feature`: función del plan que hace falta para entrar — sin ella, la pestaña lleva candado.
const ITEMS: { to: string; key: string; label: string; icon: LucideIcon; feature?: PlanFeature }[] = [
  { to: "/app/mi-lista", key: "header.nav.mi-lista", label: "Mi Lista", icon: Bookmark },
  { to: "/app/explorar", key: "header.nav.explorar", label: "Explorar", icon: Compass },
  { to: "/app/inicio", key: "header.nav.inicio", label: "Inicio", icon: Home },
  { to: "/app/club", key: "header.nav.club", label: "Club", icon: Crown, feature: "monthlyPicks" },
]

// Coach solo para quien tiene el plan Coach (reporte #94, 26/10/2026): al resto no se le
// enseña una pestaña bloqueada; Coach se promociona en campañas puntuales. En su lugar, para
// Essential y Club, FIFTH_TAB (o nada, y la barra queda en 4).
const COACH_TAB = { to: "/app/coach", key: "header.nav.coach", label: "Coach", icon: Sparkles }
const MI_JUEGO_TAB = { to: "/app/mi-juego", key: "header.nav.mi-juego", label: "Mi Juego", icon: BarChart2 }
const FIFTH_TAB: typeof MI_JUEGO_TAB | null = MI_JUEGO_TAB

const MobileNav = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-1 py-2 backdrop-blur-md xl:hidden">
      {[...ITEMS, ...(hasFeature(user, "personalAnalysis") ? [COACH_TAB] : FIFTH_TAB ? [FIFTH_TAB] : [])].map(({ to, key, label, icon: Icon, feature }: (typeof ITEMS)[number]) => (
        <NavLink
          key={to}
          to={to}
          // Anclas del tour de bienvenida (lib/onboarding/tour.ts).
          id={to === "/app/explorar" ? "tour-explorar-mobile" : to === "/app/club" ? "tour-club-mobile" : undefined}
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
            {/* Mensajes de Coach sin leer (para un admin el aviso va en su menú, no aquí). */}
            {to === "/app/coach" && !isAdmin(user) && (user?.coachUnread ?? 0) > 0 && (
              <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-black bg-neon-cyan" aria-hidden />
            )}
          </span>
          {t(key, label)}
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileNav
