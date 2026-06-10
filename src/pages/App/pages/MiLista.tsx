import { Link } from "react-router-dom"
import { Pencil, ChevronRight, Bookmark, Trophy, Calendar } from "lucide-react"

/**
 * MiLista — Contenido guardado del usuario en /app/mi-lista. Solo visual (datos mock).
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

type Tone = "cyan" | "emerald" | "violet" | "slate"
const TONE: Record<Tone, string> = {
  cyan: "bg-neon-cyan/15 text-neon-cyan",
  emerald: "bg-emerald-400/15 text-emerald-300",
  violet: "bg-violet-400/15 text-violet-300",
  slate: "bg-white/10 text-white/60",
}

type Badge = { label: string; tone: Tone }
type SavedClip = { title: string; badges: Badge[]; saved: string; duration: string; hue: number }

const CLIPS: SavedClip[] = [
  { title: "Remate por 3 después de pared", badges: [{ label: "Remate", tone: "emerald" }, { label: "Ataque", tone: "slate" }], saved: "18/05/2024", duration: "00:38", hue: 205 },
  { title: "Globo profundo a la esquina", badges: [{ label: "Globo", tone: "cyan" }, { label: "Defensa", tone: "slate" }], saved: "15/05/2024", duration: "00:47", hue: 210 },
  { title: "Bajada de pared + volea", badges: [{ label: "Transición", tone: "violet" }, { label: "Ataque", tone: "slate" }], saved: "14/05/2024", duration: "00:51", hue: 215 },
  { title: "Volea de revés cruzada", badges: [{ label: "Volea", tone: "violet" }, { label: "Control", tone: "slate" }], saved: "11/05/2024", duration: "00:43", hue: 220 },
  { title: "Salida de pared paralela", badges: [{ label: "Pared", tone: "cyan" }, { label: "Ataque", tone: "slate" }], saved: "09/05/2024", duration: "00:34", hue: 208 },
]

type SavedVideo = { title: string; event: string; date: string; duration: string; hue: number }
const VIDEOS: SavedVideo[] = [
  { title: "Tapia / Coello vs Galán / Lebrón", event: "Premier Padel Madrid P1", date: "04/05/2024", duration: "58:24", hue: 206 },
  { title: "Stupaczuk / Di Nenno vs Yanguas / Nieto", event: "Premier Padel Roma P1", date: "28/04/2024", duration: "1:02:11", hue: 212 },
  { title: "Chingotto / Galán vs Tapia / Coello", event: "Premier Padel Qatar Major", date: "10/04/2024", duration: "49:33", hue: 218 },
  { title: "Lebrón / Galán vs Coello / Tapia", event: "Premier Padel WPT Finals", date: "17/12/2023", duration: "1:05:47", hue: 224 },
]

type RecentItem = { kind: "clip" | "analisis"; title: string; duration: string; progress: number; hue: number }
const RECENT: RecentItem[] = [
  { kind: "clip", title: "Remate X3 desde el fondo", duration: "00:38", progress: 80, hue: 205 },
  { kind: "analisis", title: "Stupaczuk / Di Nenno vs Yanguas / Nieto", duration: "1:02:11", progress: 65, hue: 212 },
  { kind: "clip", title: "Globo profundo a la T", duration: "00:45", progress: 60, hue: 219 },
  { kind: "analisis", title: "Chingotto / Galán vs Tapia / Coello", duration: "49:33", progress: 42, hue: 226 },
  { kind: "clip", title: "Bajada de pared al medio", duration: "00:42", progress: 30, hue: 233 },
  { kind: "analisis", title: "Tapia / Coello vs Galán / Lebrón", duration: "58:24", progress: 20, hue: 240 },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const SectionHeading = ({ title, count }: { title: string; count: number }) => (
  <div className="mb-4 flex items-center justify-between">
    <h2 className="flex items-center gap-2.5 text-lg font-bold text-white">
      {title}
      <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-xs font-semibold text-neon-cyan">
        {count}
      </span>
    </h2>
    <button className="flex items-center gap-1 text-sm font-medium text-neon-cyan transition hover:brightness-110">
      Ver todo <ChevronRight className="h-4 w-4" />
    </button>
  </div>
)

const CarouselArrow = ({ top = "top-1/2" }: { top?: string }) => (
  <button
    className={`absolute -right-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90 ${top}`}
  >
    <ChevronRight className="h-5 w-5" />
  </button>
)

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

const ClipCard = ({ clip }: { clip: SavedClip }) => (
  <Link to="/app/watch?c=1" className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
    <div className="relative">
      <div className="aspect-video w-full" style={thumbStyle(clip.hue)} />
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {clip.duration}
      </span>
    </div>
    <div className="p-3">
      <p className="text-sm font-semibold text-white">{clip.title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {clip.badges.map((b) => (
          <span key={b.label} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[b.tone]}`}>
            {b.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-white/40">Guardado el {clip.saved}</span>
        <Bookmark className="h-4 w-4 text-white/70" fill="currentColor" />
      </div>
    </div>
  </Link>
)

const VideoCard = ({ video }: { video: SavedVideo }) => (
  <Link to="/app/watch?v=1" className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
    <div className="relative">
      <div className="aspect-video w-full" style={thumbStyle(video.hue)} />
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {video.duration}
      </span>
    </div>
    <div className="p-3">
      <p className="text-sm font-semibold leading-snug text-white">{video.title}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
        <Trophy className="h-3.5 w-3.5 text-white/40" /> {video.event}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <Calendar className="h-3.5 w-3.5" /> {video.date}
        </span>
        <Bookmark className="h-4 w-4 text-white/70" fill="currentColor" />
      </div>
    </div>
  </Link>
)

const RecentCard = ({ item }: { item: RecentItem }) => (
  <Link to={item.kind === "analisis" ? "/app/watch?v=1" : "/app/watch?c=1"} className="group block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
    <div className="relative">
      <div className="aspect-video w-full" style={thumbStyle(item.hue)} />
      <span
        className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          item.kind === "analisis" ? "bg-violet-400/20 text-violet-200" : "bg-neon-cyan/20 text-neon-cyan"
        }`}
      >
        {item.kind === "analisis" ? "Análisis" : "Clip"}
      </span>
      <span className="absolute right-2 top-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {item.duration}
      </span>
    </div>
    <div className="p-3">
      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-white">{item.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${item.progress}%` }} />
        </div>
        <span className="text-xs text-white/50">{item.progress}%</span>
      </div>
    </div>
  </Link>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const MiLista = () => (
  <main className="w-full space-y-10 py-8">
    {/* Cabecera */}
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Mi Lista</h1>
        <p className="mt-2 text-sm text-white/60">
          Clips y análisis que has guardado para volver cuando quieras.
        </p>
      </div>
      <button className="flex shrink-0 items-center gap-2 rounded-lg border border-neon-cyan/40 px-4 py-2.5 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/10">
        <Pencil className="h-4 w-4" />
        Gestionar lista
      </button>
    </div>

    {/* Clips guardados */}
    <section>
      <SectionHeading title="Clips guardados" count={24} />
      <div className="relative">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CLIPS.map((c) => (
            <ClipCard key={c.title} clip={c} />
          ))}
        </div>
        <CarouselArrow top="top-[28%]" />
      </div>
    </section>

    {/* Análisis guardados */}
    <section>
      <SectionHeading title="Análisis guardados" count={12} />
      <div className="relative">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VIDEOS.map((v) => (
            <VideoCard key={v.title} video={v} />
          ))}
        </div>
        <CarouselArrow top="top-[42%]" />
      </div>
    </section>

    {/* Vistos recientemente */}
    <section>
      <SectionHeading title="Vistos recientemente" count={8} />
      <div className="relative">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {RECENT.map((r) => (
            <RecentCard key={r.title} item={r} />
          ))}
        </div>
        <CarouselArrow top="top-[28%]" />
      </div>
    </section>
  </main>
)

export default MiLista
