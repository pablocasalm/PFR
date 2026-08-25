/**
 * Genera la imagen 9:16 del resumen de aprendizaje de Mi Juego (§13.4), lista para
 * compartir en Stories. Se dibuja en un canvas 1080×1920 con la identidad de PFR,
 * replicando la vista previa (StoryCard). Devuelve un PNG (Blob).
 */
export type StoryData = { minutes: number; concepts: string[]; block: string; name?: string }

const CYAN = "#28f0e0"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    img.src = src
  })
}

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

  // --- Fondo (bien oscuro, para que los brillos resalten) ---
  ctx.fillStyle = "#020304"
  ctx.fillRect(0, 0, W, H)

  // --- Rayas diagonales: visibles cerca de los bordes, se apagan hacia el centro ---
  // (si cubrieran toda la tarjeta por igual, el centro perdería contraste con los brillos)
  const stripeCanvas = document.createElement("canvas")
  stripeCanvas.width = W
  stripeCanvas.height = H
  const sctx = stripeCanvas.getContext("2d")
  if (sctx) {
    sctx.save()
    roundRect(sctx, 40, 40, W - 80, H - 80, 56)
    sctx.clip()
    sctx.strokeStyle = "rgba(40,240,224,0.25)"
    sctx.lineWidth = 3
    // Mismo ángulo que el "118deg" del degradado CSS de la vista previa (StoryCard),
    // para que la dirección de las rayas coincida con la de la imagen descargable.
    const stripeRun = H * Math.tan((118 - 90) * (Math.PI / 180))
    for (let x = -H; x < W + H; x += 40) {
      sctx.beginPath()
      sctx.moveTo(x, 0)
      sctx.lineTo(x - stripeRun, H)
      sctx.stroke()
    }
    sctx.restore()

    // Máscara elíptica (no circular: la tarjeta es mucho más alta que ancha) que borra
    // las rayas en el centro y las deja intactas cerca de bordes/esquinas.
    sctx.globalCompositeOperation = "destination-in"
    sctx.save()
    sctx.translate(cx, H / 2)
    sctx.scale(1, H / W)
    const mask = sctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.62)
    mask.addColorStop(0, "rgba(0,0,0,0)")
    mask.addColorStop(0.62, "rgba(0,0,0,0)")
    mask.addColorStop(1, "rgba(0,0,0,1)")
    sctx.fillStyle = mask
    sctx.fillRect(-W, -H, W * 2, H * 2)
    sctx.restore()
    sctx.globalCompositeOperation = "source-over"

    ctx.drawImage(stripeCanvas, 0, 0)
  }

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

  // Estimaciones de altura de caja/descendente en proporción al tamaño de fuente (Space
  // Grotesk bold): permiten encadenar elementos por su tamaño real en vez de huecos fijos,
  // así que si un texto se agranda, el espacio de después se ajusta solo.
  const capH = (px: number) => px * 0.73
  const descH = (px: number) => px * 0.24

  // --- Marca (logo real, centrado arriba) ---
  const logoImg = await loadImage("/Logos/logo-pfr-story.png")
  const logoW = 380
  const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth)
  const logoY = 100
  ctx.drawImage(logoImg, cx - logoW / 2, logoY, logoW, logoH)

  let y = logoY + logoH + 36

  // --- Nombre (titular) ---
  ctx.textAlign = "center"
  const fullName = (name?.trim() || "TU RESUMEN").toUpperCase()
  let displayName = fullName
  const nameSize = fitFont(ctx, displayName, 800, 172, contentW, 40)
  ctx.font = `800 ${nameSize}px 'Space Grotesk', sans-serif`
  // Red de seguridad: si aun al tamaño mínimo un nombre muy largo se sale de la tarjeta,
  // se trunca con "…" en vez de desbordar el marco.
  while (ctx.measureText(displayName).width > contentW && displayName.length > 1) {
    displayName = displayName.slice(0, -1)
  }
  if (displayName !== fullName) displayName = displayName.trimEnd() + "…"
  ctx.fillStyle = "#fff"
  const nameBaseline = y + capH(nameSize)
  ctx.fillText(displayName, cx, nameBaseline)
  y = nameBaseline + descH(nameSize) + 22

  // Subrayado cian centrado bajo el nombre
  const underlineW = Math.min(380, ctx.measureText(displayName).width)
  ctx.fillStyle = CYAN
  ctx.fillRect(cx - underlineW / 2, y, underlineW, 6)
  y += 6 + 36

  // --- Mes (con icono de calendario) ---
  const month = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const monthText = (month.charAt(0).toUpperCase() + month.slice(1)).toUpperCase()
  const monthSize = 52
  ctx.font = `700 ${monthSize}px 'Space Grotesk', sans-serif`
  const monthW = ctx.measureText(monthText).width
  const calSize = monthSize * 0.7
  const calGap = 18
  const monthGroupW = calSize + calGap + monthW
  const monthBaseline = y + capH(monthSize)
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
  y = monthBaseline + descH(monthSize) + 46

  // --- Minutos (número gigante con brillo) ---
  ctx.textAlign = "center"
  const numberSize = 300
  const minutesBaseline = y + capH(numberSize)
  ctx.save()
  ctx.fillStyle = "rgba(255,255,255,0.18)"
  ctx.filter = "blur(40px)"
  ctx.font = `700 ${numberSize}px 'Space Grotesk', sans-serif`
  ctx.fillText(String(minutes), cx, minutesBaseline)
  ctx.restore()
  ctx.fillStyle = "#fff"
  ctx.font = `700 ${numberSize}px 'Space Grotesk', sans-serif`
  ctx.fillText(String(minutes), cx, minutesBaseline)
  y = minutesBaseline + descH(numberSize) + 10

  const subSize = 48
  const subBaseline = y + capH(subSize)
  ctx.font = `700 ${subSize}px 'Space Grotesk', sans-serif`
  ctx.fillText("MIN APRENDIENDO", cx, subBaseline)
  y = subBaseline + descH(subSize) + 50

  // --- Caja: conceptos más trabajados ---
  const labelSize = 34
  const topList = concepts.slice(0, 3)
  if (topList.length > 0) {
    const itemStartSize = 60
    const rowH = itemStartSize * 1.6
    const labelAreaH = labelSize * 2.7
    const boxPadBottom = 34
    const boxH = labelAreaH + topList.length * rowH + boxPadBottom
    ctx.save()
    ctx.strokeStyle = "rgba(40,240,224,0.55)"
    ctx.lineWidth = 2.5
    roundRect(ctx, contentX, y, contentW, boxH, 26)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CYAN
    ctx.font = `700 ${labelSize}px 'Space Grotesk', sans-serif`
    ctx.fillText("CONCEPTOS MÁS TRABAJADOS", cx, y + labelSize * 1.7)

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
      const size = fitFont(ctx, label, 700, itemStartSize, contentW - 100, 32)
      ctx.font = `700 ${size}px 'Space Grotesk', sans-serif`
      ctx.fillStyle = "#fff"
      ctx.fillText(label, cx, rowY + rowH * 0.66)
      rowY += rowH
    })

    y += boxH + 34
  }

  // --- Caja: bloque principal ---
  if (block) {
    const blockStartSize = 68
    ctx.font = `700 ${blockStartSize}px 'Space Grotesk', sans-serif`
    const { lines, size } = wrapLines(ctx, block.toUpperCase(), 700, blockStartSize, contentW - 100, 2, 38)
    const labelAreaH = labelSize * 2.7
    const lineH2 = size * 1.15
    const boxPadBottom = 34
    const boxH = labelAreaH + lines.length * lineH2 + boxPadBottom

    ctx.save()
    ctx.strokeStyle = "rgba(40,240,224,0.55)"
    ctx.lineWidth = 2.5
    roundRect(ctx, contentX, y, contentW, boxH, 26)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = CYAN
    ctx.font = `700 ${labelSize}px 'Space Grotesk', sans-serif`
    ctx.fillText("BLOQUE PRINCIPAL", cx, y + labelSize * 1.7)

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
