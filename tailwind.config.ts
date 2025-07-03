import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // 👈 Required for manual dark mode toggle
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
