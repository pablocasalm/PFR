import { useEffect, useRef, useState } from "react"

const LandingProvisional = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  const openModal = () => {
    lastFocusRef.current = document.activeElement as HTMLElement | null
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    lastFocusRef.current?.focus()
  }

  useEffect(() => {
    if (!isModalOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeModal()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.classList.add("overflow-hidden")
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.classList.remove("overflow-hidden")
    }
  }, [isModalOpen])

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        {/* BLOCK 1 — HERO */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
              Padel Film Room
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
              Deja de perder puntos por decisiones mal tomadas.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Film Room táctico de pádel: análisis de decisiones reales bajo presión para que
              entiendas el porqué de cada punto y repitas patrones ganadores.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="rounded-full bg-[#28f0e0] px-6 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
              >
                Únete a la lista privada
              </button>
              <button
                type="button"
                onClick={openModal}
                className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
              >
                Ver un ejemplo
              </button>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p>Acceso anticipado al catálogo</p>
              <p>Ejemplos reales de análisis (teasers)</p>
              <p>Cero spam. Salida en 1 clic.</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18] p-8">
            <div className="absolute inset-0 opacity-40">
              <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:28px_28px]" />
            </div>
            <div className="relative z-10 flex h-72 flex-col items-center justify-center rounded-2xl border border-white/15 bg-[#05070c]">
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.28em] text-white/70">
                EXPLAINER • 00:37
              </div>
              <div className="absolute bottom-4 left-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.28em] text-white/60">
                TC 00:00:12:08
              </div>
              <span className="text-sm text-white/50">Video Frame</span>
            </div>
          </div>
        </section>

        {/* BLOCK 2 — VIDEO EXPLAINER */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18] p-6">
            <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.28em] text-white/70">
              EXPLAINER • 00:37
            </div>
            <button
              type="button"
              onClick={openModal}
              className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
              aria-label="Reproducir ejemplo de análisis"
            >
              ▶
            </button>
            <div className="h-72 rounded-2xl border border-white/10 bg-[#05070c]" />
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">Mira el método en 37 segundos.</h2>
            <p className="text-base text-white/70">
              No son tips sueltos. Es lectura táctica: contexto → señal → decisión → consecuencia.
            </p>
            <div className="space-y-2 text-sm text-white/70">
              <p>Qué información importa (y cuál ignorar)</p>
              <p>La señal que cambia tu decisión</p>
              <p>La consecuencia: punto ganado o regalado</p>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
            >
              Ver un ejemplo
            </button>
          </div>
        </section>

        {/* BLOCK 3 — PAIN */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Juegas a ciegas.</h2>
          <p className="max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
            Entrenas golpes. Te sientes bien en el carro. Pero en partido… eliges mal. Llegas tarde,
            dudas, regalas puntos “tontos”. Y lo peor: no sabes exactamente por qué pasó, así que lo
            repites.
          </p>
          <div className="space-y-2 text-sm text-white/70">
            <p>Tomas decisiones tarde y bajo presión te desconectas</p>
            <p>Consumes “tips” sin contexto y no lo llevas al partido real</p>
            <p>Repites el mismo error porque no ves el patrón</p>
          </div>
        </section>

        {/* BLOCK 4 — SOLUTION & GAIN */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">
              Pasa de “golpes aislados” a decisiones correctas con un mapa mental claro para cada
              situación.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 text-sm text-white/70">
              <p className="text-white/50">Antes</p>
              <p>Juegas por sensación</p>
              <p>Buscas tips sueltos</p>
              <p>Dudas en momentos clave</p>
              <p>No sabes por qué pierdes</p>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p className="text-white/50">Después</p>
              <p>Juegas con lectura</p>
              <p>Sigues patrones repetibles</p>
              <p>Decides rápido bajo presión</p>
              <p>Entiendes la causa del punto</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Contexto: qué está pasando de verdad",
              "Señal: el detalle que manda",
              "Decisión: la opción segura",
              "Consecuencia: por qué funciona (o por qué te castigan)",
            ].map((item) => (
              <p key={item} className="text-sm text-white/70">
                {item}
              </p>
            ))}
          </div>
        </section>

        {/* BLOCK 5 — HOW IT WORKS */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">El análisis se ve así:</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <p className="text-sm text-white/70">
              Contexto (marcador, posiciones, velocidad, intención)
            </p>
            <p className="text-sm text-white/70">Señal (la pista que define la opción)</p>
            <p className="text-sm text-white/70">Decisión (qué elegir y qué evitar)</p>
            <p className="text-sm text-white/70">Patrón repetible (cuándo volver a hacerlo)</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
          >
            Ver un ejemplo
          </button>
        </section>

        {/* BLOCK 6 — PROOF */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Prueba real: un teaser de análisis.
          </h2>
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="h-64 rounded-2xl bg-[#0a0f18] p-4">
              <div className="h-full rounded-xl border border-white/10 bg-[#05070c]" />
            </div>
            <div className="space-y-3 text-sm text-white/70">
              <p>“Aquí estaba la señal”</p>
              <p>“Aquí se decide”</p>
              <p>“Aquí se gana / se regala”</p>
              <p className="text-white/50">
                Esto es un teaser. La versión final incluye el breakdown completo (contexto →
                señal → decisión → consecuencia).
              </p>
            </div>
          </div>
        </section>

        {/* BLOCK 7 — OFFER & VALUE */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Acceso anticipado para los que quieren pensar el juego.
          </h2>
          <div className="space-y-2 text-sm text-white/70">
            <p>Acceso a los primeros análisis del catálogo</p>
            <p>Ejemplos exclusivos para la lista privada</p>
            <p>Prioridad cuando abramos la plataforma</p>
            <p>“Drop exclusivo mensual” (solo lista privada)</p>
            <p>(Futuro) Comunidad/Q&amp;A (próximamente)</p>
          </div>
          <p className="text-sm text-white/70">Menos tiempo perdido. Más puntos por decisión.</p>
        </section>

        {/* BLOCK 8 — RISK-REDUCTION */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Sin riesgo. Sin presión.</h2>
          <div className="space-y-2 text-sm text-white/70">
            <p>Te apuntas en 10 segundos</p>
            <p>Cero spam</p>
            <p>Te das de baja cuando quieras (1 clic)</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-white/50">
            <span>Acceso anticipado</span>
            <span>Contenido editorial</span>
            <span>Decisión &gt; ejecución</span>
          </div>
        </section>

        {/* BLOCK 9 — SCARCITY / URGENCY */}
        <section className="space-y-4">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Lanzamiento por fases.</h2>
          <p className="text-base text-white/70">
            La lista privada recibe el acceso primero y los ejemplos antes de publicarlos en
            abierto.
          </p>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
          >
            Quiero estar dentro
          </button>
        </section>

        {/* BLOCK 10 — FAQ */}
        <section className="space-y-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">FAQ</h2>
          <div className="space-y-4 text-sm text-white/70">
            <p>¿Es para mi nivel (amateur/competitivo)?</p>
            <p>¿Cuánto tiempo necesito para notar mejora?</p>
            <p>¿Esto sustituye a un entrenador?</p>
            <p>¿Hay técnica? (enfoque principal es decisión; técnica como soporte)</p>
            <p>¿Cómo será el precio? (por definir; lista privada se entera primero)</p>
          </div>
        </section>

        {/* BLOCK 11 — FINAL CTA */}
        <section className="space-y-4">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">
            Jugar mejor no es golpear más fuerte. Es decidir mejor.
          </h2>
          <button
            type="button"
            className="rounded-full bg-[#28f0e0] px-6 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-black transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28f0e0]/70"
          >
            Únete a la lista privada
          </button>
          <p className="text-sm text-white/60">
            Acceso anticipado + ejemplos reales. Cero spam. Salida en 1 clic.
          </p>
        </section>
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0a0f18] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 id="preview-title" className="text-lg font-semibold text-white">
                Ejemplo de análisis
              </h3>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-6 h-72 rounded-2xl border border-white/10 bg-[#05070c]" />
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingProvisional
