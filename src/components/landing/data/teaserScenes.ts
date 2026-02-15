type TeaserScene = {
  id: string
  title: string
  situation: string
  signals: string[]
  decision: string
  consequence: string
  tags: string[]
}

const teaserScenes: TeaserScene[] = [
  {
    id: "scene-1",
    title: "Salida de pared",
    situation: "Globo corto, rival cerrando el centro y tu pareja retrasada.",
    signals: ["Rival entrando tarde", "Centro cubierto", "Espacio cruzado abierto"],
    decision: "Salir cruzado con altura media para ganar tiempo.",
    consequence: "Recuperas red y obligas la bandeja defensiva.",
    tags: ["transición", "profundidad", "tiempo"],
  },
  {
    id: "scene-2",
    title: "Bandeja con lectura",
    situation: "Bandeja cómoda pero rival con intención de contraataque.",
    signals: ["Pies rivales quietos", "Cuerpo inclinado atrás", "Paralela libre"],
    decision: "Bandeja profunda al cuerpo para fijar.",
    consequence: "Forzas devolución corta y mantienes iniciativa.",
    tags: ["control", "cuerpo", "ritmo"],
  },
  {
    id: "scene-3",
    title: "Defensa activa",
    situation: "Ataque rival continuo, necesitas cortar el patrón.",
    signals: ["Rival repite mismo ángulo", "Poco desplazamiento lateral", "Globo viable"],
    decision: "Globo alto al revés para reiniciar el punto.",
    consequence: "Rompes el patrón y recuperas posición.",
    tags: ["patrón", "altura", "reinicio"],
  },
]

export type { TeaserScene }
export default teaserScenes
