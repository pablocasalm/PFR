import { ChevronRight } from "lucide-react"

/**
 * Subcomponentes visuales reutilizables del nuevo dashboard (/appnew).
 * Solo presentación: nada de lógica ni datos reales.
 */

export type CardData = { title: string; duration: string; tags: string[] }

export const TagChip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan">
    #{children}
  </span>
)

export const VideoCard = ({ card, hue }: { card: CardData; hue: number }) => (
  <div className="group w-full cursor-pointer">
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <div
        className="aspect-video w-full"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 45%, 22%), hsl(${hue + 30}, 40%, 10%))`,
        }}
      />
      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {card.duration}
      </span>
    </div>
    <p className="mt-2 text-sm font-medium text-white">{card.title}</p>
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {card.tags.map((t) => (
        <span key={t} className="text-[11px] text-neon-cyan/80">
          #{t}
        </span>
      ))}
    </div>
  </div>
)

export const SidebarCard = ({
  title,
  action,
  children,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
      {action}
    </div>
    {children}
  </div>
)

export const SectionHeading = ({
  title,
  action,
}: {
  title: React.ReactNode
  action?: React.ReactNode
}) => (
  <div className="flex items-center gap-3">
    <h2 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
    {action ?? (
      <button className="ml-auto flex shrink-0 items-center gap-1 text-sm font-medium text-neon-cyan">
        Ver todos <ChevronRight className="h-4 w-4" />
      </button>
    )}
  </div>
)
