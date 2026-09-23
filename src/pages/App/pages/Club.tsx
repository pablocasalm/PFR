import { Crown } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import { getMonthlyPick } from "../../../lib/api/club"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard from "../components/ContentCard"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Club — hub de las funciones de los planes Club/Coach (§Stripe 3 planes). El acceso ya lo
 * filtra RequireFeature en el router; aquí se asume que quien llega tiene el tier necesario.
 *
 * Fase 1: solo "Recomendado del mes". Sesiones grabadas (Fase 2), preguntas (Fase 3) y el
 * análisis personalizado de Coach (Fase 5) se añaden como secciones nuevas más adelante, sin
 * tocar esta estructura.
 */
const Club = () => {
  const { t, lang } = useI18n()
  const { data: monthlyPick, loading } = useApi(getMonthlyPick, [], "monthly-pick")

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
