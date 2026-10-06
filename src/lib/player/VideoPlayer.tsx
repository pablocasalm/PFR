import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Captions } from "lucide-react"
import { formatDuration } from "../format"
import { useI18n } from "../i18n/store"

/**
 * Reproductor HLS reutilizable (bloque 6). Reproduce una URL `.m3u8` con hls.js,
 * y usa HLS nativo en Safari. Controles a medida (play/seek/volumen/fullscreen) y,
 * en análisis, marcadores de capítulo clicables sobre la barra de progreso.
 *
 * El contrato del front no cambia: `src` es el `videoUrl` (manifiesto HLS de Cloudflare
 * Stream, o cualquier `.m3u8`). Cambiar de proveedor = cambiar de dónde sale la URL.
 */

export type PlayerChapter = { startSeconds: number; title: string }

/** API imperativa expuesta vía ref — permite saltar a un momento del vídeo desde fuera
 * (p. ej. al hacer clic en un capítulo listado en un panel aparte, §reporte de beta). */
export type VideoPlayerHandle = {
  /** Salto a un CAPÍTULO: cae un poco después de su inicio (ver CHAPTER_LEAD_IN_SECONDS). */
  seekTo: (seconds: number) => void
  /** Salto al segundo exacto, sin margen — para tiempos escritos a mano (p. ej. "3:45" en las
   * prioridades de un análisis de Coach), que no apuntan al inicio de un capítulo. */
  seekExact: (seconds: number) => void
}

// Safari en iPhone no soporta Fullscreen API sobre el contenedor (solo en iPad, iPadOS 16.4+):
// hay que usar el método nativo del propio <video>, que además dispara sus propios eventos
// en vez de "fullscreenchange". Mismo workaround que usa YouTube en iOS.
type IOSVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

type Props = {
  src: string
  /** URL del vídeo doblado al inglés (HeyGen), si existe. Sin ella, el selector de idioma
   * se queda en el placeholder "Próximamente". */
  srcEn?: string
  poster?: string
  chapters?: PlayerChapter[]
  /** Índice del capítulo en el que está la reproducción (-1 si va antes del primero). Solo se
   * llama cuando cambia, no en cada tick — para que la página marque el capítulo activo en su
   * lista sin re-renderizarse varias veces por segundo. */
  onChapterChange?: (index: number) => void
  /** "16:9" (horizontal, por defecto) o "9:16" (experiencia vertical móvil). */
  aspect?: "16:9" | "9:16"
  /** Punto (segundos) donde reanudar al cargar (§7.2). */
  initialPosition?: number
  /** Se llama periódicamente y al pausar/salir para guardar el progreso de visionado. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void
  /** Se dispara al terminar el vídeo (para autoplay / "siguiente", §9.7/§10.7). */
  onEnded?: () => void
  /** Contenido superpuesto al terminar (tarjeta "Siguiente en 3, 2, 1…"). Se ve también en
   * fullscreen. Recibe `dismiss` para poder cerrar la tarjeta y quedarse en el vídeo actual
   * (p. ej. al cancelar el autoplay) sin tener que ir al siguiente ni salir de la página. */
  /** Tarjeta de fin de vídeo. `dismiss` solo la cierra; `replay` vuelve a reproducir desde el principio. */
  endSlot?: (dismiss: () => void, replay: () => void) => React.ReactNode
  /** Preferencia de cuenta (Mi Cuenta): si hay subtítulos disponibles, se activa la primera
   * pista sola en cuanto se conocen, sin esperar a que el usuario abra el menú. */
  subtitlesDefaultOn?: boolean
}

/**
 * Margen que se suma al saltar a un capítulo. Los análisis vienen montados con una transición
 * de barrido entre clip y clip (el fotograma anterior sale deslizándose hacia un lado), grabada
 * en el propio vídeo entre 0,3 y 0,9 s DESPUÉS del inicio de cada capítulo — medido fotograma a
 * fotograma en un análisis real. Saltando al inicio exacto se veía siempre ese barrido; con
 * este margen se cae ya en el clip nuevo. El capítulo que empieza en 0:00 no lleva margen.
 */
const CHAPTER_LEAD_IN_SECONDS = 1.2

