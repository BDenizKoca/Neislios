import { useState, useCallback, useEffect } from 'react';
import { useWatchlistItems } from './useWatchlistItems'; // Remove unused WatchlistItemWithDetails

// Remove WatchlistWithItems interface if not used elsewhere, or keep if needed
// interface WatchlistWithItems {
//   id: string;
//   name: string;
//   items: any[]; // Consider using a more specific type like WatchlistItemWithDetails[]
// }

// Modify the hook to accept watchlistId
export const useWatchlistAI = (watchlistId: string | undefined) => {
  const [loadingCheck, setLoadingCheck] = useState(false); // Renamed loading state
  const [errorCheck, setErrorCheck] = useState<string | null>(null); // Renamed error state
  // const [currentWatchlist, setCurrentWatchlist] = useState<WatchlistWithItems | null>(null); // Remove if not needed

  // Use the items hook internally
  const { items, loading: itemsLoading, error: itemsError, refetch: refetchItems } = useWatchlistItems(watchlistId);

  // Update error state based on itemsError
  useEffect(() => {
    if (itemsError) {
      setErrorCheck(`Failed to load items for AI check: ${itemsError}`);
    } else {
      setErrorCheck(null); // Clear error if items load successfully
    }
  }, [itemsError]);

  const checkListEligibleForAI = useCallback(async (): Promise<boolean> => {
    // No separate fetching needed here, use the items state from the hook
    setLoadingCheck(true); // Indicate check is in progress
    setErrorCheck(null);    // Wait for initial loading of items if necessary, or rely on the hook's loading state
    // This check might be simplified depending on how the component uses the hook
    if (itemsLoading) {
      // Optionally wait or handle loading state
      // This might need a more robust way to handle async dependency if called before items load
    }    if (itemsError) {
      setErrorCheck(`Cannot check eligibility: ${itemsError}`);
      setLoadingCheck(false);
      return false;
    }

    try {       // Ensure items are loaded before checking length
       if (!itemsLoading && items) {
         const eligible = items.length >= 10;
         setLoadingCheck(false);
         return eligible;
       } else {
         // Handle case where items are still loading or haven't been fetched
         // This might indicate the check was called too early
         setLoadingCheck(false);
         return false; // Or throw an error, depending on desired behavior
       }

    } catch (error) {
      console.error('Error during AI eligibility check logic:', error);
      setErrorCheck('An unexpected error occurred during eligibility check.');
      setLoadingCheck(false);
      return false;
    }
  }, [items, itemsLoading, itemsError]); // Dependencies include items state and loading/error status

  // Return loading/error states specific to the check, and the check function itself
  // Also return items data if the consuming component needs it directly from this hook
  return {
    loading: loadingCheck || itemsLoading, // Combine loading states
    error: errorCheck || itemsError, // Combine error states
    items, // Expose items data
    checkListEligibleForAI,
    refetchItems // Expose refetch if needed
  };
};
