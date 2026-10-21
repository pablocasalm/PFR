import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, Compass, X } from "lucide-react"
import { useI18n, type TFunc } from "../../../lib/i18n/store"
import {
  submitStarterTest,
  trackTestEvent,
  type ConceptCard,
  type Frequency,
  type GameLevel,
  type Phrase,
  type PlaytomicLevel,
  type TestOrigin,
} from "../../../lib/api/starterTest"
import { invalidateStarterTest } from "../../../lib/starterTest"
import { ConceptChip } from "../components/StarterTest"

/**
 * Test inicial «¿Por dónde empiezo?» (documento de Andrea del 20/10/2026, tabla validada por
 * Guille). Una pregunta por pantalla, con progreso, Atrás y X (sale sin guardar). La recomendación
 * sale solo de la pregunta 3; el nivel de Playtomic (obligatorio, con «No uso Playtomic») y la
 * frecuencia son solo un dato. El resultado se guarda en Mi Lista.
 */

const GAME: { value: GameLevel; label: (t: TFunc) => string }[] = [
  { value: "new", label: (t) => t("starter-test.q1.new", "Llevo poco tiempo jugando") },
  { value: "friends", label: (t) => t("starter-test.q1.friends", "Juego partidos con amigos con regularidad") },
  { value: "amateur", label: (t) => t("starter-test.q1.amateur", "Juego americanas o liga amateur") },
  { value: "tournaments", label: (t) => t("starter-test.q1.tournaments", "Compito en torneos") },
]

const PLAYTOMIC: { value: PlaytomicLevel; es: string; en: string }[] = [
  { value: "none", es: "No uso Playtomic", en: "I don't use Playtomic" },
  { value: "lt1", es: "Menos de 1", en: "Less than 1" },
  { value: "1.0", es: "1,0–1,49", en: "1.0–1.49" },
  { value: "1.5", es: "1,5–2,49", en: "1.5–2.49" },
  { value: "2.5", es: "2,5–3,49", en: "2.5–3.49" },
  { value: "3.5", es: "3,5–4,49", en: "3.5–4.49" },
  { value: "4.5", es: "4,5–5,49", en: "4.5–5.49" },
  { value: "5.5", es: "5,5 o más", en: "5.5 or higher" },
]

const FREQUENCY: { value: Frequency; label: (t: TFunc) => string }[] = [
  { value: "1", label: (t) => t("starter-test.q2.1", "1 o menos") },
  { value: "2-3", label: (t) => t("starter-test.q2.2-3", "2 o 3") },
  { value: "4+", label: (t) => t("starter-test.q2.4", "4 o más") },
]

const PHRASES: { value: Phrase; label: (t: TFunc) => string }[] = [
  { value: "lose_net", label: (t) => t("starter-test.q3.lose-net", "Me quitan la red enseguida") },
  { value: "defend_back", label: (t) => t("starter-test.q3.defend-back", "Me cuesta defender desde el fondo") },
  { value: "when_net", label: (t) => t("starter-test.q3.when-net", "No sé cuándo subir a la red") },
  { value: "lobs", label: (t) => t("starter-test.q3.lobs", "Tiro globos, pero no me funcionan") },
  { value: "rush", label: (t) => t("starter-test.q3.rush", "Me precipito y quiero acabar el punto demasiado pronto") },
  { value: "volleys", label: (t) => t("starter-test.q3.volleys", "Mis voleas no hacen daño") },
  { value: "partner", label: (t) => t("starter-test.q3.partner", "Con mi compañero no nos coordinamos") },
  { value: "read", label: (t) => t("starter-test.q3.read", "No sé leer al rival") },
  { value: "unsure", label: (t) => t("starter-test.q3.unsure", "No lo tengo claro") },
]

const ORIGINS: TestOrigin[] = ["how_it_works", "home_banner", "my_list", "account"]

const Option = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition ${
      on ? "border-neon-cyan bg-neon-cyan/10 text-white" : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25"
    }`}
  >
    <span>{children}</span>
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-neon-cyan bg-neon-cyan text-midnight" : "border-white/30"}`}>
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  </button>
)

