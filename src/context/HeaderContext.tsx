import React, { useState, useCallback } from 'react';
import { HeaderContext } from './HeaderContextDefinition';

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerTitle, setHeaderTitle] = useState<string>('Neislios'); // Default title

  const updateHeaderTitle = useCallback((title: string) => {
    setHeaderTitle(title);
  }, []);

  return (
    <HeaderContext.Provider value={{ headerTitle, setHeaderTitle: updateHeaderTitle }}>
      {children}
    </HeaderContext.Provider>
  );
};

// Removed useHeader hook (moved to src/hooks/useHeader.ts)