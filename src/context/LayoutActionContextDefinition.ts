import { createContext } from 'react';

export interface LayoutActionContextType {
  triggerRandomPick: (() => void) | null;
  registerRandomPickTrigger: (fn: (() => void) | null) => void;
}

export const LayoutActionContext = createContext<LayoutActionContextType | undefined>(undefined);