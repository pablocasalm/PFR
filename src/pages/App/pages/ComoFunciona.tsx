import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"

/**
 * Cómo funciona — página explicativa del método de Padel Film Room.
 *
 * Notas de la portación a la app:
 *  - Todo el CSS va scopeado bajo `#cf` (anidamiento nativo) para no filtrarse al resto de la app.
 *  - El contenedor `#cf` es a sangre completa (full-bleed): cancela el padding del AppLayout
 *    y pinta el fondo exacto del diseño de lado a lado.
 *  - La barra superior falsa del diseño se omite: el Header real de la app ocupa ese lugar.
 *  - La fuente Space Grotesk ya la carga la app; aquí solo se referencia por nombre.
 */

const css = `
#cf {
  --ground: #05070c;
  --panel: #0c1220;
  --cyan: #28f0e0;
  --lime: #befc4b;
  --blue: #5b8cff;
  --text: #f1f5f9;
  --muted: rgba(241, 245, 249, 0.58);
  --faint: rgba(241, 245, 249, 0.4);
  --line: rgba(255, 255, 255, 0.1);
  --line-soft: rgba(255, 255, 255, 0.05);
  --panel-fill: rgba(255, 255, 255, 0.02);
  --maxw: 1240px;

  /* Full-bleed: rompe el padding del AppLayout y ocupa todo el ancho de la ventana */
  position: relative;
  left: 50%;
  right: 50%;
  width: 100vw;
  max-width: 100vw;
  margin-left: -50vw;
  margin-right: -50vw;
  overflow-x: clip;

  background-color: var(--ground);
  background-image:
    radial-gradient(circle at 15% 12%, rgba(40, 240, 224, 0.13), transparent 38%),
    radial-gradient(circle at 82% 6%, rgba(190, 252, 75, 0.09), transparent 34%),
    radial-gradient(circle at 50% 88%, rgba(58, 92, 255, 0.11), transparent 46%);
  background-attachment: fixed;
  color: var(--text);
  font-family: "Space Grotesk", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;

  * { box-sizing: border-box; }

  .wrap {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 0 clamp(1.1rem, 4vw, 2.5rem);
  }

  /* --- Ritmo de secciones --- */
  section { padding-block: clamp(3.4rem, 8vw, 5.5rem); }
  section + section { border-top: 1px solid var(--line-soft); }

  .eyebrow {
    margin: 0 0 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--cyan);
  }
  h1, h2 { text-wrap: balance; margin: 0; font-weight: 700; letter-spacing: -0.01em; }
  h2 { font-size: clamp(1.5rem, 3.6vw, 2.15rem); }
  .lead {
    max-width: 58ch;
    margin: 0.9rem auto 0;
    color: var(--muted);
    text-align: center;
    font-size: 1.08rem;
    line-height: 1.6;
  }

  /* --- Hero --- */
  .hero { text-align: center; padding-block: clamp(3.5rem, 10vw, 6.5rem); }
  .hero h1 { font-size: clamp(2.3rem, 7vw, 4.2rem); line-height: 1.03; }
  .hero .accent { color: var(--cyan); }
  .hero p.lead {
    max-width: 46ch;
    margin: 1.4rem auto 0;
    font-size: clamp(1.05rem, 2.2vw, 1.22rem);
  }
  .hero .tagline {
    margin: 2.2rem auto 0;
    max-width: 34ch;
    font-size: clamp(1.15rem, 2.8vw, 1.5rem);
    font-weight: 600;
    line-height: 1.4;
    color: var(--text);
  }
  .hero .tagline .accent { color: var(--lime); }
  .hero .scroll-cue {
    margin-top: 2.4rem;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--faint);
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
  }
  .hero .scroll-cue svg { animation: cf-bob 1.8s ease-in-out infinite; }

  .section-head { margin-bottom: clamp(1.8rem, 4vw, 2.6rem); text-align: center; }
  .section-head .accent { color: var(--cyan); }

  .panel { border: 1px solid var(--line); background: var(--panel-fill); border-radius: 18px; }

  /* --- 01 Situaciones reales --- */
  .s-grid { display: grid; gap: clamp(1.4rem, 4vw, 2.4rem); align-items: center; justify-items: center; }
  @media (min-width: 720px) { .s-grid { grid-template-columns: 1fr 1fr; } }

  .clip-media {
    position: relative;
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
    aspect-ratio: 742 / 654;
    border: 1px solid var(--line);
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(150deg, #0a1a2b, #05070c);
  }
  .clip-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

  .branch-intro { margin: 0 0 1rem; text-align: center; font-size: 0.82rem; color: var(--faint); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; }
  .branches { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 100%; max-width: 26rem; margin: 0 auto; }
  .branches .branch { width: 100%; }
  .branch {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    border: 1px solid var(--line);
    border-left: 3px solid var(--c);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    padding: 0.8rem 1rem;
  }
  .branch .block { font-weight: 600; font-size: 0.95rem; }
  .branch .arrow { color: var(--c); flex-shrink: 0; }
  .branch .concept {
    font-size: 0.9rem; font-weight: 500;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 12%, transparent);
    padding: 3px 10px; border-radius: 999px;
    white-space: nowrap;
  }
  .caption { max-width: 56ch; margin: 1.6rem auto 0; text-align: center; color: var(--muted); font-size: 1.02rem; line-height: 1.6; }

  /* --- 02 Bloques: texto + captura lado a lado --- */
  .bloques-grid { display: grid; gap: clamp(1.8rem, 4vw, 3rem); align-items: center; justify-items: center; }
  @media (min-width: 860px) {
    .bloques-grid { grid-template-columns: 1.15fr 0.85fr; }
    .bloques-grid .shot-panel { margin: 0; justify-self: center; }
    .bloques-grid .shot-panel img { max-width: 280px; }
  }

  /* --- 02 Bloques / 03 Conceptos: chip grid --- */
  .chip-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.7rem; margin: 1.6rem 0; }
  .chip {
    display: inline-flex; align-items: center; gap: 0.5rem;
    border: 1px solid var(--line);
    background: var(--panel-fill);
    border-radius: 11px;
    padding: 0.7rem 1.1rem;
    font-size: 0.92rem; font-weight: 500;
  }
  .chip-tag {
    font-size: 0.88rem; font-weight: 600; color: var(--cyan);
    background: rgba(40, 240, 224, 0.1);
    border: 1px solid rgba(40, 240, 224, 0.25);
    padding: 0.45rem 0.9rem; border-radius: 999px;
  }
  .shot-panel { width: fit-content; max-width: 100%; margin: 2rem auto 0; padding: clamp(0.6rem, 2vw, 0.9rem); }
  .shot-panel img { display: block; width: auto; max-width: 100%; height: auto; max-height: 640px; border-radius: 11px; margin: 0 auto; }

  /* --- 03 Conceptos: cadena de ejemplo --- */
  /* Una sola frase encadenada con flechas, no una lista con viñetas: así se lee como una
     secuencia de causa-efecto de un vistazo. */
  .chain {
    display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
    gap: 0.6rem 0.6rem;
    max-width: 68rem; margin: 1.8rem auto;
  }
  .chain-item {
    font-size: 0.98rem; font-weight: 600; color: var(--text);
    white-space: nowrap;
    background: var(--panel-fill);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.55rem 0.9rem;
  }
  .chain-arrow { color: var(--cyan); font-size: 1.2rem; flex-shrink: 0; }
  .chain-tags { display: flex; justify-content: center; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.3rem; }
  .chain-tags .tagline-item { font-size: 0.85rem; color: var(--faint); }
  .chain-tags .tagline-item b { color: var(--muted); font-weight: 600; }

  .bigline {
    margin: clamp(1.8rem, 4vw, 2.4rem) auto 0;
    max-width: 30ch;
    text-align: center;
    font-size: clamp(1.2rem, 3vw, 1.7rem);
    font-weight: 700;
    line-height: 1.25;
    text-wrap: balance;
  }
  .bigline .accent { color: var(--cyan); }
  .bigline .accent-lime { color: var(--lime); }

  /* --- 04 Método: el camino (Ver → Reconocer → Jugar → Repetir) --- */
  .method-path { display: flex; flex-direction: column; align-items: center; margin-top: 0.6rem; }
  .path-step { padding: 1.1rem 0; text-align: center; }
  .path-word {
    margin: 0;
    font-size: clamp(1.35rem, 3.4vw, 1.9rem);
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .path-step.is-last .path-word { color: var(--cyan); }
  .path-desc { margin: 0.35rem auto 0; font-size: 1rem; color: var(--muted); max-width: 30ch; }
  .path-connector {
    display: flex; align-items: center; gap: 0.7rem;
    color: var(--faint);
  }
  .path-connector .ln { width: 2px; height: 1.6rem; background: linear-gradient(to bottom, rgba(40,240,224,0.4), rgba(255,255,255,0.08)); }

  @media (min-width: 860px) {
    .method-path { flex-direction: row; align-items: flex-start; gap: 0; }
    .path-step { flex: 1; padding: 0; }
    .path-connector { flex: 0 0 auto; flex-direction: column; align-items: center; padding: 0.5rem 1.4rem 0; }
    .path-connector .ln { width: 2.4rem; height: 2px; background: linear-gradient(to right, rgba(40,240,224,0.4), rgba(255,255,255,0.08)); }
  }

  .method-shot { margin-top: 2.2rem; }
  .method-shot img { display: block; width: 100%; height: auto; border-radius: 14px; }
  .method-shot-caption { text-align: center; font-size: 0.82rem; color: var(--faint); margin-top: 0.9rem; }

  /* --- 05/06: paneles anchos de captura --- */
  .wide-shot { margin-top: 2.2rem; }
  .wide-shot .panel { padding: clamp(0.5rem, 1.6vw, 0.8rem); }
  .wide-shot img { display: block; width: 100%; height: auto; border-radius: 10px; }

  .stat-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin: 1.6rem 0; }
  .stat-row .chip { color: var(--muted); }
  .stat-row .chip::before { content: "—"; color: var(--faint); margin-right: 0.1rem; }

  /* --- 07 checklist --- */
  .checklist { max-width: 36rem; margin: 0 auto; padding: clamp(1.4rem, 4vw, 2rem); }
  .checklist ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.15rem; }
  .checklist li { display: flex; gap: 0.9rem; }
  .checklist .box {
    width: 24px; height: 24px; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.25); border-radius: 7px;
    display: grid; place-items: center;
    font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.35);
    font-family: ui-monospace, monospace;
    margin-top: 1px;
  }
  .checklist .item-t { font-size: 0.98rem; font-weight: 600; color: var(--text); }
  .checklist .item-s { font-size: 0.86rem; color: var(--faint); margin-top: 2px; }

  .mantra { margin-top: clamp(2rem, 5vw, 2.8rem); text-align: center; font-size: clamp(1.25rem, 3.4vw, 2rem); font-weight: 700; }
  .mantra .sep { color: rgba(255, 255, 255, 0.25); margin: 0 0.15em; }
  .mantra .last { color: var(--cyan); }
  .mantra-pre { text-align: center; color: var(--muted); font-size: 1rem; margin-bottom: 0.6rem; }

  .cta-final { text-align: center; margin-top: 2.2rem; }
  .cta-final a {
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: var(--cyan); color: #05070c;
    font-weight: 700; font-size: 0.95rem;
    padding: 0.8rem 1.6rem; border-radius: 11px;
    text-decoration: none;
  }

  footer { padding: 2.5rem 0 3.5rem; text-align: center; color: var(--faint); font-size: 0.8rem; }

  /* Reveal al hacer scroll */
  .reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .reveal.in { opacity: 1; transform: none; }

  :focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
}

@keyframes cf-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

@media (prefers-reduced-motion: reduce) {
  #cf .reveal { opacity: 1; transform: none; transition: none; }
  #cf .hero .scroll-cue svg { animation: none; }
}
`

