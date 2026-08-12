/**
 * Pantalla de carga a pantalla completa con la identidad de PFR (logo + anillo giratorio
 * + wordmark + puntos). Se usa como fallback del router mientras cargan los chunks.
 * Respeta prefers-reduced-motion (motion-safe).
 */
const LoadingScreen = () => (
  <div className="flex min-h-screen w-full flex-col items-center justify-center bg-midnight bg-film-room text-white">
    <div className="relative flex h-20 w-20 items-center justify-center">
      {/* Anillo giratorio alrededor del logo */}
      <span className="absolute inset-0 rounded-full border-2 border-white/10 border-t-neon-cyan motion-safe:animate-spin" />
      {/* Logo */}
      <img
        src="/Logos/favicon_sinfondo.png"
        alt="Padel Film Room"
        className="h-11 w-11 object-contain"
      />
    </div>

    <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-white/80">Padel Film Room</p>

    <div className="mt-2.5 flex items-center gap-1.5" role="status" aria-label="Cargando">
      <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/70 motion-safe:animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/70 motion-safe:animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan/70 motion-safe:animate-bounce" />
    </div>
  </div>
)

export default LoadingScreen
