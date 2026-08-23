/**
 * Genera la imagen 9:16 del resumen de aprendizaje de Mi Juego (§13.4), lista para
 * compartir en Stories. Se dibuja en un canvas 1080×1920 con la identidad de PFR,
 * replicando la vista previa (StoryCard). Devuelve un PNG (Blob).
 */
export type StoryData = { minutes: number; concepts: string[]; block: string; name?: string }

const CYAN = "#28f0e0"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Ajusta el tamaño de fuente para que un texto quepa en `maxW` (evita desbordes en bloques largos).
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number): number {
  let s = size
  ctx.font = `${weight} ${s}px 'Space Grotesk', sans-serif`
  while (ctx.measureText(text).width > maxW && s > 34) {
    s -= 4
    ctx.font = `${weight} ${s}px 'Space Grotesk', sans-serif`
  }
  return s
}

export async function renderMiJuegoStory({ minutes, concepts, block, name }: StoryData): Promise<Blob> {
  const W = 1080
  const H = 1920
  const pad = 90
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas no disponible")

  // Asegura que Space Grotesk esté cargada antes de pintar texto.
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* sin FontFaceSet: se usará el fallback sans-serif */
  }

  // Fondo degradado vertical
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, "#0a1622")
  bg.addColorStop(0.5, "#070d16")
  bg.addColorStop(1, "#04060a")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Rayas diagonales cian (arriba a la derecha)
  ctx.save()
  ctx.beginPath()
  ctx.rect(W * 0.32, 0, W * 0.68, H * 0.5)
  ctx.clip()
  ctx.strokeStyle = "rgba(40,240,224,0.35)"
  ctx.lineWidth = 4
  for (let x = -H; x < W + H; x += 34) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + H, H)
    ctx.stroke()
  }
  ctx.restore()

  // Línea blanca girada cerca del pie
  ctx.save()
  ctx.translate(0, H - 360)
  ctx.rotate((-8 * Math.PI) / 180)
  ctx.strokeStyle = "rgba(255,255,255,0.25)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-50, 0)
  ctx.lineTo(W + 50, 0)
  ctx.stroke()
  ctx.restore()

  // Bola lima con brillo (abajo a la derecha)
  const bx = W - 150
  const by = H - 250
  const br = 60
  const ball = ctx.createRadialGradient(bx - 20, by - 20, 10, bx, by, br)
  ball.addColorStop(0, "#ecfccb")
  ball.addColorStop(1, "#84cc16")
  ctx.save()
  ctx.shadowColor = "rgba(190,252,75,0.5)"
  ctx.shadowBlur = 60
  ctx.fillStyle = ball
  ctx.beginPath()
  ctx.arc(bx, by, br, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Marca (arriba a la izquierda)
  ctx.save()
  ctx.strokeStyle = "rgba(40,240,224,0.4)"
  ctx.fillStyle = "rgba(40,240,224,0.1)"
  ctx.lineWidth = 2
  roundRect(ctx, pad, 100, 74, 74, 14)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = CYAN
  ctx.beginPath()
  ctx.moveTo(pad + 28, 122)
  ctx.lineTo(pad + 28, 152)
  ctx.lineTo(pad + 52, 137)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#fff"
  ctx.textBaseline = "top"
  ctx.font = "700 26px 'Space Grotesk', sans-serif"
  ctx.fillText("PADEL", pad + 92, 104)
  ctx.fillText("FILM ROOM", pad + 92, 138)
  ctx.restore()

  // Nombre de quien comparte (arriba a la derecha, § reporte de beta).
  if (name) {
    ctx.save()
    ctx.textAlign = "right"
    ctx.fillStyle = "rgba(255,255,255,0.85)"
    ctx.font = "600 30px 'Space Grotesk', sans-serif"
    const maxNameW = W - pad * 2 - 200
    let nameText = name
    while (ctx.measureText(nameText).width > maxNameW && nameText.length > 1) nameText = nameText.slice(0, -1)
    if (nameText !== name) nameText = nameText.trimEnd() + "…"
    ctx.fillText(nameText, W - pad, 138)
    ctx.restore()
  }

  ctx.textBaseline = "alphabetic"

  // Mes con subrayado cian
  const month = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1)
  ctx.fillStyle = CYAN
  ctx.font = "700 48px 'Space Grotesk', sans-serif"
  ctx.fillText(monthCap, pad, 340)
  ctx.fillRect(pad, 356, ctx.measureText(monthCap).width, 4)

  // Minutos (número gigante)
  ctx.fillStyle = "#fff"
  ctx.font = "700 300px 'Space Grotesk', sans-serif"
  ctx.fillText(String(minutes), pad - 6, 630)
  ctx.font = "700 46px 'Space Grotesk', sans-serif"
  ctx.fillText("MIN APRENDIENDO", pad, 700)

  // Conceptos más trabajados
  let y = 900
  if (concepts.length > 0) {
    ctx.fillStyle = CYAN
    ctx.font = "700 34px 'Space Grotesk', sans-serif"
    ctx.fillText("CONCEPTOS MÁS TRABAJADOS", pad, y)
    y += 78
    ctx.fillStyle = "#fff"
    for (const c of concepts.slice(0, 3)) {
      const label = "#" + c.toUpperCase()
      fitFont(ctx, label, 700, 70, W - pad * 2)
      ctx.fillText(label, pad, y)
      y += 84
    }
  }

  // Bloque principal (pie)
  if (block) {
    ctx.fillStyle = CYAN
    ctx.font = "700 34px 'Space Grotesk', sans-serif"
    ctx.fillText("BLOQUE PRINCIPAL", pad, H - 250)
    ctx.fillStyle = "#fff"
    const label = block.toUpperCase()
    fitFont(ctx, label, 700, 64, W - pad * 2)
    ctx.fillText(label, pad, H - 175)
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png")
  })
}
