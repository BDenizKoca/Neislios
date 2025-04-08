import { useContext } from 'react';
// Import the context and its type from the context definition file
import { HeaderContext, HeaderContextType } from '../context/HeaderContextDefinition';

// Custom hook to use the HeaderContext
export const useHeader = (): HeaderContextType => {
    const context = useContext(HeaderContext);
    if (context === undefined) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
};