import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getSearch } from "../../../lib/api/search"
import { useI18n } from "../../../lib/i18n/store"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import ContentCard from "../components/ContentCard"

/**
 * Historial (/app/historial): todo lo visto, lo más reciente primero. Se llega desde «Ver
 * historial» de Mi Lista. Primera versión (rama prueba-pildoras): la lista completa del feed de
 * historial, con una línea de lo visto en cada miniatura; el diseño definitivo está por decidir.
 */
const Historial = () => {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data, loading } = useApi(() => getSearch({ feed: "history" }), [], "history-full")
  const items = (data?.results ?? []).filter((i) => i.type !== "pill")

  return (
    <main className="w-full space-y-6 py-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/mi-lista")}
          aria-label={t("common.back", "Volver")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 text-white/80 transition hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("historial.title", "Historial")}</h1>
      </div>

      {loading && !data ? (
        <CardGridSkeleton />
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/50">
          {t("historial.empty", "Todavía no has visto nada. Lo que veas aparecerá aquí.")}
        </p>
      )}
    </main>
  )
}

export default Historial
