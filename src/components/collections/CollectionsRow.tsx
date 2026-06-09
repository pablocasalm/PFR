import type { Collection } from "../../types/collection"
import CollectionPreviewCard from "./CollectionPreviewCard"

type CollectionsRowProps = {
  collections: Collection[]
  className?: string
}

const CollectionsRow = ({ collections, className = "" }: CollectionsRowProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <div key={collection.slug} className="min-w-0">
            <CollectionPreviewCard collection={collection} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default CollectionsRow
