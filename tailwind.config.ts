import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Foundree42 brand typography — Helvetica Neue (matches foundree42.com),
        // with a clean system fallback. No external font dependency.
        sans: [
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        // Foundree42 brand palette (sourced from foundree42.com).
        // Token names kept as `apple.*` to avoid churn; values are brand colors.
        apple: {
          blue:   "#186cb2",  // brand primary blue
          "blue-hover": "#0185d4",  // brighter brand blue for hover/active
          // Theme-aware via CSS variables (see globals.css):
          // light mode → navy text on white; dark mode → light text on navy surfaces.
          black:  "rgb(var(--c-black) / <alpha-value>)",  // #001825 brand navy
          gray:   "rgb(var(--c-gray) / <alpha-value>)",
          silver: "rgb(var(--c-silver) / <alpha-value>)",
          white:  "#ffffff",
          green:  "#34c759",
          amber:  "#ff9f0a",
          red:    "#ff4040",  // brand accent red
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.05)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.08)",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
