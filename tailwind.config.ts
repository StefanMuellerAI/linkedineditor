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
          blue: "#0A66C2",
          "blue-hover": "#004182",
          light: "#E8F0FE",
          bg: "#F4F2EE",
          card: "#FFFFFF",
          text: "#191919",
          secondary: "#666666",
          border: "#E0E0E0",
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
        },
      },
    },
  },
  plugins: [],
};

export default config;
