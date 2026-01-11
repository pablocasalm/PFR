import { useState } from "react"

type ReactionKey = "fire" | "hundred" | "like" | "boom"

type Reaction = {
  key: ReactionKey
  emoji: string
  label: string
}

type ReactionCounts = Record<ReactionKey, number>

type ReactionBarProps = {
  initialCounts?: Partial<ReactionCounts>
}

const reactions: Reaction[] = [
  { key: "fire", emoji: "🔥", label: "Caliente" },
  { key: "hundred", emoji: "💯", label: "Perfecto" },
  { key: "like", emoji: "👍", label: "Me gusta" },
  { key: "boom", emoji: "💥", label: "Impacto" },
]

const defaultCounts: ReactionCounts = {
  fire: 24,
  hundred: 18,
  like: 32,
  boom: 9,
}

const ReactionBar = ({ initialCounts }: ReactionBarProps) => {
  const [active, setActive] = useState<Record<ReactionKey, boolean>>({
    fire: false,
    hundred: false,
    like: false,
    boom: false,
  })
  const [counts, setCounts] = useState<ReactionCounts>({
    ...defaultCounts,
    ...initialCounts,
  })

  const toggleReaction = (key: ReactionKey) => {
    setActive((prev) => {
      const nextValue = !prev[key]
      setCounts((countsPrev) => ({
        ...countsPrev,
        [key]: Math.max(0, countsPrev[key] + (nextValue ? 1 : -1)),
      }))
      return { ...prev, [key]: nextValue }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reactions.map((reaction) => {
        const isActive = active[reaction.key]
        return (
          <button
            key={reaction.key}
            type="button"
            onClick={() => toggleReaction(reaction.key)}
            className={`focus-ring inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-all duration-300 ${
              isActive
                ? "border border-white/60 bg-white/20 text-white shadow-[0_0_0_1px_#ffffff]"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
            aria-pressed={isActive}
            aria-label={reaction.label}
          >
            <span className={`text-base ${isActive ? "text-white" : ""}`}>{reaction.emoji}</span>
            <span>{counts[reaction.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ReactionBar
