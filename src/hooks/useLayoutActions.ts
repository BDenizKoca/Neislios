import { useContext } from 'react';
// Import the context and its type from the context definition file
import { LayoutActionContext, LayoutActionContextType } from '../context/LayoutActionContextDefinition';

// Custom hook to use the LayoutActionContext
export const useLayoutActions = (): LayoutActionContextType => {
    const context = useContext(LayoutActionContext);
    if (context === undefined) {
        throw new Error('useLayoutActions must be used within a LayoutActionProvider');
    }
    return context;
};