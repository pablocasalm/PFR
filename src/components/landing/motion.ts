import type { Variants } from "framer-motion"
import { useReducedMotion } from "framer-motion"

export const easings = {
  smooth: [0.22, 1, 0.36, 1],
  out: [0.16, 1, 0.3, 1],
}

export const durations = {
  micro: 0.2,
  reveal: 0.45,
  story: 0.6,
}

export const usePrefersReducedMotion = () => useReducedMotion() ?? false

export const fadeUp = (reduceMotion: boolean): Variants => ({
  hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.reveal, ease: easings.smooth },
  },
})

export const staggerContainer = (reduceMotion: boolean, stagger = 0.08): Variants => ({
  hidden: {},
  show: {
    transition: reduceMotion
      ? { duration: durations.micro }
      : { staggerChildren: stagger, delayChildren: 0.05 },
  },
})

export const blurIn = (reduceMotion: boolean): Variants => ({
  hidden: {
    opacity: 0,
    y: reduceMotion ? 0 : 10,
    filter: reduceMotion ? "blur(0px)" : "blur(6px)",
  },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: durations.story, ease: easings.out },
  },
  exit: {
    opacity: 0,
    y: reduceMotion ? 0 : -8,
    filter: reduceMotion ? "blur(0px)" : "blur(4px)",
    transition: { duration: durations.reveal, ease: easings.out },
  },
})
