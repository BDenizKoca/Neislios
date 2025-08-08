// Shared color palette for watchlist customization
export const WATCHLIST_COLOR_PALETTE = [
  '#ffffff', // White (Default)
  '#ef4444', // Red-500
  '#f97316', // Orange-500
  '#eab308', // Yellow-500
  '#84cc16', // Lime-500
  '#22c55e', // Green-500
  '#14b8a6', // Teal-500
  '#06b6d4', // Cyan-500
  '#3b82f6', // Blue-500
  '#6366f1', // Indigo-500
  '#8b5cf6', // Violet-500
  '#d946ef', // Fuchsia-500
  '#ec4899', // Pink-500
  '#78716c', // Stone-500
  '#737373', // Neutral-500
  '#1f2937', // Gray-800
] as const;

export type WatchlistColor = typeof WATCHLIST_COLOR_PALETTE[number];
