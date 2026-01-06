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
        // Design tokens for light/dark themes (shadcn-compatible)
        background: {
          DEFAULT: "rgb(var(--background))",
        },
        card: {
          DEFAULT: "rgb(var(--card))",
        },
        muted: {
          DEFAULT: "rgb(var(--muted))",
        },
        border: {
          DEFAULT: "rgb(var(--border))", /* Full opacity for better visibility */
        },
        input: {
          DEFAULT: "rgb(var(--input))",
        },
        ring: {
          DEFAULT: "rgb(var(--ring) / 0.3)",
        },
        foreground: {
          DEFAULT: "rgb(var(--foreground))",
          muted: "rgb(var(--foreground-muted))",
        },
        hover: {
          DEFAULT: "rgb(var(--hover))",
        },
        skeleton: {
          base: "rgb(var(--skeleton-base) / 0.6)",
          shimmer: "rgb(var(--skeleton-shimmer) / 0.6)",
        },
        focus: {
          ring: "rgb(var(--ring) / 0.3)",
        },
        // Legacy surface tokens (for backward compatibility)
        surface: {
          DEFAULT: "rgb(var(--card))", // карточки, блоки
          soft: "rgb(var(--background))",    // общий фон, «подложка» (page background)
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
