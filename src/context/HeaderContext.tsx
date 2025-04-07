import React, { createContext, useState, useContext, useCallback } from 'react';

interface HeaderContextType {
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

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

export const useHeader = (): HeaderContextType => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};