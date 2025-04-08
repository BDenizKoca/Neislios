import { createContext } from 'react';

export interface HeaderContextType {
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
}

export const HeaderContext = createContext<HeaderContextType | undefined>(undefined);