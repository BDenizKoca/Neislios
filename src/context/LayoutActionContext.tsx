import React, { useState, useCallback } from 'react';
import { LayoutActionContext } from './LayoutActionContextDefinition';

export const LayoutActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [triggerRandomPick, setTriggerRandomPick] = useState<(() => void) | null>(null);

  const registerRandomPickTrigger = useCallback((fn: (() => void) | null) => {
    setTriggerRandomPick(() => fn);
  }, []);

  return (
    <LayoutActionContext.Provider value={{ triggerRandomPick, registerRandomPickTrigger }}>
      {children}
    </LayoutActionContext.Provider>
  );
};