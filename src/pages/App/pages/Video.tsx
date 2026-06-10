import {
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  Captions,
  Settings,
  PictureInPicture2,
  Tv,
  Maximize,
  Info,
  BadgeCheck,
  Trophy,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  MoreVertical,
} from "lucide-react"
import { Link } from "react-router-dom"

/**
 * Video — Vista de un análisis completo en /app/watch?v=:videoId.
 * Contenido largo con capítulos. Solo visual (datos mock).
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

const VIDEO = {
  title: "Chingotto / Galán vs Lebrón / Stupa",
  event: "Premier Padel Genova P2",
  duration: "20 min",
  level: "Intermedio",
  time: "05:42 / 20:18",
  progress: 28,
  description:
    "En este análisis veremos cómo Chingotto y Galán consiguen generar errores repitiendo situaciones sobre el mismo rival y utilizando correctamente la profundidad antes del globo.",
  concepts: ["Paciencia", "Presión", "Repetición", "Media pista", "Subir"],
  likes: 128,
  comments: 18,
}

type Chapter = { time: string; title: string; tag?: string; pct: number; active?: boolean }
const CHAPTERS: Chapter[] = [
  { time: "00:00", title: "Introducción", pct: 0, active: true },
  { time: "02:15", title: "Repetir sobre el mismo rival", tag: "Paciencia", pct: 11 },
  { time: "05:40", title: "Profundidad antes del globo", tag: "Profundidad", pct: 28 },
  { time: "08:25", title: "Cuándo acelerar", tag: "Cambio de ritmo", pct: 41 },
  { time: "11:40", title: "Subir tras defender", tag: "Subir", pct: 57 },
  { time: "15:20", title: "Error habitual en media pista", tag: "Media pista", pct: 76 },
  { time: "18:10", title: "Resumen final", pct: 89 },
]

const NEXT_VIDEO = {
  title: "Coello / Tapia vs Yanguas / Nieto",
  event: "Premier Padel Miami P1",
  duration: "18 min",
  concepts: ["Presión", "Subir", "Transición"],
  hue: 250,
}

const COMMENTS = [
  {
    user: "JuanM",
    initials: "JM",
    ago: "Hace 2 días",
    text: "Gran análisis. Me ha ayudado mucho a entender cómo repiten sobre el mismo rival.",
    likes: 24,
    hue: 150,
  },
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

// Tramos de la barra de progreso, partidos por los capítulos.
const SEG_BOUNDS = [0, 11, 28, 41, 57, 76, 89, 100]

// ---------------------------------------------------------------------------
// Bloques
// ---------------------------------------------------------------------------

const VideoPlayer = () => (
  <div className="relative overflow-hidden rounded-2xl border border-white/10">
    <div className="aspect-video w-full" style={thumbStyle(208)} />
    <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:text-white">
      <Info className="h-5 w-5" />
    </button>

    {/* Controles */}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-4 pt-14">
      {/* Barra segmentada por capítulos */}
      <div className="relative mb-4">
        <div className="flex items-center gap-1">
          {SEG_BOUNDS.slice(0, -1).map((start, i) => {
            const end = SEG_BOUNDS[i + 1]
            const played = end <= VIDEO.progress
            return (
              <div
                key={start}
                className={`h-1 rounded-full ${played ? "bg-neon-cyan" : "bg-white/25"}`}
                style={{ flexGrow: end - start }}
              />
            )
          })}
        </div>
        <span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-glow"
          style={{ left: `${VIDEO.progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 text-white">
        <button className="transition hover:text-neon-cyan">
          <Play className="h-6 w-6" fill="currentColor" />
        </button>
        <button className="relative transition hover:text-neon-cyan">
          <RotateCcw className="h-5 w-5" />
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">10</span>
        </button>
        <button className="relative transition hover:text-neon-cyan">
          <RotateCw className="h-5 w-5" />
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">10</span>
        </button>
        <button className="transition hover:text-neon-cyan">
          <Volume2 className="h-5 w-5" />
        </button>
        <span className="text-xs font-medium tabular-nums text-white/90">{VIDEO.time}</span>

        <div className="ml-auto flex items-center gap-4">
          <button className="transition hover:text-neon-cyan">
            <Captions className="h-5 w-5" />
          </button>
          <button className="transition hover:text-neon-cyan">
            <Settings className="h-5 w-5" />
          </button>
          <button className="transition hover:text-neon-cyan">
            <PictureInPicture2 className="h-5 w-5" />
          </button>
          <button className="transition hover:text-neon-cyan">
            <Tv className="h-5 w-5" />
          </button>
          <button className="transition hover:text-neon-cyan">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
)

const ActionButton = ({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Heart
  label: string
  count?: number
}) => (
  <button className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5">
    <Icon className="h-4 w-4" />
    {label}
    {count !== undefined && <span className="text-white">{count}</span>}
  </button>
)

const ChaptersPanel = () => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Capítulos</h2>
      <span className="flex items-center gap-1.5 text-xs text-white/50">
        <Clock className="h-3.5 w-3.5" /> {VIDEO.duration}
      </span>
    </div>
    <div className="space-y-1">
      {CHAPTERS.map((ch) =>
        ch.active ? (
          <div
            key={ch.time}
            className="flex items-center gap-3 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-3"
          >
            <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-neon-cyan">{ch.time}</span>
            <span className="flex-1 text-sm font-semibold text-white">{ch.title}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-cyan text-midnight">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
            </span>
          </div>
        ) : (
          <button
            key={ch.time}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
          >
            <Play className="h-2.5 w-2.5 shrink-0 text-white/30" fill="currentColor" />
            <span className="w-12 shrink-0 text-xs tabular-nums text-white/50">{ch.time}</span>
            <span className="flex-1 truncate text-sm text-white/90">{ch.title}</span>
            {ch.tag && (
              <span className="shrink-0 rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80">
                #{ch.tag}
              </span>
            )}
          </button>
        )
      )}
    </div>
  </section>
)

const KeepLearningPanel = () => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">Sigue aprendiendo</h2>
    <Link to="/app/watch?v=2" className="flex gap-3">
      <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg" style={thumbStyle(NEXT_VIDEO.hue)}>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-black/30">
            <Play className="h-4 w-4 text-white" fill="currentColor" />
          </span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug text-white">{NEXT_VIDEO.title}</p>
        <p className="mt-1 text-xs text-white/50">
          {NEXT_VIDEO.event} · {NEXT_VIDEO.duration}
        </p>
        <p className="mt-2 text-xs text-white/50">
          Conceptos:{" "}
          {NEXT_VIDEO.concepts.map((c) => (
            <span key={c} className="text-neon-cyan/80">
              #{c}{" "}
            </span>
          ))}
        </p>
      </div>
    </Link>
    <Link
      to="/app/watch?v=2"
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-3 text-sm font-semibold text-midnight transition hover:brightness-110"
    >
      <Play className="h-4 w-4" fill="currentColor" />
      Reproducir siguiente análisis
    </Link>
  </section>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Video = () => (
  <main className="w-full py-6">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      {/* Columna principal */}
      <div className="space-y-6">
        <VideoPlayer />

        {/* Cabecera + descripción */}
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="space-y-4">
            <div>
              <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-white">
                {VIDEO.title}
                <BadgeCheck className="h-6 w-6 text-neon-cyan" />
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-white/40" /> {VIDEO.event}
                </span>
                <span className="text-white/30">•</span>
                <span>{VIDEO.duration}</span>
                <span className="text-white/30">•</span>
                <span className="rounded-md border border-white/15 px-2 py-0.5 text-xs text-white/80">
                  {VIDEO.level}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-white">Conceptos trabajados</p>
              <div className="flex flex-wrap gap-2">
                {VIDEO.concepts.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-neon-cyan/40 px-3 py-1 text-xs font-medium text-neon-cyan"
                  >
                    #{c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-white/60">{VIDEO.description}</p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-3">
          <ActionButton icon={Heart} label="Me gusta" count={VIDEO.likes} />
          <ActionButton icon={MessageCircle} label="Comentarios" />
          <ActionButton icon={Share2} label="Compartir" />
          <ActionButton icon={Bookmark} label="Mi Lista" />
        </div>

        {/* Comentarios */}
        <section className="space-y-5 border-t border-white/10 pt-6">
          <h2 className="text-lg font-bold text-white">
            Comentarios <span className="text-white/50">({VIDEO.comments})</span>
          </h2>

          {/* Nuevo comentario */}
          <div className="flex items-center gap-3">
            <Avatar initials="MP" hue={190} className="h-9 w-9 shrink-0" />
            <input
              disabled
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            <button className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/50">
              Publicar
            </button>
          </div>

          {/* Lista */}
          {COMMENTS.map((c) => (
            <div key={c.user} className="flex gap-3">
              <Avatar initials={c.initials} hue={c.hue} className="h-9 w-9 shrink-0" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-white">{c.user}</span>{" "}
                  <span className="text-white/40">{c.ago}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm text-white/50">
                <button className="flex items-center gap-1.5 transition hover:text-neon-cyan">
                  <Heart className="h-4 w-4" /> {c.likes}
                </button>
                <button className="transition hover:text-white">Responder</button>
                <button className="transition hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Rail derecho */}
      <aside className="space-y-6">
        <ChaptersPanel />
        <KeepLearningPanel />
      </aside>
    </div>
  </main>
)

export default Video
