// Removed unused import: import type { Config } from 'tailwindcss'
import aspectRatio from '@tailwindcss/aspect-ratio'; // Import the plugin
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
     aspectRatio, // Use the imported plugin
  ],
} // Removed 'satisfies Config'