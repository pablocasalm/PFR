import { clips } from "../mocks/clips"
import type { Clip } from "../../types/clip"

export const getClips = () => clips

export const getClipById = (id: string) => clips.find((clip) => clip.id === id)

export const getClipsByIds = (ids: string[]) =>
  ids
    .map((id) => clips.find((clip) => clip.id === id))
    .filter((clip): clip is Clip => Boolean(clip))
