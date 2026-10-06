import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f2ff", 100: "#ece6ff", 200: "#dbd0ff", 300: "#c0abff", 400: "#a280ff",
          500: "#8657fb", 600: "#7137f0", 700: "#5f2bd1", 800: "#4e25a8", 900: "#3f2085",
        },
      },
    },
  },
  plugins: [],
};
export default config;