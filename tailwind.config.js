/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [],
  theme: {
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      lato: ["Lato", "sans-serif"],
      relaway: ["Raleway", "sans-serif"],
      crimson: ["Crimson Text", "serif"],
      roboto: ["Roboto", "sans-serif"],
      josefin: ["Josefin Sans", "sans-serif"],
      montserrat: ["Montserrat", "sans-serif"],
    },
    extend: {
      animation: {
        "spin-slow": " spin 5s linear infinite",
        'bounce-slow': 'bounce 5s infinite',
      },
    },
  },
  plugins: [],
};
