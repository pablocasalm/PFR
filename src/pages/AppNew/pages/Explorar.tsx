import {
  SlidersHorizontal,
  ArrowRight,
  ChevronRight,
  Plus,
  MoreVertical,
  LayoutGrid,
  ArrowLeftRight,
  Grip,
  ClipboardList,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

/**
 * Explorar — Catálogo por conceptos del nuevo /appnew. Solo visual (datos mock).
 * El padding horizontal lo aporta el layout; aquí solo espaciado vertical.
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

type Accent = "cyan" | "amber" | "violet" | "blue"

const ACCENT: Record<Accent, string> = {
  cyan: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  amber: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  violet: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  blue: "border-sky-400/40 bg-sky-400/10 text-sky-300",
}

type Clip = {
  title: string
  team1: string
  team2: string
  tag: string
  duration: string
  hue: number
}

type Section = {
  title: string
  icon: LucideIcon
  accent: Accent
  chips: string[]
  cards: Clip[]
}

const SECTIONS: Section[] = [
  {
    title: "Juego desde el fondo",
    icon: LayoutGrid,
    accent: "cyan",
    chips: ["Decisiones", "Globo", "Profundidad", "Paciencia"],
    cards: [
      { title: "Repetir sobre el mismo rival", team1: "Chingotto / Galán", team2: "Lebrón / Stupa", tag: "Paciencia", duration: "0:27", hue: 205 },
      { title: "Forzar el globo del rival", team1: "Tapia / Coello", team2: "Yanguas / Nieto", tag: "Globo", duration: "0:24", hue: 210 },
      { title: "Mover y esperar el error", team1: "Bela / Sanyo", team2: "Lima / Navarro", tag: "Paciencia", duration: "0:26", hue: 215 },
      { title: "Profundidad para abrir pista", team1: "Di Nenno / Stupaczuk", team2: "Garrido / Campagnolo", tag: "Profundidad", duration: "0:22", hue: 208 },
      { title: "Paciencia + cambio de ritmo", team1: "Momo / Silingo", team2: "Gutiérrez / Rubio", tag: "Paciencia", duration: "0:23", hue: 212 },
    ],
  },
  {
    title: "Transición defensa – ataque",
    icon: ArrowLeftRight,
    accent: "amber",
    chips: ["Subir", "Media pista", "Posición", "Recuperar"],
    cards: [
      { title: "Subir tras defensa profunda", team1: "Coello / Tapia", team2: "Leal / Guerrero", tag: "Subir", duration: "0:25", hue: 206 },
      { title: "Primer golpe a media pista", team1: "Sanyo / Bela", team2: "Ruiz / Cardona", tag: "Media pista", duration: "0:21", hue: 211 },
      { title: "Posicionamiento en transición", team1: "Stupaczuk / Di Nenno", team2: "Garrido / Campagnolo", tag: "Posición", duration: "0:24", hue: 216 },
      { title: "Recuperar y contraatacar", team1: "Augburger / Lebrón", team2: "Libaak / Tello", tag: "Recuperar", duration: "0:23", hue: 209 },
      { title: "Aprovechar bola corta", team1: "Yanguas / Nieto", team2: "Rico / Ruiz", tag: "Media pista", duration: "0:20", hue: 214 },
    ],
  },
  {
    title: "Juego en la red",
    icon: Grip,
    accent: "violet",
    chips: ["Presión", "Espacios", "Mantener", "Cobertura"],
    cards: [
      { title: "Presionar después del resto", team1: "Coello / Tapia", team2: "Lebrón / Galán", tag: "Presión", duration: "0:23", hue: 207 },
      { title: "Cerrar espacios en la red", team1: "Bela / Sanyo", team2: "Garrido / Di Nenno", tag: "Espacios", duration: "0:21", hue: 212 },
      { title: "Mantener la posición alta", team1: "Stupaczuk / Lebrón", team2: "Nieto / Sanz", tag: "Mantener", duration: "0:20", hue: 217 },
      { title: "Cobertura en paralelo", team1: "Coello / Tapia", team2: "Ruiz / Cardona", tag: "Cobertura", duration: "0:24", hue: 210 },
      { title: "Volea por alto con intención", team1: "Momo / Silingo", team2: "Jofre / Arroyo", tag: "Presión", duration: "0:23", hue: 215 },
    ],
  },
]

type Analisis = { title: string; desc: string; duration: string; hue: number }
const ANALISIS: Analisis[] = [
  { title: "Análisis: Paciencia", desc: "Cómo generar el error desde el fondo con margen y criterio.", duration: "32:45", hue: 206 },
  { title: "Análisis: Transición", desc: "Claves para pasar de la defensa al ataque de forma efectiva.", duration: "28:17", hue: 212 },
  { title: "Análisis: Juego en la red", desc: "Patrones, posiciones y coberturas para dominar la red.", duration: "31:02", hue: 218 },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
    #{children}
  </span>
)

const VerTodo = () => (
  <button className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
    Ver todo <ArrowRight className="h-4 w-4" />
  </button>
)

const CarouselArrow = () => (
  <button className="absolute -right-2 top-[38%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90">
    <ChevronRight className="h-5 w-5" />
  </button>
)

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

const ClipCard = ({ clip }: { clip: Clip }) => (
  <Link to="/appnew/watch?c=1" className="group block cursor-pointer">
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <div className="aspect-video w-full" style={thumbStyle(clip.hue)} />
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {clip.duration}
      </span>
    </div>
    <div className="mt-2.5 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{clip.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          {clip.team1} vs
          <br />
          {clip.team2} <span className="text-white/30">•</span>{" "}
          <span className="text-neon-cyan/80">#{clip.tag}</span>
        </p>
      </div>
      <button className="mt-0.5 shrink-0 text-white/40 transition hover:text-white">
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  </Link>
)

const ConceptSection = ({ section }: { section: Section }) => {
  const { title, icon: Icon, accent, chips, cards } = section
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
      {/* Cabecera de la sección */}
      <div className="mb-5 flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ACCENT[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="shrink-0 text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
          <button className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-neon-cyan/40 hover:text-neon-cyan">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="ml-auto">
          <VerTodo />
        </div>
      </div>

      {/* Fila de clips */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-4">
          {cards.map((clip) => (
            <ClipCard key={clip.title} clip={clip} />
          ))}
        </div>
        <CarouselArrow />
      </div>
    </section>
  )
}

const AnalisisCard = ({ item }: { item: Analisis }) => (
  <Link to="/appnew/watch?v=1" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20">
    <div className="relative w-28 shrink-0 overflow-hidden rounded-lg">
      <div className="aspect-video w-full" style={thumbStyle(item.hue)} />
      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {item.duration}
      </span>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">{item.desc}</p>
    </div>
    <span className="shrink-0 self-start text-white/40">
      <MoreVertical className="h-4 w-4" />
    </span>
  </Link>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Explorar = () => (
  <main className="w-full space-y-6 py-8">
    {/* Cabecera */}
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Explorar</h1>
        <p className="mt-2 text-sm text-white/60">
          Encuentra los mejores ejemplos de pádel organizados por conceptos clave.
        </p>
      </div>
      <button className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5">
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
      </button>
    </div>

    {/* Secciones por concepto */}
    {SECTIONS.map((section) => (
      <ConceptSection key={section.title} section={section} />
    ))}

    {/* Análisis completos */}
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ACCENT.blue}`}>
          <ClipboardList className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Análisis completos</h2>
        <div className="ml-auto">
          <VerTodo />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {ANALISIS.map((item) => (
          <AnalisisCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  </main>
)

export default Explorar
