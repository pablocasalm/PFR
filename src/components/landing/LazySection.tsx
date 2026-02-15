import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"

type LazySectionProps = {
  children: ReactNode
  minHeight?: number
  className?: string
}

const LazySection = ({ children, minHeight = 240, className }: LazySectionProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {isVisible ? children : null}
    </div>
  )
}

export default LazySection
