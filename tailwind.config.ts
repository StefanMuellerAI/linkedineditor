import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
      },
      colors: {
        linkedin: {
          blue: "var(--linkedin-blue)",
          "blue-hover": "var(--linkedin-blue-hover)",
          light: "var(--linkedin-light)",
          bg: "var(--linkedin-bg)",
          card: "var(--linkedin-card)",
          text: "var(--linkedin-text)",
          secondary: "var(--linkedin-secondary)",
          border: "var(--linkedin-border)",
        },
        editor: {
          bg: "var(--editor-bg)",
          surface: "var(--editor-surface)",
          "surface-hover": "var(--editor-surface-hover)",
          border: "var(--editor-border)",
          text: "var(--editor-text)",
          muted: "var(--editor-muted)",
          accent: "var(--editor-accent)",
          "accent-hover": "var(--editor-accent-hover)",
          "accent-foreground": "var(--editor-accent-foreground)",
          success: "var(--editor-success)",
          "success-foreground": "var(--editor-success-foreground)",
          warning: "var(--editor-warning)",
          danger: "var(--editor-danger)",
          "danger-soft": "var(--editor-danger-soft)",
          overlay: "var(--editor-overlay)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
