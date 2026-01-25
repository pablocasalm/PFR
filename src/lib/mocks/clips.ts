import type { Clip } from "../../types/clip"

const previewVideo = "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
const previewVideoAlt =
  "/clips_test/Sanchez.Josemaria-vs-Castello.Rufo_Clip%201.mov"
const previewVideoVertical =
  "https://videos.pexels.com/video-files/857195/857195-hd_1080_1920_30fps.mp4"
const fullVideo = "https://samplelib.com/lib/preview/mp4/sample-20s.mp4"
const subtitlesEs = "https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_es.vtt"
const subtitlesEn = "https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt"

export const clips: Clip[] = [
  {
    id: "c1",
    title: "Bandeja cruzada para romper el bloqueo del rival",
    ideaKey: "Profundidad + ángulo corto",
    durationSeconds: 38,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideoAlt,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["bandeja", "ataque", "red", "intermedio"],
    reactionCounts: { fire: 86, hundred: 52, like: 140, boom: 28 },
    chapters: [
      { id: "c1-1", startSeconds: 0, title: "Lectura del bloqueo" },
      { id: "c1-2", startSeconds: 12, title: "Cambio de dirección", note: "Ajuste de pies" },
      { id: "c1-3", startSeconds: 26, title: "Cierre en la red" },
    ],
    match: {
      tournament: { name: "Premier Padel Madrid", season: "2024", location: "Madrid" },
      round: "Cuartos de final",
      date: "12/04/2024",
      court: "Central",
      players: {
        teamA: { player1: "Ari Sánchez", player2: "Paula Josemaría" },
        teamB: { player1: "Bea González", player2: "Delfi Brea" },
      },
    },
  },
  {
    id: "c2",
    title: "Salida de pared con timing agresivo en el drive",
    ideaKey: "Paso temprano, brazo relajado",
    durationSeconds: 42,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideoVertical,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["defensa", "transicion", "fondo", "avanzado"],
    reactionCounts: { fire: 64, hundred: 31, like: 112, boom: 45 },
  },
  {
    id: "c3",
    title: "Chiquita al medio para dominar la red",
    ideaKey: "Bola lenta, cintura baja",
    durationSeconds: 31,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideo,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["red", "volea", "intermedio"],
    reactionCounts: { fire: 42, hundred: 18, like: 76, boom: 12 },
  },
  {
    id: "c4",
    title: "Víbora con efecto lateral para ganar el punto",
    ideaKey: "Contacto alto y muñeca firme",
    durationSeconds: 55,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideoAlt,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["remate", "ataque", "avanzado"],
    reactionCounts: { fire: 120, hundred: 88, like: 210, boom: 64 },
    chapters: [
      { id: "c4-1", startSeconds: 0, title: "Preparación del remate" },
      { id: "c4-2", startSeconds: 15, title: "Ataque paralelo", note: "Buscar la salida" },
      { id: "c4-3", startSeconds: 34, title: "Cierre del punto" },
    ],
    match: {
      tournament: { name: "WPT Barcelona Master", season: "2023", location: "Barcelona" },
      round: "Semifinal",
      date: "21/10/2023",
      court: "Pista 1",
      players: {
        teamA: { player1: "Juan Lebrón", player2: "Ale Galán" },
        teamB: { player1: "Paquito Navarro", player2: "Fede Chingotto" },
      },
    },
  },
  {
    id: "c5",
    title: "Globo ofensivo para girar la pareja rival",
    ideaKey: "Altura + profundidad",
    durationSeconds: 29,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideo,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["saque", "transicion", "fondo"],
    reactionCounts: { fire: 33, hundred: 14, like: 58, boom: 10 },
  },
  {
    id: "c6",
    title: "Defensa con pared lateral en situación límite",
    ideaKey: "Bola baja, salida rápida",
    durationSeconds: 47,
    isPremium: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    clipVideoUrl: previewVideoAlt,
    fullVideoUrl: fullVideo,
    subtitlesEsUrl: subtitlesEs,
    subtitlesEnUrl: subtitlesEn,
    tags: ["defensa", "fondo", "intermedio"],
    reactionCounts: { fire: 51, hundred: 22, like: 90, boom: 19 },
  },
]
