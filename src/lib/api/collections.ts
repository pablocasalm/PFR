import { collections } from "../mocks/collections"

export const getCollections = () => collections

export const getCollectionBySlug = (slug: string) =>
  collections.find((collection) => collection.slug === slug)
