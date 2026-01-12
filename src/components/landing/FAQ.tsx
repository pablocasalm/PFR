import { motion, useReducedMotion } from "framer-motion"

const faqs = [
  {
    question: "Es solo para profesionales?",
    answer:
      "No. Es para jugadores que quieren mejorar su comprension del juego, independientemente del nivel.",
  },
  {
    question: "Cuando se lanza todo?",
    answer: "Muy pronto. La lista de correo sera la primera en saberlo.",
  },
  {
    question: "Habra contenido gratuito?",
    answer: "Si. Siempre habra contenido abierto y contenido mas profundo.",
  },
]

const FAQ = () => {
  const reduceMotion = useReducedMotion()

  return (
    <div className="grid gap-4">
      {faqs.map((faq, index) => (
        <motion.details
          key={faq.question}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: index * 0.05 }}
          className="group rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <summary className="cursor-pointer list-none text-sm font-semibold text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            {faq.question}
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{faq.answer}</p>
        </motion.details>
      ))}
    </div>
  )
}

export default FAQ
