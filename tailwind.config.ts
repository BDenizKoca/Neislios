import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#a9312c', // Define the new primary color
        // You might want complementary shades:
        // 'primary-dark': '#8a2823',
        // 'primary-light': '#c04a44',
      }
    },
  },
  plugins: [
     require('@tailwindcss/aspect-ratio'), // Add aspect-ratio plugin if not already present
  ],
} // Removed 'satisfies Config'