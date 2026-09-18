import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#16A34A", // sport-green, adjust to your design system
          dark: "#15803D",
        },
      },
    },
  },
  plugins: [],
};

export default config;
