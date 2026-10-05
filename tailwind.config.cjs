/** @type {import('tailwindcss').Config} */
module.exports = {
  // Los `hover:` solo valen en dispositivos con ratón de verdad. En táctil el hover se queda
  // "pegado" tras un toque hasta tocar en otro sitio: un botón recién desactivado seguía viéndose
  // en su color de hover (p. ej. el de subtítulos, que seguía azul) — §reporte de beta.
  future: { hoverOnlyWhenSupported: true },
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
      },
      colors: {
        midnight: "#05070c",
        "midnight-soft": "#0c1220",
        "neon-cyan": "#28f0e0",
        "neon-lime": "#befc4b",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      boxShadow: {
        glow: "0 0 40px rgba(40, 240, 224, 0.15)",
      },
    },
  },
  plugins: [],
}
