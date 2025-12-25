/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          bg: '#f0e6d2',
          red: '#B85C50', // Updated to match request
          green: '#343f28', // Added Deep Green
          black: '#1a1a1a',
          ink: '#2c2c2c',
          accent: '#e9c46a',
        }
      },
      fontFamily: {
        lilita: ['"Lilita One"', 'cursive'],
        handwriting: ['"Caveat"', 'cursive'],
        krona: ['"Krona One"', 'sans-serif'],
      },
      backgroundImage: {
        'halftone': "radial-gradient(circle, var(--retro-ink) 2px, transparent 2.5px)",
      },
      backgroundSize: {
        'halftone': '8px 8px',
      }
    },
  },
  plugins: [],
}
