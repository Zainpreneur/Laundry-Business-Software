/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff9ff",
          100: "#dbf1ff",
          200: "#b8e4ff",
          300: "#7ecfff",
          400: "#3bb4ff",
          500: "#1097fa",
          600: "#0079d6",
          700: "#0060ad",
          800: "#03518f",
          900: "#094575",
        },
      },
    },
  },
  plugins: [],
};
