import type { Account } from "../../types/clip"

type AuthorChipProps = {
  author: Account
  size?: "sm" | "md"
}

const sizeMap = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
}

const AuthorChip = ({ author, size = "md" }: AuthorChipProps) => {
  const avatarSize = sizeMap[size]
  const fallbackAvatar = "/Mniaturas/vertical-placeholder.svg"
  return (
    <div className="flex items-center gap-2">
      <img
        src={author.avatarUrl ?? fallbackAvatar}
        alt={author.name}
        className={`${avatarSize} rounded-full object-cover`}
        loading="lazy"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{author.name}</p>
        {author.handle && (
          <p className="truncate text-xs text-white/50">{author.handle}</p>
        )}
      </div>
    </div>
  )
}

export default AuthorChip
