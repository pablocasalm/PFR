/** @type {import('tailwindcss').Config} */
module.exports = {
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
