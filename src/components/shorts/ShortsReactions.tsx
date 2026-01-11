import { useState } from "react"
import type { ReactionCounts } from "../../types/clip"

type ReactionKey = keyof ReactionCounts

type ShortsReactionsProps = {
  initialCounts?: ReactionCounts
}

const reactions: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "fire", emoji: "🔥", label: "Caliente" },
  { key: "like", emoji: "👍", label: "Me gusta" },
  { key: "hundred", emoji: "💯", label: "Perfecto" },
  { key: "boom", emoji: "💥", label: "Impacto" },
]

const defaultCounts: ReactionCounts = {
  fire: 24,
  hundred: 18,
  like: 32,
  boom: 9,
}

const ShortsReactions = ({ initialCounts }: ShortsReactionsProps) => {
  const [activeKey, setActiveKey] = useState<ReactionKey | null>(null)
  const [counts, setCounts] = useState<ReactionCounts>({
    ...defaultCounts,
    ...initialCounts,
  })

  const toggleReaction = (key: ReactionKey) => {
    setCounts((prevCounts) => {
      const nextCounts = { ...prevCounts }
      if (activeKey && activeKey !== key) {
        nextCounts[activeKey] = Math.max(0, nextCounts[activeKey] - 1)
      }
      const isSame = activeKey === key
      nextCounts[key] = Math.max(0, nextCounts[key] + (isSame ? -1 : 1))
      return nextCounts
    })
    setActiveKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {reactions.map((reaction) => {
        const isActive = activeKey === reaction.key
        return (
          <button
            key={reaction.key}
            type="button"
            onClick={() => toggleReaction(reaction.key)}
            className={`focus-ring inline-flex flex-col items-center gap-1 rounded-full border px-3.5 py-3 text-xs font-semibold backdrop-blur transition ${
              isActive
                ? "border-white bg-black/85 text-white shadow-[0_0_0_1px_#ffffff]"
                : "border-white/10 bg-black/80 text-white/90 hover:text-white"
            }`}
            aria-pressed={isActive}
            aria-label={reaction.label}
          >
            <span className={`text-lg ${isActive ? "text-white" : ""}`}>{reaction.emoji}</span>
            <span className="hidden text-[10px] sm:inline">{counts[reaction.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ShortsReactions
