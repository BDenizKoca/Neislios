import { createContext } from 'react';

// Export the type definition
export interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Create and export the context object
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);