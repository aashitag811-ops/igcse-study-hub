import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#4F46E5", 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE",
          300: "#A5B4FC", 400: "#818CF8", 500: "#4F46E5", 600: "#4338CA",
          700: "#3730A3", 800: "#312E81", 900: "#1E1B4B",
        },
      },
    },
  },
  plugins: [],
};

export default config;

// Made with Bob
