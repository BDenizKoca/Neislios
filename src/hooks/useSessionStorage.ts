import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface UseSessionStorageOptions<T> {
  key: string;
  defaultValue: T;
  expirationMs?: number; // Optional expiration time in milliseconds
}

interface StoredData<T> {
  value: T;
  timestamp: number;
}

export function useSessionStorage<T>({
  key,
  defaultValue,
  expirationMs
}: UseSessionStorageOptions<T>) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return defaultValue;

      const parsed: StoredData<T> = JSON.parse(item);
      
      // Check if expired
      if (expirationMs && Date.now() - parsed.timestamp > expirationMs) {
        sessionStorage.removeItem(key);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      logger.warn(`Error reading sessionStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      const dataToStore: StoredData<T> = {
        value: valueToStore,
        timestamp: Date.now()
      };

      sessionStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (error) {
      logger.error(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      logger.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Sync with sessionStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed: StoredData<T> = JSON.parse(e.newValue);
          
          // Check if expired
          if (expirationMs && Date.now() - parsed.timestamp > expirationMs) {
            sessionStorage.removeItem(key);
            setStoredValue(defaultValue);
            return;
          }

          setStoredValue(parsed.value);
        } catch (error) {
          logger.warn(`Error syncing sessionStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, defaultValue, expirationMs]);

  return [storedValue, setValue, removeValue] as const;
}
