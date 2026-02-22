import { Link } from "react-router-dom"
import type { Collection } from "../../types/collection"

type CollectionPreviewCardProps = {
  collection: Collection
}

const CollectionPreviewCard = ({ collection }: CollectionPreviewCardProps) => {
  return (
    <Link
      to={`/app/collections/${collection.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-midnight-soft/60 p-4 shadow-xl transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative">
        <div className="absolute -left-2 -top-2 h-28 w-full rounded-2xl border border-white/10 bg-white/5" />
        <div className="absolute -left-1 -top-1 h-28 w-full rounded-2xl border border-white/10 bg-white/5" />
        <div className="relative h-28 w-full overflow-hidden rounded-2xl">
          <img
            src={collection.thumbnailUrl}
            alt={collection.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
        </div>
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
          ▦ {collection.clipIds.length} videos
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="line-clamp-2 text-base font-semibold text-white">{collection.title}</h3>
        <p className="line-clamp-2 text-xs text-white/60">{collection.description}</p>
      </div>
    </Link>
  )
}

export default CollectionPreviewCard
