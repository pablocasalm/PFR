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

// Ajusta el tamaño de fuente para que un texto (una línea) quepa en `maxW`.
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number, minSize = 34): number {
  let s = size
  ctx.font = `${weight} ${s}px 'Space Grotesk', sans-serif`
  while (ctx.measureText(text).width > maxW && s > minSize) {
    s -= 4
    ctx.font = `${weight} ${s}px 'Space Grotesk', sans-serif`
  }
  return s
}

// Reparte `text` en como mucho `maxLines` líneas que quepan en `maxW`, reduciendo el
// tamaño de fuente si hace falta (para el nombre del bloque, que puede ser largo).
function wrapLines(ctx: CanvasRenderingContext2D, text: string, weight: number, startSize: number, maxW: number, maxLines: number, minSize = 32) {
  const words = text.split(" ")
  const layout = (size: number) => {
    ctx.font = `${weight} ${size}px 'Space Grotesk', sans-serif`
    const lines: string[] = []
    let cur = ""
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (cur && ctx.measureText(test).width > maxW) {
        lines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
    return lines
  }
  let size = startSize
  let lines = layout(size)
  while (lines.length > maxLines && size > minSize) {
    size -= 4
    lines = layout(size)
  }
  return { lines, size }
}

export async function renderMiJuegoStory({ minutes, concepts, block, name }: StoryData): Promise<Blob> {
  const W = 1080
  const H = 1920
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

  const cx = W / 2
  const contentW = 840 // ancho útil para texto/cajas (centrado)
  const contentX = (W - contentW) / 2

  // --- Fondo ---
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, "#070b0d")
  bg.addColorStop(1, "#020304")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // --- Rayas diagonales por toda la tarjeta ---
  ctx.save()
  roundRect(ctx, 40, 40, W - 80, H - 80, 56)
  ctx.clip()
  ctx.strokeStyle = "rgba(40,240,224,0.12)"
  ctx.lineWidth = 3
  for (let x = -H; x < W + H; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + H, H)
    ctx.stroke()
  }
  ctx.restore()

  // --- Marco redondeado con brillo ---
  ctx.save()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 5
  ctx.shadowColor = "rgba(40,240,224,0.55)"
  ctx.shadowBlur = 22
  roundRect(ctx, 40, 40, W - 80, H - 80, 56)
  ctx.stroke()
  ctx.restore()

  ctx.textBaseline = "alphabetic"

  // --- Marca (centrada, arriba) ---
  const markWords = ["PADEL", "FILM", "ROOM"]
  ctx.font = "700 26px 'Space Grotesk', sans-serif"
  const markWordW = Math.max(...markWords.map((w) => ctx.measureText(w).width))
  const iconSize = 82
  const iconGap = 22
  const groupW = iconSize + iconGap + markWordW
  const iconX = cx - groupW / 2
  const iconY = 118
  ctx.save()
  ctx.strokeStyle = "rgba(40,240,224,0.4)"
  ctx.fillStyle = "rgba(40,240,224,0.1)"
  ctx.lineWidth = 2
  roundRect(ctx, iconX, iconY, iconSize, iconSize, 16)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = CYAN
  ctx.beginPath()
  ctx.moveTo(iconX + iconSize * 0.38, iconY + iconSize * 0.28)
  ctx.lineTo(iconX + iconSize * 0.38, iconY + iconSize * 0.72)
  ctx.lineTo(iconX + iconSize * 0.72, iconY + iconSize * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.textAlign = "left"
  ctx.fillStyle = "#fff"
  ctx.font = "700 26px 'Space Grotesk', sans-serif"
  const lineH = 30
  const textStartY = iconY + iconSize / 2 - lineH + 24
  markWords.forEach((w, i) => ctx.fillText(w, iconX + iconSize + iconGap, textStartY + i * lineH))

  // --- Nombre (titular) ---
  ctx.textAlign = "center"
  const displayName = (name?.trim() || "TU RESUMEN").toUpperCase()
  const nameSize = fitFont(ctx, displayName, 800, 118, contentW, 56)
  ctx.font = `800 ${nameSize}px 'Space Grotesk', sans-serif`
  ctx.fillStyle = "#fff"
  const nameBaseline = 320
  ctx.fillText(displayName, cx, nameBaseline)

  // Subrayado cian centrado bajo el nombre
  const underlineW = Math.min(340, ctx.measureText(displayName).width)
  ctx.fillStyle = CYAN
  ctx.fillRect(cx - underlineW / 2, nameBaseline + 30, underlineW, 5)

  // --- Mes (con icono de calendario) ---
  const month = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const monthText = (month.charAt(0).toUpperCase() + month.slice(1)).toUpperCase()
  ctx.font = "700 44px 'Space Grotesk', sans-serif"
  const monthW = ctx.measureText(monthText).width
  const calSize = 34
  const calGap = 16
  const monthGroupW = calSize + calGap + monthW
  const monthBaseline = 424
  const calX = cx - monthGroupW / 2
  const calY = monthBaseline - calSize + 4
  ctx.save()
  ctx.strokeStyle = CYAN
  ctx.lineWidth = 2.5
  roundRect(ctx, calX, calY, calSize, calSize, 6)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(calX, calY + calSize * 0.34)
  ctx.lineTo(calX + calSize, calY + calSize * 0.34)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(calX + calSize * 0.28, calY - 4)
  ctx.lineTo(calX + calSize * 0.28, calY + 8)
  ctx.moveTo(calX + calSize * 0.72, calY - 4)
  ctx.lineTo(calX + calSize * 0.72, calY + 8)
  ctx.stroke()
  ctx.restore()
  ctx.textAlign = "left"
  ctx.fillStyle = CYAN
  ctx.fillText(monthText, calX + calSize + calGap, monthBaseline)

  // --- Minutos (número gigante con brillo) ---
  ctx.textAlign = "center"
  const minutesBaseline = 700
  ctx.save()
  ctx.fillStyle = "rgba(255,255,255,0.18)"
  ctx.filter = "blur(40px)"
  ctx.fillText(String(minutes), cx, minutesBaseline)
  ctx.restore()
  ctx.fillStyle = "#fff"
  ctx.font = "700 280px 'Space Grotesk', sans-serif"
  ctx.fillText(String(minutes), cx, minutesBaseline)
  ctx.font = "700 42px 'Space Grotesk', sans-serif"
  ctx.fillText("MIN APRENDIENDO", cx, minutesBaseline + 62)

  // --- Caja: conceptos más trabajados ---
  let y = 862
  const topList = concepts.slice(0, 3)
  if (topList.length > 0) {
    const rowH = 96
    const labelAreaH = 96
    const boxPadBottom = 30
    const boxH = labelAreaH + topList.length * rowH + boxPadBottom
    ctx.save()
    ctx.strokeStyle = "rgba(40,240,224,0.55)"
    ctx.lineWidth = 2.5
    roundRect(ctx, contentX, y, contentW, boxH, 26)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CYAN
    ctx.font = "700 30px 'Space Grotesk', sans-serif"
    ctx.fillText("CONCEPTOS MÁS TRABAJADOS", cx, y + 58)

    let rowY = y + labelAreaH
    topList.forEach((c, i) => {
      if (i > 0) {
        ctx.strokeStyle = "rgba(40,240,224,0.3)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(contentX + 60, rowY)
        ctx.lineTo(contentX + contentW - 60, rowY)
        ctx.stroke()
      }
      const label = c.toUpperCase()
      const size = fitFont(ctx, label, 700, 52, contentW - 100, 30)
      ctx.font = `700 ${size}px 'Space Grotesk', sans-serif`
      ctx.fillStyle = "#fff"
      ctx.fillText(label, cx, rowY + rowH * 0.66)
      rowY += rowH
    })

    y += boxH + 50
  }

  // --- Caja: bloque principal ---
  if (block) {
    ctx.font = "700 60px 'Space Grotesk', sans-serif"
    const { lines, size } = wrapLines(ctx, block.toUpperCase(), 700, 60, contentW - 100, 2, 36)
    const labelAreaH = 96
    const lineH2 = size * 1.18
    const boxPadBottom = 40
    const boxH = labelAreaH + lines.length * lineH2 + boxPadBottom

    ctx.save()
    ctx.strokeStyle = "rgba(40,240,224,0.55)"
    ctx.lineWidth = 2.5
    roundRect(ctx, contentX, y, contentW, boxH, 26)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CYAN
    ctx.font = "700 30px 'Space Grotesk', sans-serif"
    ctx.fillText("BLOQUE PRINCIPAL", cx, y + 58)

    ctx.font = `700 ${size}px 'Space Grotesk', sans-serif`
    ctx.fillStyle = "#fff"
    lines.forEach((line, i) => {
      ctx.fillText(line, cx, y + labelAreaH + lineH2 * 0.72 + i * lineH2)
    })
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png")
  })
}
