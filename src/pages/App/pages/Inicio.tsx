import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getHome } from "../../../lib/api/home"
import { getMonthlyPick } from "../../../lib/api/club"
import type { ContentItem, PopularConcept } from "../../../lib/api/types"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { Skeleton, CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard from "../components/ContentCard"
import ErrorScreen from "../components/ErrorScreen"
import LockedTeaser from "../components/LockedTeaser"
import PlanHomeCard from "../components/PlanHomeCard"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { StarterTestBanner } from "../components/StarterTest"
import { useTaxonomy, conceptSearchHref } from "../../../lib/taxonomy"
import { watchedLast } from "../../../lib/watched"
import { usePills } from "../../../lib/pills"
import PillCard from "../components/PillCard"

/**
 * Inicio — Dashboard principal. Consume GET /api/home (endpoint con forma de pantalla).
 * Mezcla clips y análisis vía el modelo unificado ContentItem.
 */


// ---------------------------------------------------------------------------
// PROTOTIPO de las píldoras (rama prueba-pildoras, solo en local, 07/11/2026; tarjetas #134 y
// #136): una fila de vídeos verticales que abren la vista vertical del clip. De momento, con
// clips de siempre como sustitutos de las píldoras, que aún no están grabadas.

/** PRUEBA (solo en local, `npm run dev`; nunca en producción): con pocas píldoras publicadas, la
 * fila de Inicio las repite hasta llenar 8 huecos, para ver cómo queda llena. Solo la fila: Explorar,
 * el reproductor y el test usan las de verdad. Quitar antes de llevar la rama a main. */
const REPEAT_UNTIL = import.meta.env.DEV ? 8 : 0
const repeatForTesting = (items: ContentItem[]) =>
  items.length === 0 || items.length >= REPEAT_UNTIL ? items : Array.from({ length: REPEAT_UNTIL }, (_, i) => items[i % items.length])

const PillsRow = ({ items: realItems }: { items: ContentItem[] }) => {
  const items = repeatForTesting(realItems)
  if (items.length === 0) return null
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Píldoras</h2>
        <span className="rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">Prototipo</span>
      </div>
      {/* Una sola fila, sin deslizar: 3 fijas en el móvil (deslizando hasta 8 era un scroll demasiado
          largo), 5 en tableta y 8 en escritorio. */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-4 lg:grid-cols-8">
        {items.slice(0, 8).map((item, i) => (
          <div key={`${item.id}-${i}`} className={i >= 5 ? "hidden lg:block" : i >= 3 ? "hidden sm:block" : ""}>
            <PillCard item={item} />
          </div>
        ))}
      </div>
    </section>
  )
}

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

// Sin icono (reporte #91): eran 6 iconos genéricos turnándose que no tenían que ver con el concepto.
const ConceptoCard = ({ concept }: { concept: PopularConcept }) => {
  const { lang } = useI18n()
  const tax = useTaxonomy()
  const id = concept.id ?? tax.conceptIdByName.get(concept.name)
  return (
    <Link
      to={id != null ? conceptSearchHref(id) : "/app/explorar"}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-neon-cyan/40 hover:bg-white/[0.04]"
    >
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-neon-cyan">#{pickText(concept.name, concept.nameEn, lang)}</span>
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
  // Prototipo de las píldoras: antes de cualquier return, como todos los hooks.
  const { items: pillItems } = usePills()
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
  // Lo ya visto, al final (reporte #104). En «Más vistos» no: es un ranking numerado.
  const newThisWeek = watchedLast(home?.newThisWeek ?? [])
  const popularConcepts = home?.popularConcepts ?? []
  const mostViewed = home?.mostViewedThisWeek ?? []
  const pillStandIns = pillItems.slice(0, 8)

  return (
    <main className="w-full space-y-12 py-8">
      {/* Test inicial: arriba del todo, hasta que lo haga o lo cierre. */}
      <StarterTestBanner />

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
          <SectionHeading title={t("inicio.section.monthly-pick", "El plan del mes")} to={canSeeMonthlyPick ? "/app/club" : undefined} />
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
          {/* Como mucho 5 (3 en tableta): el resto, en «Ver todo». */}
          <CardRow max={5}>
            {newThisWeek.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </CardRow>
        </section>
      )}

      {/* Prototipo: después de «Nuevo esta semana», para que en el móvil no sea lo primero que se ve. */}
      <PillsRow items={pillStandIns} />

      {/* Conceptos populares */}
      {popularConcepts.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.popular-concepts", "Conceptos populares")} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularConcepts.map((c) => (
              <ConceptoCard key={c.name} concept={c} />
            ))}
          </div>
        </section>
      )}

      {/* Más vistos esta semana — ordenados por visualizaciones (7 días) */}
      {mostViewed.length > 0 && (
        <section>
          <SectionHeading title={t("inicio.section.most-viewed", "Más vistos esta semana")} to="/app/search?feed=popular" />
          {/* Como mucho 5 (3 en tableta), en una sola fila: con 6 se partía en dos. */}
          <CardRow max={5}>
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
