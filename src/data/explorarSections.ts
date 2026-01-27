export type ExplorarSectionConfig = {
  id: string
  title: string
  cardTarget: "clip" | "video" | "collection"
  clipIds?: string[]
  collectionSlugs?: string[]
  className?: string
  thumbnailUrlOverride?: string
  thumbnailUrlsByIndex?: string[]
}

export const featuredClipId = "c1"

const miniaturas = [
  "/Mniaturas/GalanChingo.TapiaCoello.png",
  "/Mniaturas/LebronAusburger.TapiaCoello.png",
  "/Mniaturas/Miniatura_Galan.Chingotto-vs-Tello.Alonso.PNG",
  "/Mniaturas/Miniatura_Sanchez.Josemaria-vs-Castello.Rufo.png",
  "/Mniaturas/SanchezJosemaria.GonzalezFernandez.png",
  "/Mniaturas/SanchezJosemaria.OrtegaIcardo.png",
  "/Mniaturas/TriayBrea.OrtegaIcardo.png",
  "/Mniaturas/TriayBrea.SanchezJosemaria.png",
  "/Mniaturas/UsteroAraujo.OrtgeaIcardo.png",
  "/Mniaturas/YanguasNieto.GalanChingo.png",
  "/Mniaturas/YanguasNieto.TapiaCoello.png",
]

export const explorarSections: ExplorarSectionConfig[] = [
  {
    id: "collections",
    title: "Colecciones",
    cardTarget: "collection",
    collectionSlugs: ["patrones-que-ganan-puntos", "decision-bajo-presion", "dominio-de-la-red"],
    className: "",
  },
  {
    id: "highlighted",
    title: "Clips destacados",
    cardTarget: "clip",
    clipIds: ["c1", "c2", "c3", "c4", "c5", "c6", "c7"],
    thumbnailUrlOverride: "/Colores/imagen.png",
  },
  {
    id: "videos",
    title: "Videos recientes",
    cardTarget: "video",
    clipIds: ["c8", "c9", "c10", "c11", "c12", "c13", "c14"],
    className: "pt-2",
    thumbnailUrlsByIndex: miniaturas,
  },
]
