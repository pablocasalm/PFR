import {
  Play,
  Plus,
  ChevronRight,
  ArrowRight,
  Disc,
  Crosshair,
  BarChart3,
  Brain,
  TrendingUp,
  CircleDot,
  Heart,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

/**
 * Inicio — Dashboard principal del nuevo /app. Solo visual (datos mock).
 * Una sola columna a todo el ancho; el rail derecho va aparte.
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

const HERO = {
  badge: "Clip destacado",
  title: "Presión al subir a la red",
  subtitle: "Cómo generar presión con tu subida a la red y provocar errores del rival.",
}

type ContinueItem = { title: string; time: string; progress: number; hue: number }
const CONTINUE: ContinueItem[] = [
  {
    title: "Media pista: cómo defender y recuperar la posición",
    time: "03:22 / 05:15",
    progress: 64,
    hue: 205,
  },
  {
    title: "Salida de pared: opciones y timing",
    time: "04:10 / 06:33",
    progress: 63,
    hue: 220,
  },
]

type MediaCard = {
  kind: "clip" | "analisis"
  duration: string
  title: string
  tags?: string[]
  meta?: string
  hue: number
}

const NUEVO: MediaCard[] = [
  { kind: "clip", duration: "01:28", title: "Elevar el globo en el momento justo", tags: ["Globo", "Elección de golpe"], hue: 200 },
  { kind: "analisis", duration: "03:45", title: "Chingotto / Galán vs Lebrón / Stupa", meta: "Premier Padel Málaga P1", hue: 212 },
  { kind: "clip", duration: "01:31", title: "Preparar el punto antes del globo", tags: ["Globo", "Paciencia"], hue: 224 },
  { kind: "analisis", duration: "01:31", title: "Coello / Tapia vs Yanguas / Nieto", meta: "Premier Padel Roma Major", hue: 236 },
  { kind: "clip", duration: "07:28", title: "Castigar el globo corto del rival", tags: ["Globo", "Remate"], hue: 248 },
]

type Concepto = { label: string; count: number; icon: LucideIcon }
const CONCEPTOS: Concepto[] = [
  { label: "Globo", count: 18, icon: Disc },
  { label: "Media pista", count: 24, icon: Crosshair },
  { label: "Presión", count: 21, icon: BarChart3 },
  { label: "Paciencia", count: 16, icon: Brain },
  { label: "Subir", count: 22, icon: TrendingUp },
  { label: "Cobertura", count: 17, icon: CircleDot },
]

type RankedCard = { rank: number; duration: string; title: string; tags: string[]; hue: number }
const MAS_VISTOS: RankedCard[] = [
  { rank: 1, duration: "01:42", title: "Cerrar la red después de subir", tags: ["Red", "Posición"], hue: 200 },
  { rank: 2, duration: "01:21", title: "Bloquear y contraatacar desde el fondo", tags: ["Defensa", "Contraataque"], hue: 210 },
  { rank: 3, duration: "01:37", title: "Cambios de dirección para desequilibrar", tags: ["Cambio de ritmo", "Táctica"], hue: 220 },
  { rank: 4, duration: "01:16", title: "Remate por 3: profundidad y ángulo", tags: ["Remate", "Estrategia"], hue: 230 },
  { rank: 5, duration: "01:23", title: "Jugar a la altura del rival", tags: ["Adaptación", "Táctica"], hue: 240 },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const SectionHeading = ({ title, withLink }: { title: string; withLink?: boolean }) => (
  <div className="mb-5 flex items-center justify-between">
    <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
    {withLink && (
      <button className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
        Ver todo <ArrowRight className="h-4 w-4" />
      </button>
    )}
  </div>
)

const CarouselArrow = () => (
  <button className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90">
    <ChevronRight className="h-5 w-5" />
  </button>
)

const Tags = ({ tags }: { tags: string[] }) => (
  <div className="mt-2 flex flex-wrap gap-2">
    {tags.map((t) => (
      <span key={t} className="text-[11px] text-neon-cyan/80">
        #{t}
      </span>
    ))}
  </div>
)

// ---------------------------------------------------------------------------
// Bloques
// ---------------------------------------------------------------------------

const Hero = () => (
  <section className="relative overflow-hidden rounded-2xl border border-white/10">
    {/* Fondo placeholder (imagen real iría aquí) */}
    <div className="absolute inset-0" style={thumbStyle(210)} />
    <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/80 to-transparent" />
    <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 to-transparent" />

    <div className="relative flex min-h-[360px] flex-col justify-center gap-5 p-12">
      <span className="w-fit rounded-md bg-neon-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-midnight">
        {HERO.badge}
      </span>
      <h1 className="max-w-md font-display text-6xl font-bold leading-[1.05] text-white">
        {HERO.title}
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-white/70">{HERO.subtitle}</p>
      <div className="mt-2 flex items-center gap-5">
        <button className="flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-midnight transition hover:brightness-110">
          <Play className="h-4 w-4" fill="currentColor" />
          Ver clip
        </button>
        <button className="flex items-center gap-2.5 text-sm font-semibold text-white transition hover:text-white/80">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40">
            <Plus className="h-4 w-4" />
          </span>
          Mi lista
        </button>
      </div>
    </div>

    {/* Puntos del carrusel (solo visual) */}
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === 0 ? "w-6 bg-neon-cyan" : "w-1.5 bg-white/30"
          }`}
        />
      ))}
    </div>
  </section>
)

const ContinueCard = ({ item }: { item: ContinueItem }) => (
  <Link to="/app/watch?v=1" className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
    <div className="relative w-56 shrink-0">
      <div className="h-full min-h-[150px]" style={thumbStyle(item.hue)} />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 backdrop-blur-sm">
          <Play className="h-5 w-5 text-white" fill="currentColor" />
        </span>
      </span>
    </div>
    <div className="flex flex-1 flex-col justify-center gap-4 p-6">
      <h3 className="text-base font-medium leading-snug text-white">{item.title}</h3>
      <div>
        <p className="mb-2 text-sm text-neon-cyan">{item.time}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${item.progress}%` }} />
        </div>
      </div>
    </div>
  </Link>
)

