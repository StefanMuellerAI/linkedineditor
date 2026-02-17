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
          bg: "#1A1B2E",
          surface: "#232440",
          "surface-hover": "#2A2B4A",
          border: "#3A3B5A",
          text: "#E8E8F0",
          muted: "#8888AA",
          accent: "#6C8AFF",
          "accent-hover": "#8BA3FF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
