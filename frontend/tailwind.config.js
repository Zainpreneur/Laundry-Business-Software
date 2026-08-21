/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f2ff",
          100: "#e8e4ff",
          200: "#cabfff",
          300: "#a891ff",
          400: "#8862ff",
          500: "#6d3bff",
          600: "#5a22f0",
          700: "#4a17c9",
          800: "#3c15a0",
          900: "#33167f",
        },
      },
    },
  },
  plugins: [],
};
