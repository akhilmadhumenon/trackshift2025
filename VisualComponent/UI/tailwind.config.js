/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ferrari: {
          red: '#FF1801',
          black: '#000000',
          white: '#F5F5F5',
          graphite: '#1A1A1A',
        }
      },
      fontFamily: {
        formula: ['Audiowide', 'Orbitron', 'Poppins', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
        'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
      }
    },
  },
  plugins: [],
}
