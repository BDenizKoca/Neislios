import React, { createContext, useState, useContext, useCallback } from 'react';

interface LayoutActionContextType {
  triggerRandomPick: (() => void) | null;
  registerRandomPickTrigger: (fn: (() => void) | null) => void;
}

const LayoutActionContext = createContext<LayoutActionContextType | undefined>(undefined);

export const LayoutActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [triggerRandomPick, setTriggerRandomPick] = useState<(() => void) | null>(null);

  const registerRandomPickTrigger = useCallback((fn: (() => void) | null) => {
    console.log("Registering trigger:", fn ? 'Function' : 'null');
    setTriggerRandomPick(() => fn); // Store the function itself
  }, []);

  return (
    <LayoutActionContext.Provider value={{ triggerRandomPick, registerRandomPickTrigger }}>
      {children}
    </LayoutActionContext.Provider>
  );
};

export const useLayoutActions = (): LayoutActionContextType => {
  const context = useContext(LayoutActionContext);
  if (context === undefined) {
    throw new Error('useLayoutActions must be used within a LayoutActionProvider');
  }
  return context;
};