/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        meliuz: {
          DEFAULT: '#ff2a5f',
          dark: '#e01b4c',
          light: '#ffebee',
        }
      }
    },
  },
  plugins: [],
}
