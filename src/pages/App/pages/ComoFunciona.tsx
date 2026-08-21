import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"

/**
 * Cómo funciona — página explicativa del método de Padel Film Room.
 *
 * Portada fiel del artifact de diseño: mismo fondo, contenido y posiciones.
 * Notas de la portación a la app:
 *  - Todo el CSS va scopeado bajo `#cf` (anidamiento nativo) para no filtrarse al resto de la app.
 *  - El contenedor `#cf` es a sangre completa (full-bleed): cancela el padding del AppLayout
 *    y pinta el fondo exacto del artifact de lado a lado.
 *  - La barra superior falsa del artifact se omite: el Header real de la app ocupa ese lugar.
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
  --maxw: 960px;

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
  .lead { color: var(--muted); }

  /* --- Hero --- */
  .hero { text-align: center; padding-block: clamp(3.5rem, 10vw, 6.5rem); }
  .hero h1 { font-size: clamp(2.3rem, 7vw, 4.2rem); line-height: 1.03; }
  .hero .accent { color: var(--cyan); }
  .hero p {
    max-width: 40ch;
    margin: 1.4rem auto 0;
    font-size: clamp(1rem, 2.2vw, 1.18rem);
    color: var(--muted);
  }
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
  }
  .hero .scroll-cue svg { animation: cf-bob 1.8s ease-in-out infinite; }

  .section-head { margin-bottom: clamp(1.8rem, 4vw, 2.6rem); }
  .section-head .accent { color: var(--cyan); }

  .panel {
    border: 1px solid var(--line);
    background: var(--panel-fill);
    border-radius: 18px;
  }

  /* --- Sección 2: situación real → ramas --- */
  .s2-grid { display: grid; gap: clamp(1.4rem, 4vw, 2.4rem); }
  @media (min-width: 860px) { .s2-grid { grid-template-columns: 1fr 1fr; align-items: center; } }

  .clip-media {
    position: relative;
    aspect-ratio: 16 / 9;
    border: 1px solid var(--line);
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(150deg, #0a1a2b, #05070c);
  }
  .clip-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .clip-badge {
    position: absolute; left: 12px; top: 12px;
    background: var(--cyan); color: #05070c;
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    padding: 3px 8px; border-radius: 6px;
  }

  .branch-intro { margin: 0 0 1rem; font-size: 0.82rem; color: var(--faint); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; }
  .branches { display: flex; flex-direction: column; gap: 0.8rem; }
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
  .branch .arrow { color: var(--c); display: inline-flex; flex-shrink: 0; }
  .branch .concept {
    font-size: 0.9rem; font-weight: 500;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 12%, transparent);
    padding: 3px 10px; border-radius: 999px;
    white-space: nowrap;
  }
  .caption { margin-top: 1.6rem; text-align: center; color: var(--muted); font-size: 0.95rem; }

  /* --- Placeholder de imagen (para reemplazar por foto/gráfico real) --- */
  .img-placeholder {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
    border: 1px dashed rgba(255,255,255,0.18); border-radius: 14px;
    background: repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 12px, transparent 12px 24px);
  }
  .img-placeholder .ph-icon { color: var(--cyan); opacity: 0.85; }
  .img-placeholder .ph-t { font-weight: 600; font-size: 1rem; color: var(--muted); }
  .img-placeholder .ph-s { font-size: 0.8rem; color: var(--faint); font-family: ui-monospace, monospace; letter-spacing: 0.02em; }

  /* --- Sección 3: grafo / imagen --- */
  .graph-panel { padding: clamp(1rem, 3vw, 1.8rem); }
  .graph-panel .graph-img { width: 100%; height: auto; display: block; border-radius: 12px; }
  /* Sección 5: la comparativa flota sobre el fondo (sin marco de panel). */
  .diff-media img { width: 100%; height: auto; display: block; border-radius: 16px; }
  .bigline {
    margin: clamp(1.8rem, 4vw, 2.4rem) auto 0;
    max-width: 24ch;
    text-align: center;
    font-size: clamp(1.3rem, 3.2vw, 2rem);
    font-weight: 700;
    line-height: 1.2;
    text-wrap: balance;
  }
  .bigline .accent { color: var(--cyan); }
  .bigline .accent-lime { color: var(--lime); }

  /* --- Sección 4: recorrido / timeline --- */
  .timeline { display: flex; flex-direction: column; }
  .step { display: grid; grid-template-columns: 40px 1fr; gap: 1rem; }
  .step-rail { display: flex; flex-direction: column; align-items: center; }
  .step-num {
    width: 40px; height: 40px; flex-shrink: 0;
    display: grid; place-items: center;
    border-radius: 999px;
    border: 1px solid rgba(40, 240, 224, 0.4);
    background: rgba(40, 240, 224, 0.1);
    color: var(--cyan);
    font-weight: 700; font-size: 0.9rem;
  }
  .step-line { width: 2px; flex: 1; min-height: 14px; background: linear-gradient(to bottom, rgba(40,240,224,0.4), rgba(255,255,255,0.08)); }
  .step-card {
    display: flex; align-items: center; gap: 0.9rem;
    border: 1px solid var(--line);
    background: var(--panel-fill);
    border-radius: 14px;
    padding: 0.85rem 1.1rem;
    margin-bottom: 0.9rem;
  }
  .step-card .ico { color: var(--cyan); flex-shrink: 0; }
  .step-card .t { font-weight: 600; font-size: 0.95rem; }
  .step-card .s { font-size: 0.8rem; color: var(--faint); margin-top: 2px; }

  .cycle-note {
    display: flex; align-items: center; gap: 0.8rem;
    border: 1px solid rgba(190, 252, 75, 0.3);
    background: rgba(190, 252, 75, 0.06);
    border-radius: 14px;
    padding: 0.9rem 1.1rem;
    margin-top: 0.3rem;
    font-size: 0.9rem;
    color: rgba(241, 245, 249, 0.82);
  }
  .cycle-note .ico { color: var(--lime); flex-shrink: 0; }
  .cycle-note b { color: var(--lime); font-weight: 600; }

  .mantra {
    margin-top: clamp(2rem, 5vw, 2.8rem);
    text-align: center;
    font-size: clamp(1.25rem, 3.4vw, 2rem);
    font-weight: 700;
  }
  .mantra .sep { color: rgba(255, 255, 255, 0.25); margin: 0 0.15em; }
  .mantra .last { color: var(--cyan); }

  /* --- Sección 6: checklist --- */
  .checklist { max-width: 34rem; margin: 0 auto; padding: clamp(1.4rem, 4vw, 2rem); }
  .checklist ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
  .checklist li { display: flex; align-items: center; gap: 0.8rem; }
  .checklist .box { width: 20px; height: 20px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; }
  .checklist .n { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.3); margin-right: 0.5rem; }
  .checklist .item { font-size: 0.95rem; color: rgba(241,245,249,0.88); }

  .cta-final { text-align: center; margin-top: 2rem; }
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

  // Reveal por scroll (mismo comportamiento que el artifact). Respeta prefers-reduced-motion.
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

      {/* Iconos reutilizables */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="i-play" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </symbol>
        <symbol id="i-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </symbol>
        <symbol id="i-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-film" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="3" />
        </symbol>
        <symbol id="i-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
        </symbol>
        <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.5V12a10 10 0 1 1-5.9-9.1" />
          <path d="M22 4L12 14.5l-3-3" />
        </symbol>
        <symbol id="i-cycle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-2.6-6.4" />
          <path d="M21 3v4h-4" />
        </symbol>
      </svg>

      <main>
        {/* 1 · Hero */}
        <section className="hero">
          <div className="wrap">
            <h1>
              Cómo usar <span className="accent">Padel Film Room</span>
            </h1>
            <p>Aprende a reconocer situaciones reales de partido, entender el juego y tomar mejores decisiones cuando vuelvas a la pista.</p>
            <span className="scroll-cue">
              Desliza
              <svg width="18" height="18">
                <use href="#i-down" />
              </svg>
            </span>
          </div>
        </section>

        {/* 2 · Situación real */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">El punto de partida</p>
              <h2>Aprende a través de situaciones reales</h2>
            </div>
            <div className="s2-grid reveal">
              <div className="clip-media">
                <img src="/metodo/situacion.png" alt="Situación real de partido" />
                <span className="clip-badge">Clip</span>
              </div>
              <div>
                <p className="branch-intro">Este clip enseña, a la vez:</p>
                <div className="branches">
                  <div className="branch" style={{ "--c": "#28f0e0" } as React.CSSProperties}>
                    <span className="block">Juego en la red</span>
                    <span className="arrow">
                      <svg width="18" height="18">
                        <use href="#i-arrow" />
                      </svg>
                    </span>
                    <span className="concept">#Presión</span>
                  </div>
                  <div className="branch" style={{ "--c": "#5b8cff" } as React.CSSProperties}>
                    <span className="block">Lectura táctica del rival</span>
                    <span className="arrow">
                      <svg width="18" height="18">
                        <use href="#i-arrow" />
                      </svg>
                    </span>
                    <span className="concept">#Insistencia</span>
                  </div>
                  <div className="branch" style={{ "--c": "#befc4b" } as React.CSSProperties}>
                    <span className="block">Gestión del ritmo</span>
                    <span className="arrow">
                      <svg width="18" height="18">
                        <use href="#i-arrow" />
                      </svg>
                    </span>
                    <span className="concept">#Cambio de ritmo</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="caption reveal">Una sola situación de partido puede enseñarte varias cosas a la vez.</p>
          </div>
        </section>

        {/* 3 · Estructura / imagen */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">La estructura</p>
              <h2>Cómo organizamos el aprendizaje</h2>
            </div>
            <div className="panel graph-panel reveal">
              <img className="graph-img" src="/metodo/aprendizaje.jpg" alt="Cómo se organiza el aprendizaje en Padel Film Room" />
            </div>
            <p className="bigline reveal">
              No organizamos vídeos. <span className="accent">Organizamos aprendizajes tácticos.</span>
            </p>
          </div>
        </section>

        {/* 4 · Método / recorrido */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">El método</p>
              <h2>Cómo recomendamos aprender</h2>
            </div>
            <div className="timeline reveal">
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">1</span>
                  <span className="step-line" />
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-target" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Elige un concepto</div>
                    <div className="s">Ej. #Subir a la red</div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">2</span>
                  <span className="step-line" />
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-film" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Mira varias situaciones reales</div>
                    <div className="s">Ejemplos del mismo patrón</div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">3</span>
                  <span className="step-line" />
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-eye" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Empieza a reconocer el patrón</div>
                    <div className="s">Ves lo que se repite</div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">4</span>
                  <span className="step-line" />
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-bolt" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Ve a jugar</div>
                    <div className="s">Llévatelo a la pista</div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">5</span>
                  <span className="step-line" />
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-check" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Identifícalo durante tus partidos</div>
                    <div className="s">Lo reconoces en tiempo real</div>
                  </div>
                </div>
              </div>
              <div className="step">
                <div className="step-rail">
                  <span className="step-num">6</span>
                </div>
                <div className="step-card">
                  <span className="ico">
                    <svg width="22" height="22">
                      <use href="#i-cycle" />
                    </svg>
                  </span>
                  <div>
                    <div className="t">Vuelve a PFR a reforzarlo</div>
                    <div className="s">…o cambia de concepto</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="cycle-note reveal">
              <span className="ico">
                <svg width="20" height="20">
                  <use href="#i-cycle" />
                </svg>
              </span>
              <span>
                El aprendizaje es un <b>ciclo</b>: vuelve al principio y sigue sumando patrones. Añadimos nuevos clips y conceptos continuamente.
              </span>
            </div>
            <p className="mantra reveal">
              Ver <span className="sep">→</span> Reconocer <span className="sep">→</span> Jugar <span className="sep">→</span> <span className="last">Repetir</span>
            </p>
          </div>
        </section>

        {/* 5 · La diferencia */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">La diferencia</p>
              <h2>
                Aprende a reconocer <span className="accent">patrones</span>.<br />
                No a consumir <span className="accent">vídeos</span>.
              </h2>
            </div>
            <div className="diff-media reveal">
              <img src="/metodo/mismoconcepto.png" alt="Comparativa: contenido aislado frente a un mismo concepto en varias situaciones de partido" />
            </div>
            <p className="bigline reveal">
              No importa cuántos vídeos veas. Importa cuántas veces reconoces el <span className="accent">mismo concepto</span> jugando.
            </p>
          </div>
        </section>

        {/* 6 · Primer entrenamiento */}
        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <p className="eyebrow">Empieza ahora</p>
              <h2>Tu primer entrenamiento</h2>
            </div>
            <div className="panel checklist reveal">
              <ul>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">1</span>Entra en Explorar
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">2</span>Escoge un bloque
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">3</span>Elige un concepto
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">4</span>Mira varias situaciones relacionadas
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">5</span>Guarda las que más te ayuden en Mi Lista
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">6</span>Ve a jugar
                  </span>
                </li>
                <li>
                  <span className="box" />
                  <span className="item">
                    <span className="n">7</span>Vuelve para seguir aprendiendo
                  </span>
                </li>
              </ul>
            </div>
            <div className="cta-final reveal">
              <Link to="/app/explorar">
                Ir a Explorar
                <svg width="18" height="18">
                  <use href="#i-arrow" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        <footer>Padel Film Room · Aprende a leer el juego</footer>
      </main>
    </div>
  )
}

export default ComoFunciona
