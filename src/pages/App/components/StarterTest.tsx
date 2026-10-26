import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, Compass, Plus, X } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { dismissStarterTest, followConcept, removeSavedConcept, trackTestEvent, type ConceptCard } from "../../../lib/api/starterTest"
import { invalidateStarterTest, testHref, useStarterTest } from "../../../lib/starterTest"
import { conceptSearchHref } from "../../../lib/taxonomy"

/**
 * Entradas al test inicial «¿Por dónde empiezo?» y la fila «Conceptos para trabajar»
 * (documento de Andrea del 20/10/2026, puntos 3.1 y 3.5). Ninguna es obligatoria.
 */

/** Chip de un concepto para trabajar: número, nombre y nº de clips; abre Explorar filtrado. */
export const ConceptChip = ({ concept, onRemove, track }: { concept: ConceptCard; onRemove?: () => void; track?: boolean }) => {
  const { lang } = useI18n()
  return (
    <div className="relative flex min-w-0 flex-1 basis-full sm:basis-[45%]">
      <Link
        to={conceptSearchHref(concept.id)}
        onClick={() => track && trackTestEvent("test_ver_clips", concept.nameEs)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-neon-cyan/40"
      >
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold text-neon-cyan">#{pickText(concept.nameEs, concept.nameEn, lang)}</span>
          <span className="block truncate text-xs text-white/50">
            {concept.clipCount} {concept.clipCount === 1 ? "clip" : "clips"}
            {concept.blockEs && ` · ${pickText(concept.blockEs, concept.blockEn ?? concept.blockEs, lang)}`}
          </span>
        </span>
      </Link>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="✕"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-midnight text-white/70 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

const BANNER_CLOSED_KEY = "starterTest.bannerClosed"
const readClosed = () => {
  try {
    return sessionStorage.getItem(BANNER_CLOSED_KEY) === "1"
  } catch {
    return false
  }
}

/** Banner en Inicio para quien no ha hecho el test. Va debajo del de la beta. Cerrarlo solo lo
 * oculta durante esta visita (sessionStorage): vuelve a salir la próxima vez que abra la app,
 * hasta que haga el test. Mientras, el avatar lleva un punto rojo (ver Header). */
export const StarterTestBanner = () => {
  const { t } = useI18n()
  const { data } = useStarterTest()
  const [hidden, setHidden] = useState(readClosed)
  if (!data || data.completed || hidden) return null

  const close = () => {
    setHidden(true)
    try {
      sessionStorage.setItem(BANNER_CLOSED_KEY, "1")
    } catch {
      // Sin almacenamiento: se oculta igual hasta salir de Inicio.
    }
    dismissStarterTest().catch(() => {}) // solo para las métricas (banner_test_cerrado)
  }

  return (
    <section className="relative flex flex-col gap-3 rounded-xl border border-white/15 border-l-[3px] border-l-neon-lime bg-gradient-to-r from-neon-lime/[0.07] to-transparent px-4 py-3.5 pr-10 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 items-start gap-3">
        <Compass className="mt-0.5 h-5 w-5 shrink-0 text-neon-lime" />
        <p className="text-sm text-white">
          {t("starter-test.banner.text", "¿No sabes por dónde empezar? Responde 3 preguntas y te dejamos en Mi Lista qué trabajar primero.")}
        </p>
      </div>
      <Link
        to={testHref("home_banner")}
        className="ml-8 self-start whitespace-nowrap rounded-full bg-neon-lime px-4 py-2 text-xs font-bold text-midnight transition hover:brightness-110 sm:ml-0 sm:self-auto"
      >
        {t("starter-test.banner.cta", "Hacer el test")}
      </Link>
      <button
        type="button"
        onClick={close}
        aria-label={t("common.close", "Cerrar")}
        className="absolute right-3 top-3 text-white/40 transition hover:text-white sm:top-1/2 sm:-translate-y-1/2"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}

/** Bloque al final de «Cómo funciona» y en Mi Cuenta («Termina de configurar tu cuenta»). En Mi
 * Cuenta desaparece al hacer el test; en Cómo funciona se queda como «Repetir el test». */
export const StarterTestCallout = ({ from }: { from: "how_it_works" | "account" }) => {
  const { t } = useI18n()
  const { data } = useStarterTest()
  if (!data || (from === "account" && data.completed)) return null

  return (
    // <div> y no <section>: Cómo funciona da estilo propio (márgenes, alto) a todas sus <section>.
    <div className="rounded-2xl border border-neon-lime/30 bg-neon-lime/[0.05] p-5 text-left">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neon-lime">
        {from === "account" ? t("starter-test.account.kicker", "Termina de configurar tu cuenta") : t("starter-test.how.kicker", "Siguiente paso")}
      </p>
      <h3 className="mt-2 text-lg font-bold text-white">{t("starter-test.how.title", "¿Por dónde empiezo?")}</h3>
      <p className="mt-1 text-sm text-white/70">
        {t("starter-test.how.text", "Cuéntanos cómo juegas y qué te pasa en tus partidos. Te recomendamos 2 conceptos para empezar.")}
      </p>
      <Link
        to={testHref(from)}
        className="mt-4 inline-block rounded-lg bg-neon-lime px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
      >
        {data.completed ? t("starter-test.retake", "Repetir el test") : t("starter-test.take", "Hacer el test")}
      </Link>
    </div>
  )
}

/** Fila fija arriba de Mi Lista: «Conceptos para trabajar». En Gestionar, cada chip se puede quitar. */
export const ConceptsToWork = ({ managing }: { managing: boolean }) => {
  const { t } = useI18n()
  const { data } = useStarterTest()
  const [removed, setRemoved] = useState<number[]>([])
  if (!data) return null
  const concepts = data.concepts.filter((c) => !removed.includes(c.id))

  const remove = (id: number) => {
    setRemoved((r) => [...r, id])
    removeSavedConcept(id)
      .then(invalidateStarterTest)
      .catch(() => setRemoved((r) => r.filter((x) => x !== id)))
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-3 text-base font-bold text-white">{t("starter-test.mylist.title", "Conceptos para trabajar")}</h2>
      {concepts.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-3">
            {concepts.map((c) => (
              <ConceptChip key={c.id} concept={c} onRemove={managing ? () => remove(c.id) : undefined} />
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">
            {t("starter-test.mylist.change", "¿Quieres cambiarlos?")}{" "}
            <Link to={testHref("my_list")} className="font-semibold text-neon-cyan">
              {t("starter-test.retake", "Repetir el test")} ›
            </Link>
          </p>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <p className="flex-1 text-sm text-white/70">
            {t("starter-test.mylist.empty", "¿No sabes por dónde empezar? Te recomendamos 2 conceptos en 3 preguntas.")}
          </p>
          <Link to={testHref("my_list")} className="shrink-0 rounded-lg bg-neon-cyan px-4 py-2 text-xs font-bold text-midnight">
            {data.completed ? t("starter-test.retake", "Repetir el test") : t("starter-test.take", "Hacer el test")}
          </Link>
        </div>
      )}
    </section>
  )
}

/** «Seguir este concepto» (Explorar filtrado por un concepto): lo añade o lo quita de
 * «Conceptos para trabajar» en Mi Lista. */
export const FollowConceptButton = ({ conceptId }: { conceptId: number }) => {
  const { t } = useI18n()
  const { data } = useStarterTest()
  const [busy, setBusy] = useState(false)
  if (!data) return null
  const following = data.concepts.some((c) => c.id === conceptId)

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      await (following ? removeSavedConcept(conceptId) : followConcept(conceptId))
      invalidateStarterTest()
    } catch {
      // Sin red: el botón se queda como estaba.
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        following ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan" : "border-white/20 text-white hover:border-neon-cyan/50"
      }`}
    >
      {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {following ? t("starter-test.follow.on", "Siguiendo") : t("starter-test.follow.off", "Seguir este concepto")}
    </button>
  )
}

/** Mi Juego: progreso en tus conceptos para trabajar ("#3.2 Mantener · 3 de 8 clips vistos"). */
export const ConceptProgress = () => {
  const { t, lang } = useI18n()
  const { data } = useStarterTest()
  if (!data) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-lg font-bold text-white">{t("starter-test.progress.title", "Tus conceptos para trabajar")}</h2>
      {data.concepts.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-white/60">{t("starter-test.mylist.empty", "¿No sabes por dónde empezar? Te recomendamos 2 conceptos en 3 preguntas.")}</p>
          <Link to={testHref("account")} className="shrink-0 rounded-lg bg-neon-cyan px-4 py-2 text-xs font-bold text-midnight">
            {data.completed ? t("starter-test.retake", "Repetir el test") : t("starter-test.take", "Hacer el test")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.concepts.map((c) => {
            const seen = Math.min(c.watched ?? 0, c.clipCount)
            const pct = c.clipCount > 0 ? Math.round((100 * seen) / c.clipCount) : 0
            return (
              <li key={c.id}>
                <Link to={conceptSearchHref(c.id)} className="block">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold text-neon-cyan">
                      #{pickText(c.nameEs, c.nameEn, lang)}
                    </span>
                    <span className="shrink-0 text-xs text-white/50">
                      {t("starter-test.progress.count", "{seen} de {total} clips vistos", { seen, total: c.clipCount })}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-neon-cyan/70" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
