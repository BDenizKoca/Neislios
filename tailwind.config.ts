import type { Config } from 'tailwindcss'
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e50914',
          dark: '#b81d24',
          light: '#f43f5e',
          hover: '#dc2626',
        },
      }
    },
  },
  plugins: [
     aspectRatio,
  ],
} satisfies Config