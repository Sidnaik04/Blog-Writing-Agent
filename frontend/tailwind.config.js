/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Instrument Sans'", "sans-serif"],
        serif: ["'Instrument Serif'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "#f9f7f4",
          2: "#f2efe9",
          3: "#e8e3db",
        },
        ink: {
          DEFAULT: "#1a1814",
          2: "#3d3a35",
          3: "#6b6660",
          4: "#9c9890",
        },
        accent: {
          DEFAULT: "#2d5a27",
          light: "#4a8a42",
          muted: "#e8f0e6",
        },
        rule: "#ddd9d2",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease both",
        "slide-up": "slideUp 0.35s ease both",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        bounce: "bounce 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite",
        shimmer: "shimmer 2s infinite",
        "slide-in-right": "slideInRight 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
          "50%": { opacity: 1, transform: "scale(1)" },
        },
        pulse: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        slideInRight: {
          from: { opacity: 0, transform: "translateX(-20px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
