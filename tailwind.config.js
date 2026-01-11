/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      colors: {
        midnight: "#05070c",
        "midnight-soft": "#0c1220",
        "neon-cyan": "#28f0e0",
        "neon-lime": "#befc4b",
      },
      boxShadow: {
        glow: "0 0 40px rgba(40, 240, 224, 0.15)",
      },
    },
  },
  plugins: [],
}
