import { useRef, useState } from "react"
import Cards from "../../components/landing/Cards"
import EmailCapture from "../../components/landing/EmailCapture"
import ExplainerAdSection from "../../components/landing/ExplainerAdSection"
import FAQ from "../../components/landing/FAQ"
import Footer from "../../components/landing/Footer"
import Hero from "../../components/landing/Hero"
import ImageGridPlaceholders from "../../components/landing/ImageGridPlaceholders"
import LazySection from "../../components/landing/LazySection"
import Nav from "../../components/landing/Nav"
import PreviewModal from "../../components/landing/PreviewModal"
import ScrollProgress from "../../components/landing/ScrollProgress"
import Section from "../../components/landing/Section"
import TeaserBoard from "../../components/landing/TeaserBoard"

const Landing = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const waitlistSectionRef = useRef<HTMLDivElement | null>(null)

  const focusEmail = () => {
    const target = inputRef.current ?? waitlistSectionRef.current
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      window.setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
    } else {
      inputRef.current?.focus()
    }
  }

  const openPreview = () => setIsPreviewOpen(true)
  const closePreview = () => setIsPreviewOpen(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Nav onWaitlistClick={focusEmail} />
      <main id="main-content" className="relative">
        <Hero onOpenPreview={openPreview} inputRef={inputRef} />
        <ExplainerAdSection onOpenPreview={openPreview} />

        <Section
          id="que-es"
          variant="structured"
          chapter="CAPÍTULO 01"
          title="No es otro canal de pádel"
          subtitle="Aquí no analizamos golpes aislados. Analizamos decisiones, contextos y patrones reales del pádel profesional."
          description="Lo importante no es qué golpe se ejecuta, sino por qué se elige."
          className="section-divider bg-[#0b0f12]"
        >
          <div className="grid gap-6 rounded-3xl border border-white/10 bg-[#0a0f18] p-6 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/50">
                Lo típico
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>Golpe aislado sin contexto</li>
                <li>Repetición sin lectura</li>
                <li>Poca transferencia a partido real</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/50">
                Film room
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>Contexto, señales y elección</li>
                <li>Patrones que se repiten</li>
                <li>Decisiones aplicables</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section
          id="ejemplo"
          variant="structured"
          chapter="CAPÍTULO 02"
          title="Cómo se ve un análisis"
          subtitle="Decisión, contexto y patrón en 20 segundos."
          className="section-divider bg-[#0f1418]"
        >
          <p className="mb-6 max-w-3xl text-sm text-white/60 md:text-base">
            Esto es un teaser: el producto final incluye breakdown completo (contexto → señal →
            decisión → consecuencia).
          </p>
          <TeaserBoard onJoinClick={focusEmail} />
        </Section>

        <Section
          id="contenido"
          title="Qué tipo de contenido estamos creando"
          className="section-divider bg-[#0b0f12]"
        >
          <Cards />
        </Section>

        <Section
          id="canales"
          title="Síguenos donde aparezca el contenido"
          subtitle="Iremos publicando en nuestros canales. Si te interesa este enfoque, síguenos y estate atento."
          className="section-divider bg-[#0f1418]"
        >
          <LazySection minHeight={120}>
            <div className="flex flex-wrap gap-4">
              {["YouTube", "Instagram"].map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Pronto"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/40"
                >
                  {label}
                </button>
              ))}
            </div>
          </LazySection>
        </Section>

        <Section
          title="Esto es solo el principio"
          subtitle="Estamos construyendo algo para jugadores que quieren pensar mejor cada punto."
          description="La lista de correo tendrá acceso anticipado, prioridad y contenido que no publicaremos en abierto."
          className="section-divider bg-[#0b0f12]"
        />

        <Section
          title="Visualiza lo que viene"
          subtitle="Diagramas, patrones y decisiones tácticas en formato film room."
          className="section-divider bg-[#0f1418]"
        >
          <LazySection minHeight={260}>
            <ImageGridPlaceholders />
          </LazySection>
        </Section>

        <Section
          id="faq"
          title="FAQ"
          subtitle="Respuestas rápidas antes de entrar en la lista."
          className="section-divider bg-[#0b0f12]"
        >
          <LazySection minHeight={240}>
            <FAQ />
          </LazySection>
        </Section>

        <Section
          id="waitlist"
          variant="structured"
          title="Entra antes del lanzamiento"
          subtitle="Si te interesa este enfoque, deja tu email y te avisamos."
          className="section-divider bg-[#0f1418]"
        >
          <div ref={waitlistSectionRef}>
            <EmailCapture
              inputId="waitlist-email"
              inputRef={inputRef}
              microcopy="Acceso anticipado + ejemplos de análisis. Cero spam. Puedes salir cuando quieras."
              buttonLabel="Únete a la lista privada"
            />
          </div>
        </Section>
      </main>
      <Footer />
      <PreviewModal open={isPreviewOpen} onClose={closePreview} title="Cómo se ve un análisis">
        <TeaserBoard compact onJoinClick={focusEmail} />
      </PreviewModal>
    </div>
  )
}

export default Landing
