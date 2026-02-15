const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="section-divider bg-[#0a0d0f] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.28em] text-white/50">
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          Film room · decisiones reales
          <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        </div>
        <p className="text-xs text-white/40">© {currentYear} Padel Film Room</p>
      </div>
    </footer>
  )
}

export default Footer