const KindBadge = ({ kind }: { kind: MediaCard["kind"] }) =>
  kind === "clip" ? (
    <span className="rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
      Clip
    </span>
  ) : (
    <span className="rounded border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
      Análisis
    </span>
  )

const NuevoCard = ({ card }: { card: MediaCard }) => (
  <Link
    to={card.kind === "analisis" ? "/app/watch?v=1" : "/app/watch?c=1"}
    className="group block w-full cursor-pointer"
  >
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <div className="aspect-video w-full" style={thumbStyle(card.hue)} />
      <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {card.duration}
      </span>
    </div>
    <div className="mt-2.5">
      <KindBadge kind={card.kind} />
    </div>
    <p className="mt-2 text-sm font-medium leading-snug text-white">{card.title}</p>
    {card.tags ? (
      <Tags tags={card.tags} />
    ) : (
      <p className="mt-2 text-xs text-white/50">{card.meta}</p>
    )}
  </Link>
)

const ConceptoCard = ({ concepto }: { concepto: Concepto }) => {
  const { label, count, icon: Icon } = concepto
  return (
    <button className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-neon-cyan/40 hover:bg-white/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-neon-cyan">#{label}</span>
        <span className="block text-xs text-white/50">{count} clips</span>
      </span>
    </button>
  )
}

const RankedCardItem = ({ card }: { card: RankedCard }) => (
  <Link to="/app/watch?c=1" className="group block w-full cursor-pointer">
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <div className="aspect-video w-full" style={thumbStyle(card.hue)} />
      <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-neon-cyan text-sm font-bold text-midnight">
        {card.rank}
      </span>
      <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {card.duration}
      </span>
    </div>
    <p className="mt-2.5 text-sm font-medium leading-snug text-white">{card.title}</p>
    <Tags tags={card.tags} />
  </Link>
)

const CtaBanner = () => (
  <section className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-5">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
        <Heart className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-xl font-bold text-white">Guarda tus clips y conceptos favoritos</h3>
        <p className="mt-1 text-sm text-white/60">
          Crea tu lista personalizada y vuelve a ellos cuando quieras.
        </p>
      </div>
    </div>
    <button className="flex shrink-0 items-center gap-2 rounded-lg border border-neon-cyan/50 px-6 py-3 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10">
      Explorar Mi Lista <ArrowRight className="h-4 w-4" />
    </button>
  </section>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Inicio = () => (
  <main className="w-full space-y-12 py-8">
    <Hero />

    {/* Continúa viendo */}
    <section>
      <SectionHeading title="Continúa viendo" />
      <div className="relative">
        <div className="grid grid-cols-2 gap-5">
          {CONTINUE.map((item) => (
            <ContinueCard key={item.title} item={item} />
          ))}
        </div>
        <CarouselArrow />
      </div>
    </section>

    {/* Nuevo esta semana */}
    <section>
      <SectionHeading title="Nuevo esta semana" withLink />
      <div className="relative">
        <div className="grid grid-cols-5 gap-4">
          {NUEVO.map((card) => (
            <NuevoCard key={card.title} card={card} />
          ))}
        </div>
        <CarouselArrow />
      </div>
    </section>

    {/* Conceptos populares */}
    <section>
      <SectionHeading title="Conceptos populares" withLink />
      <div className="grid grid-cols-6 gap-3">
        {CONCEPTOS.map((c) => (
          <ConceptoCard key={c.label} concepto={c} />
        ))}
      </div>
    </section>

    {/* Más vistos esta semana */}
    <section>
      <SectionHeading title="Más vistos esta semana" withLink />
      <div className="relative">
        <div className="grid grid-cols-5 gap-4">
          {MAS_VISTOS.map((card) => (
            <RankedCardItem key={card.rank} card={card} />
          ))}
        </div>
        <CarouselArrow />
      </div>
    </section>

    <CtaBanner />
  </main>
)

export default Inicio
