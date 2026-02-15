import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "./motion"

const items = [
  {
    title: "Puntos reales",
    description: "Marcador, posiciones y objetivo. Lectura previa al golpe. Decisión sobre ejecución.",
  },
  {
    title: "Señales tácticas",
    description: "Ritmo, altura y distancia. Presión sobre el rival. Ventanas de ataque.",
  },
  {
    title: "Elección correcta",
    description: "Qué opción reduce riesgo. Qué opción abre el punto. Qué opción mantiene iniciativa.",
  },
  {
    title: "Patrones repetibles",
    description: "Secuencias que se repiten. Reconocer señales. Aplicar en tu juego.",
  },
  {
    title: "Ajustes finos",
    description: "Errores de lectura. Cuándo arriesgar. Cuándo asegurar.",
  },
  {
    title: "Ideas accionables",
    description: "1-2 cambios por partido. Claros y aplicables. Sin humo.",
  },
]

const Cards = () => {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <motion.div
      variants={staggerContainer(reduceMotion, 0.08)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      className="space-y-6"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.title}
          variants={fadeUp(reduceMotion)}
          className={cn(
            "group transition",
            !reduceMotion && "hover:-translate-y-0.5 hover:text-white"
          )}
        >
          <div className="flex items-start gap-4">
            <span className="mt-1 text-xs font-mono uppercase tracking-[0.2em] text-white/40">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

export default Cards