const TestInicial = () => {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = params.get("from")
  const origin: TestOrigin = ORIGINS.includes(from as TestOrigin) ? (from as TestOrigin) : "my_list"

  const [step, setStep] = useState(0)
  const [game, setGame] = useState<GameLevel | null>(null)
  const [playtomic, setPlaytomic] = useState<PlaytomicLevel | "">("")
  const [frequency, setFrequency] = useState<Frequency | null>(null)
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ unsure: boolean; concepts: ConceptCard[] } | null>(null)

  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    trackTestEvent("test_iniciado", origin)
  }, [origin])

  const togglePhrase = (p: Phrase) => {
    if (p === "unsure") return setPhrases((cur) => (cur.includes("unsure") ? [] : ["unsure"]))
    setPhrases((cur) => {
      const rest = cur.filter((x) => x !== "unsure")
      if (rest.includes(p)) return rest.filter((x) => x !== p)
      return rest.length >= 2 ? rest : [...rest, p]
    })
  }

  const canNext = step === 0 ? !!game && playtomic !== "" : step === 1 ? !!frequency : phrases.length > 0

  const exit = () => {
    if (!result) trackTestEvent("test_abandonado", String(step + 1))
    navigate(-1)
  }

  const finish = async () => {
    if (!game || !playtomic || !frequency || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await submitStarterTest({ gameLevel: game, playtomicLevel: playtomic, frequency, phrases, origin })
      invalidateStarterTest()
      setResult(res)
    } catch {
      setError(t("starter-test.error", "No se pudo guardar. Inténtalo de nuevo."))
    } finally {
      setBusy(false)
    }
  }

  // --- Pantallas finales ---
  if (result) {
    return (
      <main className="mx-auto w-full max-w-xl py-10">
        {result.unsure ? (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
              <Compass className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold text-white">{t("starter-test.unsure.title", "Empieza por un bloque")}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              {t(
                "starter-test.unsure.text",
                "Es más habitual de lo que parece. Entra en Explorar, elige el bloque que creas que más necesita tu juego y repasa sus conceptos uno a uno.",
              )}
            </p>
            <Link
              to="/app/explorar"
              onClick={() => trackTestEvent("test_ir_explorar")}
              className="mt-6 inline-block rounded-lg bg-neon-cyan px-6 py-3 text-sm font-bold text-midnight transition hover:brightness-110"
            >
              {t("starter-test.unsure.cta", "Ir a Explorar")}
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{t("starter-test.result.title", "Tu punto de partida")}</h1>
            <p className="mt-2 text-sm text-white/70">
              {t("starter-test.result.text", "Hemos guardado estos 2 conceptos en Mi Lista. Empieza por aquí y cámbialos cuando quieras.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {result.concepts.map((c) => (
                <ConceptChip key={c.id} concept={c} track />
              ))}
            </div>
            <p className="mt-2 text-xs text-white/40">{t("starter-test.result.tap-hint", "Pulsa un concepto para ver sus clips.")}</p>
            <Link to="/app/mi-lista" className="mt-6 inline-block rounded-lg bg-neon-cyan px-6 py-3 text-sm font-bold text-midnight transition hover:brightness-110">
              {t("starter-test.result.my-list", "Ir a Mi Lista")}
            </Link>
          </div>
        )}
      </main>
    )
  }

  // --- Preguntas ---
  return (
    <main className="mx-auto w-full max-w-xl py-8">
      <div className="mb-6 flex items-center gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} aria-label={t("starter-test.back", "Atrás")} className="text-white/60 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
        <span className="text-xs text-white/50">{step + 1}/3</span>
        <button type="button" onClick={exit} aria-label={t("common.close", "Cerrar")} className="text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {step === 0 && <p className="mb-1 text-xs text-white/50">{t("starter-test.subtitle", "3 preguntas. Menos de un minuto.")}</p>}

      {step === 0 && (
        <section className="space-y-3">
          <h1 className="font-display text-xl font-bold text-white">{t("starter-test.q1.title", "¿Cómo describirías tu juego?")}</h1>
          {GAME.map((o) => (
            <Option key={o.value} on={game === o.value} onClick={() => setGame(o.value)}>
              {o.label(t)}
            </Option>
          ))}
          <label className="block pt-2">
            <span className="mb-1.5 block text-xs font-semibold text-white/60">{t("starter-test.q1.playtomic", "Nivel de Playtomic")}</span>
            <select
              value={playtomic}
              onChange={(e) => setPlaytomic(e.target.value as PlaytomicLevel)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white"
            >
              <option value="" disabled>
                {t("starter-test.q1.playtomic-default", "Selecciona tu nivel")}
              </option>
              {PLAYTOMIC.map((p) => (
                <option key={p.value} value={p.value}>
                  {lang === "en" ? p.en : p.es}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <h1 className="font-display text-xl font-bold text-white">{t("starter-test.q2.title", "¿Cuántas veces juegas a la semana?")}</h1>
          {FREQUENCY.map((o) => (
            <Option key={o.value} on={frequency === o.value} onClick={() => setFrequency(o.value)}>
              {o.label(t)}
            </Option>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h1 className="font-display text-xl font-bold text-white">{t("starter-test.q3.title", "¿Con qué frases identificas más tu juego?")}</h1>
          <p className="text-xs text-white/50">{t("starter-test.q3.help", "Elige hasta 2.")}</p>
          {PHRASES.map((o) => (
            <Option key={o.value} on={phrases.includes(o.value)} onClick={() => togglePhrase(o.value)}>
              {o.label(t)}
            </Option>
          ))}
        </section>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button
        type="button"
        disabled={!canNext || busy}
        onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
        className="mt-6 w-full rounded-xl bg-neon-cyan py-3.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-40"
      >
        {step < 2 ? t("starter-test.next", "Siguiente") : busy ? t("common.loading", "Cargando...") : t("starter-test.see-result", "Ver mi resultado")}
      </button>
    </main>
  )
}

export default TestInicial
