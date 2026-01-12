'use client';

import { Nav } from '@/components/Nav';
import { ScrollProgress } from '@/components/ScrollProgress';
import { Hero } from '@/components/Hero';
import { Section } from '@/components/Section';
import { Cards } from '@/components/Cards';
import { EmailCapture } from '@/components/EmailCapture';
import { ImageGridPlaceholders } from '@/components/ImageGridPlaceholders';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollProgress />
      <Nav />
      <main className="relative">
        <Hero />

        <Section
          id="que-es"
          title="No es otro canal de pádel"
          subtitle="Aquí no analizamos golpes aislados. Analizamos decisiones, contextos y patrones reales del pádel profesional."
          description="Lo importante no es qué golpe se ejecuta, sino por qué se elige."
          className="section-divider bg-[#0b0f12]"
        />

        <Section
          id="contenido"
          title="¿Qué tipo de contenido estamos creando?"
          className="section-divider bg-[#0f1418]"
        >
          <Cards />
        </Section>

        <Section
          id="canales"
          title="Síguenos donde aparezca el contenido"
          subtitle="Iremos publicando en nuestros canales. Si te interesa este enfoque, síguenos y estate atento."
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
          description="La lista de correo tendrá acceso anticipado, prioridad y contenido que no publicaremos en abierto."
          className="section-divider bg-[#0f1418]"
        />

        <Section
          title="Visualiza lo que viene"
          subtitle="Espacio para diagramas, patrones y decisiones tácticas que iremos mostrando."
          className="section-divider bg-[#0b0f12]"
        >
          <ImageGridPlaceholders />
        </Section>

        <Section
          id="faq"
          title="FAQ"
          subtitle="Respuestas rápidas antes de entrar en la lista."
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
  );
}
