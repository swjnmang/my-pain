import type { Config } from "tailwindcss";

// Design-Richtung "Ruhe": salbeigetönte Neutraltöne, dunkelgrüner Akzent,
// warmer Schmerz-Ton. `neutral` wird überschrieben, damit alle bestehenden
// neutral-* Klassen automatisch die neue Palette nutzen.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        neutral: {
          50: "#F2F4EF",
          100: "#EEF2EC",
          200: "#E1E6DF",
          300: "#D3DBD5",
          400: "#6F7D74",
          500: "#56635B",
          600: "#47534B",
          700: "#36413A",
          800: "#26302A",
          900: "#1B2620",
          950: "#111813",
        },
        accent: {
          DEFAULT: "#2E6A55",
          dark: "#1F4A3B",
          soft: "#DCE8E1",
        },
        pain: {
          DEFAULT: "#B44A22",
          soft: "#F0C9B6",
        },
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.375rem",
      },
    },
  },
  plugins: [],
};
export default config;
