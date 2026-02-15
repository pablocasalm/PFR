import { useEffect } from "react"

const useLockBodyScroll = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [locked])
}

export default useLockBodyScroll
