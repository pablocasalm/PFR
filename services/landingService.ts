const WEBHOOK_URL = "https://hook.eu2.make.com/qrqujauo2b558c2p71irua9u92ikly2i"

type LandingPayload = {
  email: string
}
export const sendLandingEmail = async (email: string) => {
  if (!WEBHOOK_URL) {
    throw new Error("Webhook no configurado.")
  }

  const payload: LandingPayload = { email }

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "No se pudo enviar el email.")
  }

  console.log("Webhook enviado:", {
    url: WEBHOOK_URL,
    contentType: "text/plain",
    body: email,
    status: response.status,
  })
}
