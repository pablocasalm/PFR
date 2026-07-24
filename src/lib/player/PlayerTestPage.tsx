import { useState } from "react"
import VideoPlayer from "./VideoPlayer"

/**
 * ⚠️ SOLO DESARROLLO. Página para validar el reproductor HLS sin backend.
 * Ruta /dev/player (solo con import.meta.env.DEV). Por defecto usa un stream HLS
 * público de prueba; pega tu URL de Cloudflare Stream para probar tu vídeo real.
 */

// Vídeo de prueba en Cloudflare Stream (dev). Cambia la URL en el campo para probar otro.
const CF_BASE = "https://customer-l70mh3bn2bwnn0pj.cloudflarestream.com/b655e404f1f870d7ac0818460a91935a"
const TEST_STREAM = `${CF_BASE}/manifest/video.m3u8`
const TEST_POSTER = `${CF_BASE}/thumbnails/thumbnail.jpg`

const SAMPLE_CHAPTERS = [
  { startSeconds: 0, title: "Introducción" },
  { startSeconds: 30, title: "Segundo momento" },
  { startSeconds: 90, title: "Tercer momento" },
]

const PlayerTestPage = () => {
  const [url, setUrl] = useState(TEST_STREAM)
  const [src, setSrc] = useState(TEST_STREAM)

  return (
    <div className="min-h-screen bg-midnight px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Prueba del reproductor (dev)</h1>
          <p className="mt-1 text-sm text-white/60">
            Pega la URL HLS (<code>.m3u8</code>) de tu vídeo de Cloudflare Stream y pulsa Cargar.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://customer-XXXX.cloudflarestream.com/UID/manifest/video.m3u8"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"
          />
          <button
            onClick={() => setSrc(url)}
            className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
          >
            Cargar
          </button>
        </div>

        <VideoPlayer src={src} poster={src === TEST_STREAM ? TEST_POSTER : undefined} chapters={SAMPLE_CHAPTERS} />

        <p className="text-xs text-white/40">
          Por defecto carga tu vídeo de Cloudflare Stream. Los marcadores de la barra son capítulos de ejemplo.
        </p>
      </div>
    </div>
  )
}

export default PlayerTestPage
