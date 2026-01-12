import Cards from "../../components/landing/Cards"
import EmailCapture from "../../components/landing/EmailCapture"
import FAQ from "../../components/landing/FAQ"
import Footer from "../../components/landing/Footer"
import Hero from "../../components/landing/Hero"
import ImageGridPlaceholders from "../../components/landing/ImageGridPlaceholders"
import Nav from "../../components/landing/Nav"
import ScrollProgress from "../../components/landing/ScrollProgress"
import Section from "../../components/landing/Section"

const Landing = () => (
  <div className="min-h-screen bg-background text-foreground">
    <ScrollProgress />
    <Nav />
    <main className="relative">
      <Hero />

      <Section
        id="que-es"
        title="No es otro canal de padel"
        subtitle="Aqui no analizamos golpes aislados. Analizamos decisiones, contextos y patrones reales del padel profesional."
        description="Lo importante no es que golpe se ejecuta, sino por que se elige."
        className="section-divider bg-[#0b0f12]"
      />

      <Section
        id="contenido"
        title="Que tipo de contenido estamos creando?"
        className="section-divider bg-[#0f1418]"
      >
        <Cards />
      </Section>

      <Section
        id="canales"
        title="Siguenos donde aparezca el contenido"
        subtitle="Iremos publicando en nuestros canales. Si te interesa este enfoque, siguenos y estate atento."
        className="section-divider bg-[#0b0f12]"
      >
        <div className="flex flex-wrap gap-4">
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            YouTube
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Instagram
          </a>
        </div>
      </Section>

      <Section
        title="Esto es solo el principio"
        subtitle="Estamos construyendo algo para jugadores que quieren pensar mejor cada punto."
        description="La lista de correo tendra acceso anticipado, prioridad y contenido que no publicaremos en abierto."
        className="section-divider bg-[#0f1418]"
      />

      <Section
        title="Visualiza lo que viene"
        subtitle="Espacio para diagramas, patrones y decisiones tacticas que iremos mostrando."
        className="section-divider bg-[#0b0f12]"
      >
        <ImageGridPlaceholders />
      </Section>

      <Section
        id="faq"
        title="FAQ"
        subtitle="Respuestas rapidas antes de entrar en la lista."
        className="section-divider bg-[#0f1418]"
      >
        <FAQ />
      </Section>

      <Section
        title="Entra antes del lanzamiento"
        subtitle="Si te interesa este enfoque, deja tu email y te avisamos."
        className="section-divider bg-[#0b0f12]"
      >
        <EmailCapture buttonLabel="Quiero estar dentro" />
      </Section>
    </main>
    <Footer />
  </div>
)

export default Landing
