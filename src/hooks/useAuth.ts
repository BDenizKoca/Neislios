import { useContext } from 'react';
// Import the context and its type from the original context file
import { AuthContext, AuthContextType } from '../context/AuthContextDefinition'; // Updated import path

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};