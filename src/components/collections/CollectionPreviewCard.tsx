import { Link } from "react-router-dom"
import type { Collection } from "../../types/collection"
import Card from "../ui/Card"

type CollectionPreviewCardProps = {
  collection: Collection
}

const CollectionPreviewCard = ({ collection }: CollectionPreviewCardProps) => {
  return (
    <Link
      to={`/app/collections/${collection.slug}`}
      className="group"
    >
      <Card className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-midnight-soft/60 p-5 shadow-xl transition-transform duration-200 hover:scale-[1.02]">
        <div className="relative">
          <div className="absolute -left-2 -top-2 h-32 w-full rounded-2xl border border-white/10 bg-white/5" />
          <div className="absolute -left-1 -top-1 h-32 w-full rounded-2xl border border-white/10 bg-white/5" />
          <div className="relative h-32 w-full overflow-hidden rounded-2xl">
            <img
              src={collection.thumbnailUrl}
              alt={collection.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
          </div>
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            ▦ {collection.clipIds.length} videos
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <h3 className="line-clamp-2 text-base font-medium text-white">{collection.title}</h3>
          <p className="line-clamp-2 text-sm text-zinc-400">{collection.description}</p>
        </div>
      </Card>
    </Link>
  )
}

export default CollectionPreviewCard
