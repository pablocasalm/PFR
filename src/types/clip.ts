export type ReactionCounts = {
  fire: number
  hundred: number
  like: number
  boom: number
}

export type Chapter = {
  id: string
  startSeconds: number
  title: string
  note?: string
}

export type MatchMetadata = {
  tournament: {
    name: string
    season?: string
    location?: string
  }
  round: string
  date?: string
  court?: string
  players: {
    teamA: {
      player1: string
      player2: string
    }
    teamB: {
      player1: string
      player2: string
    }
  }
}

export type Clip = {
  id: string
  title: string
  ideaKey: string
  durationSeconds: number
  thumbnailUrl: string
  clipVideoUrl: string
  fullVideoUrl: string
  subtitlesEsUrl?: string
  subtitlesEnUrl?: string
  tags?: string[]
  reactionCounts?: ReactionCounts
  chapters?: Chapter[]
  match?: MatchMetadata
}