const ComoFunciona = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  // El "Desliza" de la portada era solo un indicador visual sin acción — ahora sí lleva a
  // la siguiente sección (§reporte de beta).
  const scrollToNextSection = () => {
    const next = heroRef.current?.nextElementSibling
    if (!next) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    next.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  // Reveal por scroll. Respeta prefers-reduced-motion.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"))
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in")
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div id="cf" ref={rootRef}>
      <style>{css}</style>

      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </symbol>
      </svg>

      <main>
        {/* Hero */}
        <section className="hero" ref={heroRef}>
          <div className="wrap">
            <h1>
              Cómo usar <span className="accent">Padel Film Room</span>
            </h1>
            <p className="lead">
              Te ayuda a entender mejor lo que ocurre durante un partido y a aprender de las decisiones que toman los jugadores profesionales en
              situaciones reales. Porque jugar mejor no depende solo de cómo ejecutas un golpe — también importa qué haces, cuándo lo haces y por
              qué.
            </p>
            <p className="tagline">
              No se trata de ver más pádel.
              <br />
              Se trata de <span className="accent">aprender a leerlo</span>.
            </p>
            <button type="button" className="scroll-cue" onClick={scrollToNextSection}>
              Desliza
              <svg width="18" height="18">
                <use href="#i-down" />
              </svg>
            </button>
          </div>
        </section>

        {/* 01 · Situaciones reales */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">01 · Situaciones reales</p>
              <h2>Aprende de las decisiones que ocurren en pista</h2>
              <p className="lead">
                En Padel Film Room analizamos partidos y seleccionamos situaciones que merece la pena entender. Cada clip parte de una situación
                real y te ayuda a ver qué está pasando, qué decisiones se están tomando y por qué pueden marcar la diferencia en el punto.
              </p>
            </div>
            <div className="s-grid reveal">
              <div className="clip-media">
                <img src="/metodo/situacion-reset.png" alt="Clip: El globo como reset" />
              </div>
              <div>
                <p className="branch-intro">Este clip enseña, a la vez:</p>
                <div className="branches">
                  <div className="branch" style={{ "--c": "#28f0e0" } as React.CSSProperties}>
                    <span className="block">Uso del globo</span>
                    <span className="arrow">→</span>
                    <span className="concept">#Globo</span>
                  </div>
                  <div className="branch" style={{ "--c": "#5b8cff" } as React.CSSProperties}>
                    <span className="block">Gestión del ritmo del punto</span>
                    <span className="arrow">→</span>
                    <span className="concept">#BajarRitmo</span>
                  </div>
                </div>
                <p className="caption">
                  A veces el aprendizaje estará en qué golpe elegir. Otras, en cuándo avanzar, dónde colocarte, cuándo esperar, cómo jugar con tu
                  compañero o qué está haciendo el rival — porque durante un punto, todo está conectado.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 02 · Los bloques */}
        <section>
          <div className="wrap">
            <div className="bloques-grid reveal">
              <div>
                <div className="section-head">
                  <p className="eyebrow">02 · Los bloques</p>
                  <h2>Empieza por una parte del juego</h2>
                  <p className="lead">
                    El pádel está lleno de situaciones y decisiones diferentes. Para ayudarte a entenderlas, hemos organizado el juego en grandes
                    bloques.
                  </p>
                </div>
                <div className="chip-grid">
                  <span className="chip">Juego desde el fondo</span>
                  <span className="chip">Transición defensa-ataque</span>
                  <span className="chip">Juego en la red</span>
                  <span className="chip">Uso del globo</span>
                  <span className="chip">Gestión del ritmo del punto</span>
                  <span className="chip">Lectura táctica del rival</span>
                  <span className="chip">Uso táctico de golpes</span>
                  <span className="chip">Juego en pareja</span>
                </div>
                <p className="caption" style={{ marginTop: "0.4rem" }}>
                  No necesitas saber exactamente qué buscar. Empieza por una parte del juego que te interese y observa qué decisiones aparecen una
                  y otra vez.
                </p>
              </div>
              <div className="shot-panel panel">
                <img src="/metodo/bloques.png" alt="Explorar: bloques con sus clips" />
              </div>
            </div>
          </div>
        </section>

        {/* 03 · Los conceptos */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">03 · Los conceptos</p>
              <h2>Pon nombre a lo que empiezas a reconocer</h2>
              <p className="lead">Detrás de situaciones diferentes hay ideas que se repiten. Las llamamos conceptos.</p>
            </div>
            <div className="chip-grid reveal">
              <span className="chip-tag">#Timing</span>
              <span className="chip-tag">#Decisiones</span>
              <span className="chip-tag">#Lectura</span>
              <span className="chip-tag">#Presión</span>
              <span className="chip-tag">#Sincronía</span>
              <span className="chip-tag" style={{ opacity: 0.5 }}>
                …
              </span>
            </div>
            <p className="lead reveal">
              Nos ayudan a conectar situaciones que, aunque a simple vista puedan parecer distintas, comparten una misma idea detrás de la
              decisión. Y una misma situación puede contener varias. Por ejemplo:
            </p>
            <div className="chain reveal">
              <span className="chain-item">Te están presionando mucho en defensa</span>
              <span className="chain-arrow">→</span>
              <span className="chain-item">estás incómodo</span>
              <span className="chain-arrow">→</span>
              <span className="chain-item">globo alto para quitarte la presión</span>
            </div>
            <div className="chain-tags reveal">
              <span className="tagline-item">
                <b>Uso del globo</b> · #Globo
              </span>
              <span className="tagline-item">
                <b>Gestión del ritmo del punto</b> · #BajarRitmo
              </span>
            </div>
            <p className="caption reveal">
              No tienes que aprenderte una lista de conceptos. Son una forma de ayudarte a reconocer qué hay detrás de las decisiones que ves en
              pista.
            </p>
          </div>
        </section>

        {/* 04 · El método */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">04 · El método</p>
              <h2>Repetimos el aprendizaje. No el vídeo.</h2>
              <p className="lead">
                Ver una decisión en una situación concreta te ayuda a entenderla. Pero el pádel nunca te devuelve exactamente el mismo punto:
                cambian la bola, la posición, los jugadores, el marcador, el rival… La idea, sin embargo, puede ser la misma. Por eso no repetimos
                una y otra vez el mismo ejemplo — buscamos la misma idea en situaciones, puntos, jugadores y partidos diferentes.
              </p>
            </div>
            <div className="method-path reveal">
              <div className="path-step">
                <p className="path-word">Ver</p>
                <p className="path-desc">Observa situaciones reales y entiende las decisiones que hay detrás.</p>
              </div>
              <div className="path-connector">
                <span className="ln" />
              </div>
              <div className="path-step">
                <p className="path-word">Reconocer</p>
                <p className="path-desc">Encuentra esas mismas ideas en situaciones diferentes.</p>
              </div>
              <div className="path-connector">
                <span className="ln" />
              </div>
              <div className="path-step">
                <p className="path-word">Jugar</p>
                <p className="path-desc">Empieza a detectarlas cuando aparecen durante tus propios partidos.</p>
              </div>
              <div className="path-connector">
                <span className="ln" />
              </div>
              <div className="path-step is-last">
                <p className="path-word">Repetir</p>
                <p className="path-desc">Vuelve, descubre nuevos ejemplos y sigue ampliando tu forma de leer el juego.</p>
              </div>
            </div>
            <div className="method-shot reveal">
              <img src="/metodo/reconocer.png" alt="Aprender a reconocer: una misma idea en tres situaciones distintas" />
              <p className="method-shot-caption">Así se ve "reconocer" dentro de la app: el mismo concepto, en situaciones distintas.</p>
            </div>
            <p className="bigline reveal">
              El objetivo no es darte una respuesta para cada punto. Es darte <span className="accent">más herramientas</span> para entender el
              punto que tienes delante.
            </p>
          </div>
        </section>

        {/* 05 · Los análisis */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">05 · Los análisis</p>
              <h2>Cuando quieras ir más allá</h2>
              <p className="lead">
                Además de clips cortos, en Padel Film Room encontrarás análisis completos de partidos. Los dividimos en capítulos para que puedas
                seguir el partido mientras entiendes las situaciones y decisiones tácticas que van apareciendo. Puedes ver el análisis completo de
                principio a fin o ir directamente a los momentos que más te interesen.
              </p>
            </div>
            <div className="wide-shot reveal">
              <div className="panel">
                <img src="/metodo/analisis.png" alt="Análisis completo dividido en capítulos" />
              </div>
            </div>
            <p className="bigline reveal">
              <span className="accent">Clips</span> para reconocer situaciones. <span className="accent-lime">Análisis</span> para entender cómo se
              conectan dentro de un partido.
            </p>
          </div>
        </section>

        {/* 06 · Mi Juego */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">06 · Mi Juego</p>
              <h2>Mira hacia dónde estás llevando tu aprendizaje</h2>
              <p className="lead">
                A medida que utilizas Padel Film Room, Mi Juego recoge lo que estás viendo y qué partes del juego aparecen más en tu aprendizaje.
              </p>
            </div>
            <div className="stat-row reveal">
              <span className="chip">El tiempo que has dedicado a aprender</span>
              <span className="chip">Los clips y análisis que has visto</span>
              <span className="chip">Los conceptos que más aparecen</span>
              <span className="chip">Los bloques que más estás trabajando</span>
            </div>
            <div className="wide-shot reveal">
              <div className="panel">
                <img src="/metodo/mijuego.png" alt="Mi Juego: resumen de aprendizaje" />
              </div>
            </div>
            <p className="caption reveal">
              No pretende decirte cuánto has mejorado. Te ayuda a ver dónde estás poniendo tu atención. Y puedes compartir tu progreso con tu
              propia <b style={{ color: "var(--text)" }}>Film Room Story</b>.
            </p>
          </div>
        </section>

        {/* 07 · Tu primer ciclo */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">07 · Tu primer ciclo</p>
              <h2>Ahora pruébalo tú</h2>
              <p className="lead">No necesitas entender todo Padel Film Room antes de empezar. De hecho, la mejor forma de entenderlo es usarlo.</p>
            </div>
            <div className="panel checklist reveal">
              <ul>
                <li>
                  <span className="box">1</span>
                  <span>
                    <div className="item-t">Entra en Explorar</div>
                    <div className="item-s">Mira los diferentes bloques del juego.</div>
                  </span>
                </li>
                <li>
                  <span className="box">2</span>
                  <span>
                    <div className="item-t">Escoge uno</div>
                    <div className="item-s">Empieza por una parte del juego que te interese o quieras mejorar.</div>
                  </span>
                </li>
                <li>
                  <span className="box">3</span>
                  <span>
                    <div className="item-t">Mira varias situaciones</div>
                    <div className="item-s">No te quedes solo con un ejemplo.</div>
                  </span>
                </li>
                <li>
                  <span className="box">4</span>
                  <span>
                    <div className="item-t">Fíjate en lo que se repite</div>
                    <div className="item-s">Empieza a reconocer ideas y conceptos en situaciones diferentes.</div>
                  </span>
                </li>
                <li>
                  <span className="box">5</span>
                  <span>
                    <div className="item-t">Guarda lo que te interese</div>
                    <div className="item-s">Añádelo a Mi Lista para volver cuando quieras.</div>
                  </span>
                </li>
                <li>
                  <span className="box">6</span>
                  <span>
                    <div className="item-t">Llévate una idea a pista</div>
                    <div className="item-s">No intentes recordarlo todo. Simplemente presta atención cuando aparezca una situación parecida.</div>
                  </span>
                </li>
                <li>
                  <span className="box">7</span>
                  <span>
                    <div className="item-t">Vuelve y repite</div>
                    <div className="item-s">Descubre nuevas situaciones y sigue construyendo tu lectura del juego.</div>
                  </span>
                </li>
              </ul>
            </div>

            <p className="mantra-pre reveal">No queremos que recuerdes vídeos. Queremos que reconozcas situaciones.</p>
            <p className="mantra reveal">
              Ver <span className="sep">→</span> Reconocer <span className="sep">→</span> Jugar <span className="sep">→</span>{" "}
              <span className="last">Repetir</span>
            </p>

            <div className="cta-final reveal">
              <Link to="/app/explorar">Ir a Explorar →</Link>
            </div>
            <p className="bigline reveal" style={{ marginTop: "2.8rem" }}>
              Deja de copiar golpes. <span className="accent">Empieza a copiar decisiones.</span>
            </p>
          </div>
        </section>

        <footer>Padel Film Room · Nos vemos en la pista.</footer>
      </main>
    </div>
  )
}

export default ComoFunciona
