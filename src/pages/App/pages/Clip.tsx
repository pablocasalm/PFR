import {
  Play,
  SkipBack,
  RotateCcw,
  Volume2,
  Settings,
  Maximize,
  Heart,
  MessageCircle,
  Share2,
  ListPlus,
  ChevronRight,
  ArrowRight,
  Send,
  Home,
  Search,
  Bookmark,
  BarChart2,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

/**
 * Clip — Vista de reproducción de un clip en /app/clip/:clipId.
 * Solo visual (datos mock); el player no reproduce nada todavía.
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

const CLIP = {
  title: "Repetir sobre el mismo rival",
  description:
    "Cómo insistir sobre el revés de tu rival hasta generar el error. La clave es tener paciencia y volver a la misma zona una y otra vez.",
  tags: ["Insistencia", "Paciencia", "Táctica"],
  time: "0:12 / 0:27",
  progress: 44,
  likes: 342,
  comments: 28,
  match: {
    teams: "Chingotto / Galán vs Lebrón / Stupa",
    event: "Premier Padel – Genova P2",
  },
}

type Comment = { user: string; initials: string; ago: string; text: string; likes: number; hue: number }
const COMMENTS: Comment[] = [
  { user: "alejovm", initials: "AV", ago: "Hace 2 h", text: "Muy claro Guille. La clave es tener paciencia y volver a la misma zona una y otra vez.", likes: 18, hue: 190 },
  { user: "coach_pablo", initials: "CP", ago: "Hace 5 h", text: "Totalmente. Gran ejemplo de cómo construir el punto desde la paciencia.", likes: 7, hue: 260 },
  { user: "juanmipadel", initials: "JM", ago: "Hace 6 h", text: "Brutal análisis, me ayuda mucho a entender los patrones.", likes: 5, hue: 150 },
]

type NextClip = { title: string; tags: string[]; duration: string; hue: number }
const NEXT: NextClip[] = [
  { title: "Forzar el globo del rival", tags: ["Insistencia", "Globo"], duration: "0:24", hue: 205 },
  { title: "Cambiar de lado para repetir", tags: ["Paciencia", "Dirección"], duration: "0:21", hue: 212 },
  { title: "Castigar el segundo remate", tags: ["Insistencia", "Red"], duration: "0:19", hue: 219 },
  { title: "Paciencia + profundidad", tags: ["Paciencia", "Profundidad"], duration: "0:22", hue: 226 },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const Avatar = ({ initials, hue, className = "" }: { initials: string; hue: number; className?: string }) => (
  <span
    className={`flex items-center justify-center rounded-full text-xs font-bold text-white ${className}`}
    style={{ background: `hsl(${hue}, 35%, 30%)` }}
  >
    {initials}
  </span>
)

// ---------------------------------------------------------------------------
// Bloques
// ---------------------------------------------------------------------------

const VideoPlayer = () => (
  <div className="relative overflow-hidden rounded-xl border border-white/10">
    <div className="aspect-video w-full" style={thumbStyle(208)} />
    {/* Marca de agua estilo torneo */}
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-6xl font-bold uppercase tracking-widest text-white/5">
      Genova P2
    </span>

    {/* Barra de controles */}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-12">
      <div className="flex items-center gap-4 text-white">
        <button className="transition hover:text-neon-cyan">
          <SkipBack className="h-5 w-5" fill="currentColor" />
        </button>
        <button className="transition hover:text-neon-cyan">
          <Play className="h-6 w-6" fill="currentColor" />
        </button>
        <button className="relative transition hover:text-neon-cyan">
          <RotateCcw className="h-5 w-5" />
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">10</span>
        </button>
        <span className="text-xs font-medium tabular-nums text-white/90">{CLIP.time}</span>

        {/* Progreso */}
        <div className="relative h-1 flex-1 rounded-full bg-white/20">
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${CLIP.progress}%` }} />
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-glow"
            style={{ left: `${CLIP.progress}%` }}
          />
        </div>

        <button className="transition hover:text-neon-cyan">
          <Volume2 className="h-5 w-5" />
        </button>
        <button className="transition hover:text-neon-cyan">
          <Settings className="h-5 w-5" />
        </button>
        <button className="transition hover:text-neon-cyan">
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
)

const ActionButton = ({ icon: Icon, label }: { icon: typeof Heart; label: string }) => (
  <button className="flex items-center gap-2 text-sm text-white/80 transition hover:text-white">
    <Icon className="h-5 w-5" />
    {label}
  </button>
)

const MobileTabBar = () => {
  const tabs = [
    { icon: Home, label: "Inicio", to: "/app/inicio" },
    { icon: Search, label: "Explorar", to: "/app/explorar", active: true },
    { icon: Bookmark, label: "Mi lista", to: "/app/mi-lista" },
    { icon: BarChart2, label: "Mi juego", to: "/app/mi-juego" },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-white/10 bg-black/80 px-2 py-3 backdrop-blur-md md:hidden">
      {tabs.map(({ icon: Icon, label, to, active }) => (
        <Link
          key={label}
          to={to}
          className={`flex flex-col items-center gap-1 text-[11px] ${
            active ? "text-neon-cyan" : "text-white/50"
          }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const ClipHorizontal = () => (
  <main className="w-full space-y-6 py-6 pb-28 md:pb-8">
    <VideoPlayer />

    {/* Ficha del clip */}
    <div className="space-y-4">
      <span className="inline-block rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
        Clip
      </span>
      <h1 className="font-display text-3xl font-bold text-white">{CLIP.title}</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-white/60">{CLIP.description}</p>
      <div className="flex flex-wrap gap-2">
        {CLIP.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-neon-cyan/40 px-3 py-1 text-xs font-medium text-neon-cyan"
          >
            #{t}
          </span>
        ))}
      </div>
    </div>

    {/* Aparece en */}
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg" style={thumbStyle(250)}>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/70">
          VS
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/50">Aparece en:</p>
        <p className="text-sm font-semibold leading-snug text-white">{CLIP.match.teams}</p>
        <p className="mt-0.5 text-xs text-white/50">{CLIP.match.event}</p>
      </div>
      <Link
        to="/app/watch?v=1"
        className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110"
      >
        Ver análisis completo <ChevronRight className="h-4 w-4" />
      </Link>
    </div>

    {/* Acciones */}
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-y border-white/10 py-4">
      <ActionButton icon={Heart} label={String(CLIP.likes)} />
      <ActionButton icon={MessageCircle} label={String(CLIP.comments)} />
      <ActionButton icon={Share2} label="Compartir" />
      <ActionButton icon={ListPlus} label="Mi lista" />
    </div>

    {/* Comentarios */}
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Comentarios <span className="text-white/50">({CLIP.comments})</span>
        </h2>
        <button className="text-sm font-medium text-neon-cyan transition hover:brightness-110">Ver todos</button>
      </div>

      <div className="space-y-5">
        {COMMENTS.map((c) => (
          <div key={c.user} className="flex gap-3">
            <Avatar initials={c.initials} hue={c.hue} className="h-9 w-9 shrink-0" />
            <div className="flex flex-1 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-white">{c.user}</span>{" "}
                  <span className="text-white/40">{c.ago}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
              </div>
              <button className="flex shrink-0 flex-col items-center gap-0.5 text-white/40 transition hover:text-neon-cyan">
                <Heart className="h-4 w-4" />
                <span className="text-xs">{c.likes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Añadir comentario */}
      <div className="flex items-center gap-3">
        <Avatar initials="AV" hue={190} className="h-9 w-9 shrink-0" />
        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
          <input
            disabled
            placeholder="Añadir un comentario..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button className="text-white/40 transition hover:text-neon-cyan">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    {/* A continuación */}
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          A continuación <span className="text-white/50">(3/7)</span>
        </h2>
        <button className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
          Ver todos los clips del concepto <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {NEXT.map((clip) => (
          <Link key={clip.title} to="/app/watch?c=1" className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-lg border border-white/10">
              <div className="aspect-video w-full" style={thumbStyle(clip.hue)} />
              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {clip.duration}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-white">{clip.title}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {clip.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80"
                >
                  #{t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>

    <MobileTabBar />
  </main>
)

// ---------------------------------------------------------------------------
// Variante VERTICAL (prueba) — formato tipo Reels para clips cortos.
// ---------------------------------------------------------------------------

const VerticalActionRail = () => {
  const actions = [
    { icon: Heart, label: String(CLIP.likes) },
    { icon: MessageCircle, label: String(CLIP.comments) },
    { icon: Share2, label: "Compartir" },
    { icon: ListPlus, label: "Mi lista" },
  ]
  return (
    <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
      {actions.map(({ icon: Icon, label }) => (
        <button key={label} className="flex flex-col items-center gap-1 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
}

const VerticalPlayer = () => (
  <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10">
    <div className="aspect-[9/16] w-full" style={thumbStyle(208)} />
    <span className="pointer-events-none absolute inset-x-0 top-6 text-center font-display text-2xl font-bold uppercase tracking-widest text-white/10">
      Genova P2
    </span>

    <VerticalActionRail />

    {/* Controles inferiores */}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12">
      <div className="mb-3 flex items-center gap-3 text-white">
        <button className="transition hover:text-neon-cyan">
          <Play className="h-6 w-6" fill="currentColor" />
        </button>
        <span className="text-xs font-medium tabular-nums text-white/90">{CLIP.time}</span>
        <button className="ml-auto transition hover:text-neon-cyan">
          <Maximize className="h-5 w-5" />
        </button>
      </div>
      <div className="relative h-1 w-full rounded-full bg-white/20">
        <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${CLIP.progress}%` }} />
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-glow"
          style={{ left: `${CLIP.progress}%` }}
        />
      </div>
    </div>
  </div>
)

const ClipVertical = () => (
  <main className="w-full py-6 pb-28 md:pb-8">
    <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
      <VerticalPlayer />

      {/* Ficha al lado del player */}
      <div className="space-y-6">
        <div className="space-y-4">
          <span className="inline-block rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
            Clip · Vertical
          </span>
          <h1 className="font-display text-3xl font-bold text-white">{CLIP.title}</h1>
          <p className="text-sm leading-relaxed text-white/60">{CLIP.description}</p>
          <div className="flex flex-wrap gap-2">
            {CLIP.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-neon-cyan/40 px-3 py-1 text-xs font-medium text-neon-cyan"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Aparece en */}
        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg" style={thumbStyle(250)}>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/70">
              VS
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/50">Aparece en:</p>
            <p className="text-sm font-semibold leading-snug text-white">{CLIP.match.teams}</p>
            <p className="mt-0.5 text-xs text-white/50">{CLIP.match.event}</p>
          </div>
          <Link
            to="/app/watch?v=1"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110"
          >
            Ver análisis completo <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Comentarios */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Comentarios <span className="text-white/50">({CLIP.comments})</span>
            </h2>
            <button className="text-sm font-medium text-neon-cyan transition hover:brightness-110">Ver todos</button>
          </div>
          <div className="space-y-5">
            {COMMENTS.map((c) => (
              <div key={c.user} className="flex gap-3">
                <Avatar initials={c.initials} hue={c.hue} className="h-9 w-9 shrink-0" />
                <div className="flex flex-1 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-white">{c.user}</span>{" "}
                      <span className="text-white/40">{c.ago}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
                  </div>
                  <button className="flex shrink-0 flex-col items-center gap-0.5 text-white/40 transition hover:text-neon-cyan">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs">{c.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>

    {/* A continuación — miniaturas verticales */}
    <section className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          A continuación <span className="text-white/50">(3/7)</span>
        </h2>
        <button className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
          Ver todos los clips del concepto <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {NEXT.map((clip) => (
          <Link key={clip.title} to="/app/watch?c=2" className="group cursor-pointer">
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              <div className="aspect-[9/16] w-full" style={thumbStyle(clip.hue)} />
              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {clip.duration}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{clip.title}</p>
          </Link>
        ))}
      </div>
    </section>

    <MobileTabBar />
  </main>
)

// Selector: ?c=2 muestra la prueba vertical; el resto, horizontal.
const Clip = () => {
  const [params] = useSearchParams()
  return params.get("c") === "2" ? <ClipVertical /> : <ClipHorizontal />
}

export default Clip
