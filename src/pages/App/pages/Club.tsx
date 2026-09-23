import { Crown, Play } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getMonthlyPick } from "../../../lib/api/club"
import { getSessionsArchive } from "../../../lib/api/sessions"
import type { SessionSummary } from "../../../lib/api/types"
import { formatDuration, hueFor } from "../../../lib/format"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard, { Thumb } from "../components/ContentCard"
import WatchedBadge from "../components/WatchedBadge"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Club — hub de las funciones de los planes Club/Coach (§Stripe 3 planes). El acceso ya lo
 * filtra RequireFeature en el router; aquí se asume que quien llega tiene el tier necesario.
 *
 * Fase 1: "Recomendado del mes". Fase 2: Sesiones grabadas. Preguntas (Fase 3) y el análisis
 * personalizado de Coach (Fase 5) se añaden como secciones nuevas más adelante, sin tocar esta
 * estructura.
 */

/** Tarjeta de sesión — como ContentCard pero sin fila de conceptos (una sesión no los tiene). */
const SessionCard = ({ session }: { session: SessionSummary }) => {
  const { lang } = useI18n()
  return (
    <Link to={`/app/watch?s=${session.id}`} className="group block w-full cursor-pointer">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <Thumb src={session.thumbnailUrl} hue={hueFor(String(session.id))} className="aspect-video w-full" />
        {session.completed && <WatchedBadge />}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="h-4 w-4 text-white" fill="currentColor" />
          </span>
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(session.durationSeconds)}
        </span>
      </div>
      <p className="mt-2.5 text-sm font-medium leading-snug text-white">{pickText(session.title, session.titleEn, lang)}</p>
    </Link>
  )
}

const Club = () => {
  const { t, lang } = useI18n()
  const { data: monthlyPick, loading } = useApi(getMonthlyPick, [], "monthly-pick")
  const { data: sessions, loading: sessionsLoading } = useApi(getSessionsArchive, [], "club-sessions")

  return (
    <main className="w-full space-y-8 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("club.title", "Club")}</h1>
          <p className="text-sm text-white/60">{t("club.subtitle", "Lo que trae tu plan, en un solo sitio.")}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">{t("club.sessions.title", "Sesiones")}</h2>
        {sessionsLoading ? (
          <CardGridSkeleton count={4} />
        ) : !sessions || sessions.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
            {t("club.sessions.empty", "Todavía no hay ninguna sesión grabada. Vuelve pronto.")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">
          {t("club.monthly-pick.title", "Recomendado del mes")}
        </h2>

        {loading ? (
          <CardGridSkeleton count={4} />
        ) : !monthlyPick || monthlyPick.items.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
            {t("club.monthly-pick.empty", "Todavía no hay recomendación para este mes. Vuelve pronto.")}
          </p>
        ) : (
          <>
            {monthlyPick.note && (
              <p className="mb-4 text-sm text-white/70">{pickText(monthlyPick.note, monthlyPick.noteEn ?? undefined, lang)}</p>
            )}
            {monthlyPick.concepts.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {monthlyPick.concepts.map((c) => (
                  <span key={c.name} className="rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan">
                    #{pickText(c.name, c.nameEn, lang)}
                  </span>
                ))}
              </div>
            )}
            <CardRow>
              {monthlyPick.items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </CardRow>
          </>
        )}
      </section>
    </main>
  )
}

export default Club
