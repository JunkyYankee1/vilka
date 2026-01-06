import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // зелёный акцент для основных кнопок
        brand: {
          light: "#dcfce7",   // очень светло-зелёный
          DEFAULT: "#16a34a", // зелёный (типа green-600)
          dark: "#15803d",    // тёмно-зелёный
        },
        // Design tokens for light/dark themes
        background: {
          DEFAULT: "var(--vilka-bg)",
        },
        card: {
          DEFAULT: "var(--vilka-card)",
        },
        muted: {
          DEFAULT: "var(--vilka-muted)",
        },
        border: {
          DEFAULT: "var(--vilka-border)",
        },
        foreground: {
          DEFAULT: "var(--vilka-foreground)",
          muted: "var(--vilka-foreground-muted)",
        },
        // Legacy surface tokens (for backward compatibility)
        surface: {
          DEFAULT: "var(--vilka-card)", // карточки, блоки
          soft: "var(--vilka-muted)",    // общий фон, «подложка»
        },
      },
      boxShadow: {
        "vilka-soft": "0 18px 45px rgba(15, 23, 42, 0.07)",
      },
      borderRadius: {
        "vilka-xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
