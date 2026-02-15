import { motion, useScroll, useSpring } from "framer-motion"

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.2,
  })

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 h-[2px] w-full origin-left bg-gradient-to-r from-neon-cyan/60 via-neon-cyan/40 to-transparent"
      style={{ scaleX }}
    />
  )
}

export default ScrollProgress