/** Espera antes de enseñar el círculo de carga: un salto dentro de lo ya descargado tarda menos y no debe hacerlo parpadear. */
const BUFFERING_DELAY_MS = 180

/** Tiempo sin mover el ratón ni tocar la pantalla tras el que se ocultan los controles mientras se reproduce. */
const CONTROLS_HIDE_MS = 3000

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ src, srcEn, poster, chapters = [], onChapterChange, aspect = "16:9", initialPosition, onProgress, onEnded, endSlot, subtitlesDefaultOn = false }, ref) => {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const subtitlesDefaultOnRef = useRef(subtitlesDefaultOn)
  subtitlesDefaultOnRef.current = subtitlesDefaultOn
  const currentRef = useRef(0)
  const durationRef = useRef(0)
  const lastReportRef = useRef(0)
  const resumedRef = useRef(false)
  const scrubbingRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const chaptersRef = useRef(chapters)
  chaptersRef.current = chapters
  const onChapterChangeRef = useRef(onChapterChange)
  onChapterChangeRef.current = onChapterChange
  const activeChapterRef = useRef<number | null>(null)

  /** Capítulo que contiene `time`: el último cuyo inicio ya se ha alcanzado. Avisa solo si cambia. */
  const reportChapter = (time: number) => {
    let index = -1
    chaptersRef.current.forEach((ch, i) => {
      if (ch.startSeconds <= time + 0.25 && (index < 0 || ch.startSeconds >= chaptersRef.current[index].startSeconds)) index = i
    })
    if (index === activeChapterRef.current) return
    activeChapterRef.current = index
    onChapterChangeRef.current?.(index)
  }
  // Al cambiar de idioma (§HeyGen), se guarda aquí el punto/estado de reproducción justo antes
  // de recargar la fuente, para restaurarlo cuando el nuevo manifiesto esté listo — si no, cambiar
  // de idioma volvería siempre al minuto 0.
  const switchStateRef = useRef<{ time: number; wasPlaying: boolean } | null>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([])
  const [qualityLevel, setQualityLevel] = useState(-1) // -1 = auto (ABR)
  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  // `busy`: el vídeo está buscando un punto nuevo o esperando datos (salto a capítulo, arrastre
  // de la barra, red lenta). `buffering` es lo mismo con un pequeño retardo, y es lo que pinta
  // el círculo de carga sobre el vídeo mientras se reproduce — sin el retardo, cada salto que
  // se resuelve al instante haría parpadear el círculo.
  // Controles: visibles con el vídeo en pausa y, mientras se reproduce, solo unos segundos
  // después del último movimiento o toque (como YouTube/Netflix). Antes dependían del hover de
  // CSS, que en táctil se queda "pegado" tras un toque y dejaba la barra tapando el vídeo
  // indefinidamente (§reporte de beta).
  const [controlsActive, setControlsActive] = useState(false)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // ¿Estaban ya a la vista los controles cuando empezó el toque en curso? (ver onClick del vídeo)
  const controlsShownAtDownRef = useRef(true)
  // Táctil o ratón: cambia qué hace tocar el vídeo (ver onClick) y si hay botón central de pausa.
  // Se decide con el último puntero usado, no con el tipo de dispositivo — hay portátiles táctiles.
  const [touchMode, setTouchMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [lang, setLang] = useState<"es" | "en">("es")
  const [subtitleTracks, setSubtitleTracks] = useState<{ index: number; label: string }[]>([])
  const [subtitleTrack, setSubtitleTrack] = useState(-1) // -1 = desactivados
  const subtitleTrackRef = useRef(-1)
  subtitleTrackRef.current = subtitleTrack
  // Líneas del subtítulo que toca ahora. Los subtítulos los pinta la app (ver más abajo), no el
  // navegador: así se pueden subir por encima de la barra de controles cuando está visible y
  // darles un tamaño legible en móvil — pintados por el navegador quedaban pegados al borde
  // inferior, medio tapados por la barra y cortados en el reproductor pequeño (§reporte de beta).
  const [cueLines, setCueLines] = useState<string[]>([])
  // Un único menú abierto a la vez (subtítulos y ajustes son excluyentes). La posición se calcula
  // en JS y se aplica con `position: fixed` en vez de `absolute` anclado al contenedor: así el
  // menú no se recorta contra el `overflow-hidden` del player cuando es más alto de lo normal
  // (p. ej. Idioma + varias resoluciones de Calidad juntos).
  const [openMenu, setOpenMenu] = useState<"subtitles" | "settings" | null>(null)
  const [menuPos, setMenuPos] = useState<{ bottom: number; right: number } | null>(null)
  const subtitlesBtnRef = useRef<HTMLButtonElement>(null)
  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // El menú se coloca por encima del botón que lo abre — en un player pegado a la parte de
  // arriba de la pantalla (móvil, poca altura) puede llegar a sobresalir por encima del propio
  // viewport. Tras montarse, si se sale, se baja lo justo para que quede entero visible.
  useLayoutEffect(() => {
    if (!openMenu || !menuRef.current) return
    const margin = 8
    const rect = menuRef.current.getBoundingClientRect()
    if (rect.top < margin) {
      const overflow = margin - rect.top
      setMenuPos((pos) => (pos ? { ...pos, bottom: Math.max(margin, pos.bottom - overflow) } : pos))
    }
  }, [openMenu])

  const toggleMenu = (menu: "subtitles" | "settings", btnRef: React.RefObject<HTMLButtonElement | null>) => {
    setOpenMenu((current) => {
      if (current === menu) return null
      const rect = btnRef.current?.getBoundingClientRect()
      if (rect) setMenuPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right })
      return menu
    })
  }

  // Si la página hace scroll o cambia de tamaño con el menú abierto, mejor cerrarlo a dejarlo
  // flotando en una posición ya incorrecta (la posición se calculó una vez, al abrirlo).
  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [openMenu])

  useEffect(() => {
    if (!busy) {
      setBuffering(false)
      return
    }
    const timer = setTimeout(() => setBuffering(true), BUFFERING_DELAY_MS)
    return () => clearTimeout(timer)
  }, [busy])

  const pokeControls = () => {
    setControlsActive(true)
    clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setControlsActive(false), CONTROLS_HIDE_MS)
  }
  useEffect(() => () => clearTimeout(controlsTimerRef.current), [])
  const controlsVisible = !playing || controlsActive || openMenu !== null

  const activeSrc = lang === "en" && srcEn ? srcEn : src

  // Cambia de idioma preservando el punto de reproducción y si estaba sonando — es un cambio de
  // fuente completo (el vídeo EN es un uid de Cloudflare distinto, no una pista alternativa
  // dentro del mismo manifiesto), así que hay que recargar y luego restaurar el estado.
  const switchLanguage = (next: "es" | "en") => {
    if (next === lang) return
    switchStateRef.current = { time: currentRef.current, wasPlaying: playing }
    setLang(next)
    setOpenMenu(null)
  }

  // Cargar la fuente HLS (hls.js o nativo).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeSrc) return

    setSubtitleTracks([])
    setSubtitleTrack(-1)

    const restoreAfterSwitch = () => {
      const pending = switchStateRef.current
      if (!pending) return
      switchStateRef.current = null
      video.currentTime = pending.time
      if (pending.wasPlaying) video.play().catch(() => {})
    }

    // hls.js primero (Chrome/Firefox y Safari con MSE): habilita el selector de calidad y una
    // reproducción mejor. Chrome devuelve "maybe" en canPlayType HLS pero NO lo reproduce bien
    // de forma nativa, así que la ruta nativa se reserva para cuando hls.js NO está soportado.
    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(activeSrc)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels
            .map((l, i) => ({ height: l.height, index: i }))
            .sort((a, b) => b.height - a.height),
        )
        restoreAfterSwitch()
      })
      // hls.js puebla `subtitleTracks` de forma asíncrona (parsea las playlists de subtítulos
      // aparte del manifiesto principal) — llega en este evento, no en MANIFEST_PARSED, si no
      // el array todavía está vacío y el selector de subtítulos nunca aparece.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        const tracks = hls.subtitleTracks.map((track, i) => ({
          index: i,
          label: track.name || t("video-player.subtitle-track", "Subtítulos {n}", { n: i + 1 }),
        }))
        setSubtitleTracks(tracks)
        // Preferencia de cuenta (Mi Cuenta): si hay pistas y el usuario quiere subtítulos por
        // defecto, se activa la primera sola — cada vez que carga una fuente nueva (también al
        // cambiar de audio ES/EN), igual que se resetea subtitleTrack a -1 arriba.
        if (subtitlesDefaultOnRef.current && tracks.length > 0) selectSubtitle(tracks[0].index)
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeSrc
      video.addEventListener("loadedmetadata", restoreAfterSwitch, { once: true })
    }
  }, [activeSrc])

  // Subtítulos pintados por la app: la pista elegida va en modo "hidden" (el navegador carga
  // sus cues y avisa con "cuechange", pero no las dibuja) y aquí se leen las cues activas.
  // Sirve igual para hls.js (que crea las pistas en el <video>) que para HLS nativo de Safari.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const tracks = video.textTracks
    const isSubtitle = (tr: TextTrack) => tr.kind === "subtitles" || tr.kind === "captions"

    const syncCues = () => {
      const lines: string[] = []
      for (const tr of Array.from(tracks)) {
        if (!isSubtitle(tr) || tr.mode === "disabled") continue
        for (const cue of Array.from(tr.activeCues ?? [])) {
          lines.push(...(cue as VTTCue).text.replace(/<[^>]+>/g, "").split("\n").map((l) => l.trim()).filter(Boolean))
        }
      }
      setCueLines((prev) => (prev.join("\n") === lines.join("\n") ? prev : lines))
    }

    const watchTracks = () => {
      for (const tr of Array.from(tracks)) {
        tr.removeEventListener("cuechange", syncCues)
        tr.addEventListener("cuechange", syncCues)
      }
      // HLS nativo (Safari sin hls.js): nadie más avisa de qué pistas hay — se sacan de aquí.
      if (!hlsRef.current) {
        const found = Array.from(tracks)
          .map((tr, index) => ({ tr, index }))
          .filter(({ tr }) => isSubtitle(tr))
          .map(({ tr, index }, n) => ({ index, label: tr.label || t("video-player.subtitle-track", "Subtítulos {n}", { n: n + 1 }) }))
        setSubtitleTracks(found)
        for (const { index } of found) if (tracks[index].mode === "showing") tracks[index].mode = "disabled"
        if (subtitlesDefaultOnRef.current && found.length > 0 && subtitleTrackRef.current === -1) selectSubtitle(found[0].index)
      }
      syncCues()
    }

    tracks.addEventListener("addtrack", watchTracks)
    tracks.addEventListener("change", syncCues)
    watchTracks()
    return () => {
      tracks.removeEventListener("addtrack", watchTracks)
      tracks.removeEventListener("change", syncCues)
      for (const tr of Array.from(tracks)) tr.removeEventListener("cuechange", syncCues)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc])

  // Sincronizar el estado de pantalla completa con el evento del navegador.
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  // Safari en iPhone no dispara "fullscreenchange" para el modo nativo del <video>: escucha
  // sus propios eventos webkit para que el icono de pantalla completa refleje el estado real.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // En la pantalla completa nativa de iPhone no se ve nada pintado por la app, así que ahí
    // los subtítulos se le dejan al propio reproductor de iOS (pista en "showing") y, al salir,
    // se vuelven a pintar aquí ("hidden").
    const setNativeSubtitles = (native: boolean) => {
      const index = subtitleTrackRef.current
      if (index === -1) return
      if (hlsRef.current) hlsRef.current.subtitleDisplay = native
      else if (video.textTracks[index]) video.textTracks[index].mode = native ? "showing" : "hidden"
    }
    const onBegin = () => {
      setFullscreen(true)
      setNativeSubtitles(true)
    }
    const onEnd = () => {
      setFullscreen(false)
      setNativeSubtitles(false)
    }
    video.addEventListener("webkitbeginfullscreen", onBegin)
    video.addEventListener("webkitendfullscreen", onEnd)
    return () => {
      video.removeEventListener("webkitbeginfullscreen", onBegin)
      video.removeEventListener("webkitendfullscreen", onEnd)
    }
  }, [])

  // Reporta el progreso de visionado (guardado en el historial).
  const report = () => {
    const cb = onProgressRef.current
    if (cb && durationRef.current > 0 && currentRef.current > 0) {
      cb(Math.floor(currentRef.current), Math.floor(durationRef.current))
    }
  }

  // Guardar progreso al desmontar (salir del vídeo).
  useEffect(() => {
    return () => {
      const cb = onProgressRef.current
      if (cb && durationRef.current > 0 && currentRef.current > 0) {
        cb(Math.floor(currentRef.current), Math.floor(durationRef.current))
      }
    }
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      // Mientras el vídeo buferiza, "play" no se nota (el botón no cambia) y la gente vuelve
      // a pulsar varias veces (§reporte de beta) — se marca "cargando" hasta que arranca de
      // verdad (o falla), y el botón se desactiva mientras tanto para no acumular clics.
      setLoading(true)
      v.play().catch(() => setLoading(false))
    } else v.pause()
  }

  const seekTo = (seconds: number) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(seconds, duration || seconds))
  }

  // Salto pedido desde fuera del player (lista de capítulos de la página): además de mover el
  // punto de reproducción, arranca el vídeo y lo trae a la vista — si no, con el vídeo aún sin
  // empezar (póster) o con la lista de capítulos por debajo del player en móvil, el clic no
  // tenía ningún efecto visible. Si los metadatos todavía no han cargado, el salto se aplica en
  // onLoadedMetadata (con prioridad sobre la reanudación de "Continúa viendo").
  // Sin animaciones: el capítulo se marca al instante (sin esperar al primer timeupdate) y el
  // scroll hasta el player es inmediato y solo si no está ya a la vista. Mientras el vídeo
  // llega al punto nuevo se ve el círculo de carga (`busy`, vía onSeeking/onWaiting).
  const jumpTo = (chapterStart: number, exact = false) => {
    const v = videoRef.current
    if (!v) return
    const seconds = exact ? Math.max(0, chapterStart) : chapterStart > 0 ? chapterStart + CHAPTER_LEAD_IN_SECONDS : 0
    if (v.readyState >= 1) seekTo(seconds)
    else pendingSeekRef.current = seconds
    reportChapter(seconds)
    setEnded(false)
    if (v.paused) v.play().catch(() => {})
    // Scroll SOLO vertical y sin animación ("instant" anula el `scroll-behavior: smooth` global
    // de index.css). scrollIntoView también alinea en horizontal, y con el smooth global eso se
    // veía como el fotograma deslizándose hacia un lado al pulsar un capítulo.
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
      window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 16), behavior: "instant" })
    }
  }

  useImperativeHandle(ref, () => ({ seekTo: (seconds) => jumpTo(seconds), seekExact: (seconds) => jumpTo(seconds, true) }))

  // Pointer Events (no onClick/onDrag): unifica ratón y táctil, y permite arrastrar continuo
  // para avanzar/retroceder, no solo un tap puntual (§reporte de beta — en móvil no se podía
  // "arrastrar el cursor" para buscar, solo tocar servía como único punto, si es que llegaba
  // a registrarse el toque en vez de interpretarse como scroll de la página).
  const scrubToClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seekTo(ratio * duration)
  }
  const onScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubbingRef.current = true
    scrubToClientX(e.clientX, e.currentTarget.getBoundingClientRect())
  }
  const onScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    scrubToClientX(e.clientX, e.currentTarget.getBoundingClientRect())
  }
  const onScrubEnd = () => {
    scrubbingRef.current = false
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (v) v.muted = !v.muted
  }

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const value = Number(e.target.value)
    v.volume = value
    v.muted = value === 0
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    const video = videoRef.current as IOSVideoElement | null

    if (video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.()
      return
    }
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.())
    } else {
      video?.webkitEnterFullscreen?.()
    }
  }

  const selectQuality = (index: number) => {
    const hls = hlsRef.current
    if (hls) hls.currentLevel = index // -1 = auto (ABR)
    setQualityLevel(index)
    setOpenMenu(null)
  }

  const selectSubtitle = (index: number) => {
    const hls = hlsRef.current
    if (hls) {
      hls.subtitleTrack = index
      hls.subtitleDisplay = false // pista en "hidden": las cues las pinta la app (ver cueLines)
    } else {
      // HLS nativo: mismo criterio, a mano sobre las pistas del <video>.
      const tracks = videoRef.current?.textTracks
      if (tracks) for (let i = 0; i < tracks.length; i++) if (tracks[i].kind === "subtitles" || tracks[i].kind === "captions") tracks[i].mode = i === index ? "hidden" : "disabled"
    }
    if (index === -1) setCueLines([])
    setSubtitleTrack(index)
    setOpenMenu(null)
  }

  // Con una sola pista (el caso normal: un idioma de subtítulos por vídeo) el botón dedicado
  // alterna directamente on/off, sin abrir un menú — solo con varias pistas hace falta elegir.
  // Sin pistas, el botón se ve pero no hace nada (queda en gris, ver abajo).
  const toggleSubtitles = () => {
    if (subtitleTracks.length === 0) return
    if (subtitleTracks.length > 1) {
      toggleMenu("subtitles", subtitlesBtnRef)
      return
    }
    selectSubtitle(subtitleTrack === -1 ? subtitleTracks[0].index : -1)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const aspectCls = aspect === "9:16" ? "aspect-[9/16]" : "aspect-video"

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black ${aspectCls}`}
      onPointerMove={pokeControls}
      onPointerDownCapture={(e) => {
        controlsShownAtDownRef.current = controlsVisible
        setTouchMode(e.pointerType !== "mouse")
        pokeControls()
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setControlsActive(false)
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full bg-black object-contain"
        // Con ratón, clic = reproducir/pausar. En táctil, como en YouTube/Netflix, tocar el vídeo
        // nunca pausa: muestra los controles si estaban ocultos y los esconde si estaban a la
        // vista; se pausa con el botón central (más abajo). El vídeo en pausa lleva encima el
        // botón de reproducir a pantalla completa, así que este clic solo llega reproduciendo.
        onClick={() => {
          if (!touchMode) togglePlay()
          else if (controlsShownAtDownRef.current) setControlsActive(false)
        }}
        onPlay={() => {
          setPlaying(true)
          setEnded(false)
          setLoading(false)
        }}
        onPlaying={() => {
          setLoading(false)
          setBusy(false)
        }}
        onWaiting={() => {
          setLoading(true)
          setBusy(true)
        }}
        onSeeking={() => setBusy(true)}
        // Tras un salto: si ya hay datos para seguir, se acabó la espera; si no, el navegador
        // lanza "waiting" y el círculo sigue hasta "canplay"/"playing".
        onSeeked={(e) => {
          if (e.currentTarget.readyState >= 3) setBusy(false)
        }}
        onCanPlay={() => setBusy(false)}
        onPause={() => {
          setPlaying(false)
          setLoading(false)
          report()
        }}
        onEnded={() => {
          setPlaying(false)
          report()
          setEnded(true)
          onEnded?.()
          // En iPhone, ver "en horizontal" suele significar el modo nativo de pantalla completa
          // (webkitEnterFullscreen) — la tarjeta "Siguiente" vive fuera de ese elemento nativo y
          // no se ve ahí, así que el countdown avanzaba de vídeo sin que nadie se enterara (§
          // reporte de beta). Al terminar, se sale de ese modo para que la tarjeta sea visible.
          const video = videoRef.current as IOSVideoElement | null
          if (video?.webkitDisplayingFullscreen) video.webkitExitFullscreen?.()
        }}
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime
          setCurrent(time)
          currentRef.current = time
          reportChapter(time)
          if (onProgress && time - lastReportRef.current >= 10) {
            lastReportRef.current = time
            report()
          }
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuration(d)
          durationRef.current = d
          if (pendingSeekRef.current !== null) {
            resumedRef.current = true
            e.currentTarget.currentTime = Math.max(0, Math.min(pendingSeekRef.current, d || pendingSeekRef.current))
            pendingSeekRef.current = null
          } else if (initialPosition && initialPosition > 0 && !resumedRef.current) {
            resumedRef.current = true
            e.currentTarget.currentTime = initialPosition
          }
          reportChapter(e.currentTarget.currentTime)
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted)
          setVolume(e.currentTarget.volume)
        }}
        playsInline
      />

      {/* Botón central de play cuando está pausado (con spinner mientras carga) */}
      {!playing && (
        <button
          onClick={togglePlay}
          disabled={loading}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={loading ? t("video-player.loading", "Cargando") : t("video-player.play", "Reproducir")}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm transition hover:bg-black/60">
            {loading ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Play className="h-7 w-7 text-white" fill="currentColor" />
            )}
          </span>
        </button>
      )}

      {/* Botón central de pausa: solo en táctil, mientras se reproduce y con los controles a la
          vista. Solo el círculo recibe el toque — el resto del vídeo sigue mostrando/ocultando
          controles. Cede el centro al círculo de carga mientras se espera vídeo. */}
      {touchMode && playing && controlsVisible && !buffering && !ended && (
        <button
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm"
          aria-label={t("video-player.pause", "Pausar")}
        >
          <Pause className="h-7 w-7 text-white" fill="currentColor" />
        </button>
      )}

      {/* Subtítulos. Suben por encima de la barra de controles mientras está visible. */}
      {subtitleTrack !== -1 && cueLines.length > 0 && !ended && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center px-3 transition-[bottom] duration-200 ${
            controlsVisible ? "bottom-[4.25rem]" : "bottom-3 sm:bottom-5"
          }`}
          aria-live="off"
        >
          {/* Las líneas de la cue se unen y se deja que el texto parta solo: respetando sus saltos
              más el ajuste al ancho, en el reproductor pequeño de móvil salían hasta 4 líneas. */}
          <p className="max-w-[94%] rounded-md bg-black/75 px-2.5 py-1 text-center text-xs font-medium leading-snug text-white [text-wrap:balance] sm:px-3 sm:py-1.5 sm:text-lg">
            {cueLines.join(" ")}
          </p>
        </div>
      )}

      {/* Círculo de carga mientras se reproduce: salto a otro punto o espera de datos. Con el
          vídeo en pausa no hace falta — ahí el propio botón central ya hace de indicador. */}
      {playing && buffering && !ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label={t("video-player.loading", "Cargando")}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>
        </div>
      )}

      {/* Tarjeta "Siguiente" al terminar (autoplay §9.7/§10.7). Cubre el vídeo, también en fullscreen. */}
      {ended && endSlot && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4">
          {endSlot(
            () => setEnded(false),
            () => {
              setEnded(false)
              const v = videoRef.current
              if (!v) return
              v.currentTime = 0
              v.play().catch(() => {})
            },
          )}
        </div>
      )}

      {/* Barra de controles */}
      {/* Sin eventos mientras está oculta: si no, la barra invisible se quedaba con el toque —
          al pulsar cerca de la parte de abajo caía en la barra de progreso y saltaba a otro
          minuto (§reporte de beta). */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-12 transition ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Progreso con marcadores de capítulo. `-mt-2 mb-1.5` (antes `-my-2`): la zona táctil de
            20px se compensa solo por arriba, para que quede aire entre la barra y los botones. touch-none evita que el gesto de arrastrar se
            interprete como scroll de la página en móvil — sin esto, el primer intento de
            arrastre se lo quedaba el navegador en vez de la barra. */}
        <div
          className="relative -mt-2 mb-1.5 flex h-5 w-full cursor-pointer touch-none items-center"
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
        >
        <div className="relative h-1.5 w-full rounded-full bg-white/20">
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${pct}%` }} />
          {chapters.map((ch) => (
            <button
              key={ch.startSeconds}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                seekTo(ch.startSeconds > 0 ? ch.startSeconds + CHAPTER_LEAD_IN_SECONDS : 0)
              }}
              title={`${formatDuration(ch.startSeconds)} · ${ch.title}`}
              className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 transition hover:bg-white"
              style={{ left: `${duration > 0 ? (ch.startSeconds / duration) * 100 : 0}%` }}
            />
          ))}
        </div>
        </div>

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} className="transition hover:text-neon-cyan" aria-label={playing ? t("video-player.pause", "Pausar") : t("video-player.play", "Reproducir")}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="transition hover:text-neon-cyan" aria-label={muted ? t("video-player.unmute", "Activar sonido") : t("video-player.mute", "Silenciar")}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={onVolume}
              className="hidden h-1 w-20 cursor-pointer accent-neon-cyan sm:block"
              aria-label={t("video-player.volume", "Volumen")}
            />
          </div>

          <span className="whitespace-nowrap text-xs font-medium tabular-nums text-white/90">
            {formatDuration(Math.floor(current))} / {formatDuration(Math.floor(duration))}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative flex items-center">
              <button
                ref={subtitlesBtnRef}
                onClick={toggleSubtitles}
                disabled={subtitleTracks.length === 0}
                className={`transition ${
                  subtitleTracks.length === 0
                    ? "cursor-not-allowed text-white/25"
                    : `hover:text-neon-cyan ${subtitleTrack !== -1 ? "text-neon-cyan" : ""}`
                }`}
                aria-label={
                  subtitleTracks.length === 0
                    ? t("video-player.subtitles-unavailable", "Subtítulos no disponibles")
                    : subtitleTrack !== -1
                      ? t("video-player.subtitles-off", "Desactivados")
                      : t("video-player.subtitles-title", "Subtítulos")
                }
                aria-pressed={subtitleTrack !== -1}
              >
                <Captions className="h-5 w-5" />
              </button>
              {openMenu === "subtitles" && subtitleTracks.length > 1 && menuPos && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                  <div
                    ref={menuRef}
                    style={{ bottom: menuPos.bottom, right: menuPos.right }}
                    className="fixed z-20 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-midnight py-1 shadow-2xl"
                  >
                    <button
                      onClick={() => selectSubtitle(-1)}
                      className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${subtitleTrack === -1 ? "text-neon-cyan" : "text-white"}`}
                    >
                      {t("video-player.subtitles-off", "Desactivados")}
                      {subtitleTrack === -1 && <span>✓</span>}
                    </button>
                    {subtitleTracks.map((track) => (
                      <button
                        key={track.index}
                        onClick={() => selectSubtitle(track.index)}
                        className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${subtitleTrack === track.index ? "text-neon-cyan" : "text-white"}`}
                      >
                        {track.label}
                        {subtitleTrack === track.index && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative flex items-center">
              <button
                ref={settingsBtnRef}
                onClick={() => toggleMenu("settings", settingsBtnRef)}
                className={`transition hover:text-neon-cyan ${openMenu === "settings" ? "text-neon-cyan" : ""}`}
                aria-label={t("video-player.settings", "Ajustes")}
              >
                <Settings className="h-5 w-5" />
              </button>
              {openMenu === "settings" && menuPos && (
                <>
                  {/* Capa para cerrar al hacer clic fuera */}
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                  <div
                    ref={menuRef}
                    style={{ bottom: menuPos.bottom, right: menuPos.right }}
                    className="fixed z-20 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-midnight py-1 shadow-2xl"
                  >
                    {/* Idioma (§9.1/§10.1): vídeo doblado al inglés (HeyGen), si existe. */}
                    <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("video-player.language-title", "Idioma")}</p>
                    {srcEn ? (
                      <>
                        <button
                          onClick={() => switchLanguage("es")}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${lang === "es" ? "text-neon-cyan" : "text-white"}`}
                        >
                          {/* Nombre del idioma en sí mismo: no se traduce con el idioma de la interfaz. */}
                          Español
                          {lang === "es" && <span>✓</span>}
                        </button>
                        <button
                          onClick={() => switchLanguage("en")}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${lang === "en" ? "text-neon-cyan" : "text-white"}`}
                        >
                          English (AI dub)
                          {lang === "en" && <span>✓</span>}
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-white/50"
                      >
                        {t("video-player.ai-audio", "Audio con IA")}
                        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neon-cyan">
                          {t("video-player.coming-soon", "Próximamente")}
                        </span>
                      </button>
                    )}

                    {levels.length > 0 && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("video-player.quality-title", "Calidad")}</p>
                        <button
                          onClick={() => selectQuality(-1)}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === -1 ? "text-neon-cyan" : "text-white"}`}
                        >
                          {t("video-player.quality-auto", "Automática")}
                          {qualityLevel === -1 && <span>✓</span>}
                        </button>
                        {levels.map((l) => (
                          <button
                            key={l.index}
                            onClick={() => selectQuality(l.index)}
                            className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === l.index ? "text-neon-cyan" : "text-white"}`}
                          >
                            {l.height > 0 ? `${l.height}p` : t("video-player.quality-level", "Nivel {n}", { n: l.index + 1 })}
                            {qualityLevel === l.index && <span>✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="transition hover:text-neon-cyan"
              aria-label={fullscreen ? t("video-player.fullscreen-exit", "Salir de pantalla completa") : t("video-player.fullscreen", "Pantalla completa")}
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default VideoPlayer
