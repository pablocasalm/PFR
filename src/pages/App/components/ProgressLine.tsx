/**
 * Lo visto de un vídeo, al estilo de YouTube: una línea azul abajo, dentro de la miniatura (que
 * tiene que ser `relative`). Llena si ya se terminó; nada si no se ha empezado. Sustituye a la
 * insignia verde de «Visto» y a la fila «Continúa viendo» de Inicio (tarjetas #134/#136): en
 * cualquier sitio se ve lo que se puede seguir viendo sin gastar espacio.
 */
const ProgressLine = ({ progress, completed }: { progress?: number | null; completed?: boolean | null }) => {
  const pct = completed ? 100 : Math.min(progress ?? 0, 100)
  if (pct <= 0) return null
  return (
    <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
      <span className="block h-full bg-neon-cyan" style={{ width: `${pct}%` }} />
    </span>
  )
}

export default ProgressLine
