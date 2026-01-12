const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="section-divider bg-[#0a0d0f] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-white/60">
          Analisis de padel. Decisiones reales.
        </p>
        <p className="text-xs text-white/40">© {currentYear} Padel Film Room</p>
      </div>
    </footer>
  )
}

export default Footer
