import { Link } from "react-router-dom"
import PageShell from "../../components/layout/PageShell"
import { buttonClasses } from "../../components/ui/Button"

const Mantenimiento = () => (
  <div className="min-h-screen bg-film-room text-white">
    <main className="pb-16 pt-20">
      <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="h-20 w-20 hammer-swing"
            fill="none"
          >
            <rect x="22" y="80" width="76" height="14" rx="4" fill="#0b0f12" />
            <rect x="46" y="40" width="12" height="55" rx="6" fill="#f0ff75" />
            <rect x="36" y="26" width="40" height="14" rx="4" fill="#9ee8ff" />
            <rect x="30" y="22" width="16" height="22" rx="4" fill="#6dd5ff" />
            <rect x="74" y="22" width="16" height="10" rx="3" fill="#6dd5ff" />
            <path
              d="M52 42l-16 16"
              stroke="#f0ff75"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold">Estamos haciendo mejoras</h1>
        <p className="max-w-md text-white/60">
          El sistema esta en mantenimiento temporal. Intentalo en unos minutos.
        </p>
        <Link to="/app" className={buttonClasses("secondary")}>
          Volver al panel
        </Link>
      </PageShell>
    </main>
  </div>
)

export default Mantenimiento
