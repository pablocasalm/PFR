import { useMemo } from "react"
import { Play, ChevronRight, LayoutGrid, Tag, Target, Users, BarChart3, Flame } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getHome } from "../../../lib/api/home"
import { getMonthlyPick } from "../../../lib/api/club"
import type { ContentItem, PopularConcept } from "../../../lib/api/types"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { formatDuration, hueFor, watchHref } from "../../../lib/format"
import { Skeleton, CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard, { Thumb } from "../components/ContentCard"
import { TOUR_OPEN_FEEDBACK_EVENT } from "../components/FeedbackButton"
import ErrorScreen from "../components/ErrorScreen"
import LockedTeaser from "../components/LockedTeaser"
import PlanHomeCard from "../components/PlanHomeCard"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Inicio — Dashboard principal. Consume GET /api/home (endpoint con forma de pantalla).
 * Mezcla clips y análisis vía el modelo unificado ContentItem.
 */

const CONCEPT_ICONS: LucideIcon[] = [LayoutGrid, Tag, Target, Users, BarChart3, Flame]

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

const SectionHeading = ({ title, to }: { title: string; to?: string }) => {
  const { t } = useI18n()
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
      {to && (
        <Link to={to} className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
          {t("common.see-all", "Ver todo")} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

/**
 * Banner de beta (§reporte de beta #58): sustituye al antiguo Hero a pantalla completa, que
 * con el catálogo todavía pequeño solía salir vacío/negro y no aportaba nada. Abre el mismo
 * modal de feedback que el botón flotante global, sin duplicar esa lógica.
 *
 * Para el lanzamiento oficial: no se ha borrado el diseño de Hero (recuperable del historial
 * de git), pero el plan acordado es sustituirlo por una promo estática (título/subtítulo/CTA
 * fijos en el código, editables a mano, sin fila en BD) en vez de traerlo de vuelta.
 */
const BetaBanner = () => {
  const { t } = useI18n()
  return (
    <section className="flex items-center gap-3.5 rounded-xl border border-white/15 border-l-[3px] border-l-neon-cyan bg-gradient-to-r from-neon-cyan/[0.08] to-transparent px-4 py-3.5 sm:gap-4">
      <span className="h-2 w-2 shrink-0 rounded-full bg-neon-cyan shadow-[0_0_0_4px_rgba(40,240,224,0.14)]" />
      <p className="flex-1 text-sm text-white">
        <span className="font-semibold">{t("inicio.beta-banner.badge", "Beta")}</span>{" "}
        {t("inicio.beta-banner.message", "— si ves algo que no cuadra o falta, cuéntanoslo.")}
      </p>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent(TOUR_OPEN_FEEDBACK_EVENT, { detail: true }))}
        className="shrink-0 whitespace-nowrap rounded-full bg-neon-cyan px-4 py-2 text-xs font-bold text-midnight transition hover:brightness-110"
      >
        {t("inicio.beta-banner.cta", "Reportar")}
      </button>
    </section>
  )
}

const ContinueCard = ({ item }: { item: ContentItem }) => {
  const { lang } = useI18n()
  const progress = item.progress ?? 0
  const current = Math.round((item.durationSeconds * progress) / 100)
  return (
    <Link
      to={watchHref(item)}
      className="flex w-[85vw] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20 sm:w-80 sm:flex-row"
    >
      <div className="relative w-full shrink-0 sm:w-32">
        <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-full sm:h-full sm:min-h-[120px]" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 backdrop-blur-sm sm:h-14 sm:w-14">
            <Play className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" />
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-white">{pickText(item.title, item.titleEn, lang)}</h3>
        <div>
          <p className="mb-2 text-sm text-neon-cyan">
            {formatDuration(current)} / {formatDuration(item.durationSeconds)}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

const ConceptoCard = ({ concept, icon: Icon }: { concept: PopularConcept; icon: LucideIcon }) => {
  const { lang } = useI18n()
  return (
    <Link
      to={`/app/search?concept=${encodeURIComponent(concept.name)}`}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-neon-cyan/40 hover:bg-white/[0.04]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-neon-cyan">#{pickText(concept.name, concept.nameEn, lang)}</span>
        <span className="block text-xs text-white/50">
          {concept.clipCount} {concept.clipCount === 1 ? "clip" : "clips"}
        </span>
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

/** Esqueleto de Inicio: hero + dos filas de tarjetas. Se ve solo en la primera carga (caché fría). */
const InicioSkeleton = () => (
  <main className="w-full space-y-12 py-8">
    <Skeleton className="h-64 w-full rounded-2xl sm:h-80" />
    <section className="space-y-4">
      <Skeleton className="h-5 w-48 rounded" />
      <CardGridSkeleton />
    </section>
    <section className="space-y-4">
      <Skeleton className="h-5 w-56 rounded" />
      <CardGridSkeleton />
    </section>
  </main>
)

const Inicio = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data, loading, error, errorStatus } = useApi(getHome, [], "home")
  // Solo Club/Coach (§Stripe 3 planes) — para Starter, ni se llama al endpoint.
  const canSeeMonthlyPick = hasFeature(user, "monthlyPicks")
  const { data: monthlyPick } = useApi(
    () => (canSeeMonthlyPick ? getMonthlyPick() : Promise.resolve(null)),
    [canSeeMonthlyPick],
    "monthly-pick",
  )
  const planSituations = monthlyPick?.situations ?? []

  // Escaparate borroso de "Recomendado del mes" (Starter): miniatura + título + tag reales, de
  // "Nuevo esta semana" + "Más vistos" (contenido que sí es público para su tier), pero la
  // miniatura de cada hueco y el texto que le acompaña salen de DOS barajados INDEPENDIENTES del
  // mismo grupo — así el título/tag casi nunca es el que corresponde de verdad a esa miniatura,
  // y no se puede usar para adivinar qué vídeo es. Solo se calcula una vez por carga (useMemo),
  // no en cada render, para que no vaya cambiando solo mientras se mira la pantalla.
  const teaserItems = useMemo(() => {
    const pool = [...(data?.newThisWeek ?? []), ...(data?.mostViewedThisWeek ?? [])]
    const shuffled = () => {
      const copy = [...pool]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    }
    const thumbs = shuffled().slice(0, 4)
    const texts = shuffled()
    return thumbs.map((item, i) => {
      const text = texts[i % texts.length] ?? item
      return { thumbnailUrl: item.thumbnailUrl, title: text.title, tag: text.concepts[0] }
    })
  }, [data])

  if (loading) return <InicioSkeleton />
  if (error)
    return (
      <main className="w-full py-8">
        <ErrorScreen status={errorStatus} />
      </main>
    )

  const home = data
  const newThisWeek = home?.newThisWeek ?? []
  const continueWatching = home?.continueWatching ?? []
  const popularConcepts = home?.popularConcepts ?? []
  const mostViewed = home?.mostViewedThisWeek ?? []

  return (
    <main className="w-full space-y-12 py-8">
      <BetaBanner />

      {/* Continúa viendo — solo si hay contenido iniciado y no completado */}
      {continueWatching.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.continue", "Continúa viendo")} />
          {/* Fila de ancho fijo, nunca en rejilla: con el límite del backend (5) cabe entera sin
              scroll en escritorio; en pantallas más pequeñas (táctiles) se desliza en horizontal
              en vez de apilarse en vertical (§reporte de beta). */}
          <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto scrollbar-hide pb-1">
            {continueWatching.map((item) => (
              <ContinueCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recomendado del mes (§Club hub, Fase 1; §rediseño Club/Coach): visible siempre, incluso
          para Starter — así se ve que existe la función, no solo cuando ya se tiene el plan.
          Para Starter es un escaparate borroso con la forma de la tarjeta nueva (LockedTeaser); para Club/Coach solo aparece si hay pick
          publicado este mes (un banner vacío en Inicio no aporta nada). Acento visual
          (borde/fondo neon-cyan) para distinguirla de una fila cualquiera; la versión completa
          (con la nota del equipo) vive en /app/club. */}
      {canSeeMonthlyPick && planSituations.length > 0 ? (
        // Formato nuevo (§El plan del mes): pestañas por situación — ver PlanHomeCard.tsx.
        <PlanHomeCard situations={planSituations} />
      ) : (!canSeeMonthlyPick || (monthlyPick && monthlyPick.items.length > 0)) && (
        <section className="rounded-2xl border border-neon-cyan/30 bg-neon-cyan/[0.04] p-4 sm:p-5">
          {/* Bloqueado: sin "Ver todo" (llevaría a Club, que redirige a Precios) — el CTA es "Ver planes". */}
          <SectionHeading title={t("inicio.section.monthly-pick", "Recomendado para ti este mes")} to={canSeeMonthlyPick ? "/app/club" : undefined} />
          {!canSeeMonthlyPick ? (
            <LockedTeaser
              message={t("club.monthly-pick.locked", "Cada mes, un plan con las situaciones de la masterclass y los clips para trabajarlas. Disponible con el plan Club.")}
              items={teaserItems}
            />
          ) : (
            <CardRow>
              {monthlyPick!.items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </CardRow>
          )}
        </section>
      )}

      {/* Nuevo esta semana — clips + análisis por fecha de publicación */}
      {newThisWeek.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.new", "Nuevo esta semana")} to="/app/search?feed=new" />
          <CardRow>
            {newThisWeek.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </CardRow>
        </section>
      )}

      {/* Conceptos populares */}
      {popularConcepts.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.popular-concepts", "Conceptos populares")} to="/app/explorar" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularConcepts.map((c, i) => (
              <ConceptoCard key={c.name} concept={c} icon={CONCEPT_ICONS[i % CONCEPT_ICONS.length]} />
            ))}
          </div>
        </section>
      )}

      {/* Más vistos esta semana — ordenados por visualizaciones (7 días) */}
      {mostViewed.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.most-viewed", "Más vistos esta semana")} to="/app/search?feed=popular" />
          <CardRow>
            {mostViewed.map((item, i) => (
              <ContentCard key={item.id} item={item} rank={i + 1} />
            ))}
          </CardRow>
        </section>
      )}
    </main>
  )
}

export default Inicio
