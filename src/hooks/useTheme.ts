import { useContext } from 'react';
import { ThemeContext, ThemeContextType } from '../context/ThemeContextDefinition'; // Updated import path

// Custom hook to use the ThemeContext
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};