import { useState, useCallback, useEffect } from 'react';
import { useWatchlistItems } from './useWatchlistItems';
import { logger } from '../utils/logger';

export const useWatchlistAI = (watchlistId: string | undefined) => {
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [errorCheck, setErrorCheck] = useState<string | null>(null);

  const { items, loading: itemsLoading, error: itemsError, refetch: refetchItems } = useWatchlistItems(watchlistId);

  useEffect(() => {
    if (itemsError) {
      setErrorCheck(`Failed to load items for AI check: ${itemsError}`);
    } else {
      setErrorCheck(null);
    }
  }, [itemsError]);

  const checkListEligibleForAI = useCallback(async (): Promise<boolean> => {
    setLoadingCheck(true);
    setErrorCheck(null);

    if (itemsError) {
      setErrorCheck(`Cannot check eligibility: ${itemsError}`);
      setLoadingCheck(false);
      return false;
    }

    try {
      if (!itemsLoading && items) {
        const eligible = items.length >= 10;
        setLoadingCheck(false);
        return eligible;
      } else {
        setLoadingCheck(false);
        return false;
      }
    } catch (error) {
      logger.error('Error during AI eligibility check logic:', error);
      setErrorCheck('An unexpected error occurred during eligibility check.');
      setLoadingCheck(false);
      return false;
    }
  }, [items, itemsLoading, itemsError]);

  return {
    loading: loadingCheck || itemsLoading,
    error: errorCheck || itemsError,
    items,
    checkListEligibleForAI,
    refetchItems,
  };
};
