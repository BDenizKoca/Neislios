// Centralized storage keys for consistent localStorage/sessionStorage usage
export const STORAGE_KEYS = {
  // Home page state
  ACTIVE_HOME_TAB: 'activeHomeTab',
  
  // Scroll positions
  SCROLL_POSITION: {
    MANAGE_LIST: 'manageListScrollPosition',
    WATCHLIST_DETAIL: 'watchlistDetailScrollPosition',
    MOVIE_SEARCH: 'searchPageScrollPosition',
  },
  
  // Search states
  SEARCH_TERM: {
    MANAGE_LIST: 'manageListSearchTerm',
  },
  
  // Modal states
  RECOMMENDATION_MODAL_OPEN: 'recommendation-modal-open',
} as const;

// Type-safe storage utility functions
export const storage = {
  session: {
    get: (key: string): string | null => sessionStorage.getItem(key),
    set: (key: string, value: string): void => sessionStorage.setItem(key, value),
    remove: (key: string): void => sessionStorage.removeItem(key),
  },
  local: {
    get: (key: string): string | null => localStorage.getItem(key),
    set: (key: string, value: string): void => localStorage.setItem(key, value),
    remove: (key: string): void => localStorage.removeItem(key),
  },
} as const;
