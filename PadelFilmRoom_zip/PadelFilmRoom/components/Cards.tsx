'use client';

import { motion, useReducedMotion } from 'framer-motion';

const cards = [
  {
    title: 'Puntos reales',
    text: 'Situaciones de partido con contexto: marcador, posiciones y objetivo.',
  },
  {
    title: 'Decisiones tácticas',
    text: 'Qué opción era mejor y qué señales lo indicaban.',
  },
  {
    title: 'Lectura del juego',
    text: 'Antes, durante y después del punto. Patrones repetibles.',
  },
  {
    title: 'Accionable',
    text: 'Ideas claras para aplicar en tu próximo partido.',
  },
];

export function Cards() {
  const reduceMotion = useReducedMotion();
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={reduceMotion ? undefined : container}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, margin: '-60px' }}
      className="grid gap-6 md:grid-cols-2"
    >
      {cards.map((card) => (
        <motion.div
          key={card.title}
          variants={reduceMotion ? undefined : item}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
        >
          <div className="h-1 w-10 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-sky-400 opacity-70 transition group-hover:opacity-100" />
          <h3 className="text-xl font-semibold text-white">{card.title}</h3>
          <p className="text-sm leading-relaxed text-white/65">{card.text}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
