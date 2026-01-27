import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import { useState } from "react"
import Drawer from "../../components/ui/Drawer"
import { useAuth } from "../providers/AuthProvider"

const AppLayout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const navLinks = [
    { label: "Inicio", to: "/app", end: true },
    { label: "Clips", to: "/clips" },
    { label: "Colecciones", to: "/app/colecciones" },
    { label: "Guardados", to: "/app/guardados" },
  ]

  const footerLinks = [
    { label: "Perfil", to: "/app/perfil" },
    {
      label: "Cerrar sesión",
      onClick: () => {
        logout()
        navigate("/login")
      },
    },
  ]

  return (
    <div className="min-h-screen bg-film-room">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-midnight/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white md:hidden"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <Link to="/app" className="text-lg font-semibold tracking-tight text-white">
              Padel Film Room
            </Link>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `text-sm font-semibold uppercase tracking-[0.2em] transition-colors ${
                    isActive ? "text-neon-cyan" : "text-white/60 hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:text-white"
              aria-label="Buscar"
              onClick={() => {
                window.dispatchEvent(new Event("pfr:open-search"))
              }}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase text-white"
              aria-label="Abrir perfil"
            >
              PF
            </button>
          </div>
        </div>
      </header>
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        links={navLinks}
        footerLinks={footerLinks}
      />
      <Outlet />
    </div>
  )
}

export default AppLayout
