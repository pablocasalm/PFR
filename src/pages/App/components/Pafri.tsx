import aviso from "../../../assets/pafri/aviso.svg"
import hablando from "../../../assets/pafri/hablando.svg"
import minimal from "../../../assets/pafri/minimal.svg"
import pensando from "../../../assets/pafri/pensando.svg"
import quieto from "../../../assets/pafri/quieto.svg"
import saludando from "../../../assets/pafri/saludando.svg"

/**
 * PAFRI, el muñeco del asistente (tarjeta #148, diseño v14). Cada postura tiene su momento:
 * quieto (normal), aviso («tengo algo para ti»), hablando (panel abierto), pensando (la IA prepara la
 * respuesta), saludando (la primera vez y el adelanto de Essential) y minimal (solo la cabeza; ahora sin uso, en las
 * etiquetas pequeñas va «quieto»). Hay también una con visera (assets/pafri/visera.svg), todavía sin uso.
 *
 * Se pintan como <img>: los SVG comparten ids de degradado («grad», «gcam») y, metidos en línea
 * varios a la vez, se pisarían.
 */
export type PafriPose = "quieto" | "aviso" | "hablando" | "pensando" | "saludando" | "minimal"

const POSES: Record<PafriPose, string> = { quieto, aviso, hablando, pensando, saludando, minimal }

const Pafri = ({ pose, size, className }: { pose: PafriPose; size: number; className?: string }) => (
  <img src={POSES[pose]} alt="" width={size} height={size} draggable={false} className={`object-contain ${className ?? ""}`} />
)

export default Pafri
