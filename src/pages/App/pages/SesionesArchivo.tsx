import { Clapperboard, ChevronLeft } from "lucide-react"
import { Link, Navigate } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getSessionsArchive } from "../../../lib/api/sessions"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import SessionCard from "../components/SessionCard"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Archivo completo de sesiones grabadas, en /app/club/sesiones (§rediseño Club/Coach). Antes
 * el grid entero vivía dentro de Club.tsx y crecía sin tope mes a mes, empujando el resto del
 * hub hacia abajo — ahora Club.tsx solo enseña una fila acotada con un enlace aquí. Quien no
 * tiene Club se manda directo a /app/precios, igual que Club.tsx y Coach.tsx.
 */
const SesionesArchivo = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  const hasSessions = hasFeature(user, "sessions")
  const { data: sessions, loading } = useApi(() => (hasSessions ? getSessionsArchive() : Promise.resolve(null)), [hasSessions], "club-sessions")

  if (!hasSessions) return <Navigate to="/app/precios" replace />

  return (
    <main className="w-full space-y-6 py-8">
      <Link to="/app/club" className="flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white">
        <ChevronLeft className="h-4 w-4" />
        {t("club.title", "Club")}
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Clapperboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("club.sessions.title", "Masterclasses")}</h1>
          <p className="text-sm text-white/60">{t("sesiones-archivo.subtitle", "Todas las masterclasses, mes a mes.")}</p>
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={8} />
      ) : !sessions || sessions.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
          {t("club.sessions.empty", "Todavía no hay ninguna masterclass grabada. Vuelve pronto.")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </main>
  )
}

export default SesionesArchivo
