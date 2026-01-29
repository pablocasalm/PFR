import { Link } from "react-router-dom"

type DrawerLink = {
  label: string
  to?: string
  onClick?: () => void
}

type DrawerProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  links: DrawerLink[]
  footerLinks: DrawerLink[]
}

const Drawer = ({ isOpen, onClose, title = "Navegación", links, footerLinks }: DrawerProps) => (
  <div
    className={`fixed inset-0 z-40 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    aria-hidden={!isOpen}
  >
    <div
      className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    />
    <aside
      className={`absolute right-0 top-0 h-full w-72 border-l border-white/10 bg-midnight-soft/95 px-6 py-6 shadow-2xl backdrop-blur transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.3em] text-neon-cyan/70">{title}</p>
        <button type="button" onClick={onClose} className="focus-ring text-white/60 hover:text-white">
          ✕
        </button>
      </div>
      <nav className="mt-8 flex flex-col gap-2 text-base text-white">
        {links.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className="rounded-2xl px-4 py-3 transition-colors hover:bg-white/10"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick?.()
                onClose()
              }}
              className="rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/10"
            >
              {item.label}
            </button>
          ),
        )}
      </nav>
      <div className="my-6 h-px w-full bg-white/10" />
      <div className="flex flex-col gap-2 text-sm text-white/80">
        {footerLinks.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className="rounded-2xl px-4 py-2 transition-colors hover:bg-white/10"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onClick?.()
                onClose()
              }}
              className="rounded-2xl px-4 py-2 text-left transition-colors hover:bg-white/10"
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </aside>
  </div>
)

export default Drawer
