import { Profile } from './profile'; // Assuming a Profile type exists or will be created

export type WatchlistRole = 'owner' | 'editor' | 'viewer';

// Represents the core data of a watchlist
export interface Watchlist {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  card_color?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string | null;
  // Optional fields populated by joins/queries
  owner?: Profile; // Populated owner profile
  member_role?: WatchlistRole; // Role of the current user viewing the list
  is_favorite?: boolean; // If the current user favorited this list
  // movie_count?: number; // Could be added later
}

// Represents a member of a watchlist
export interface WatchlistMember {
  watchlist_id: string;
  user_id: string;
  role: WatchlistRole;
  added_at: string;
  profile?: Profile; // Populated member profile
}

// Represents a media item (movie or TV show) entry within a watchlist
export interface WatchlistItem {
    id: string; // PK of the watchlist_items entry (assuming table rename)
    watchlist_id: string;
    media_id: string; // e.g., 'tmdb:movie:123' or 'tmdb:tv:456'
    added_by_user_id: string;
    added_at: string;
    item_order?: number | null; // Renamed from movie_order
    // Optional: Could join media details here later
    // media_title?: string; // Generic title/name
    // media_poster_path?: string;
}

// Represents a user's favorite watchlist entry
export interface UserFavoriteWatchlist {
    user_id: string;
    watchlist_id: string;
    favorited_at: string;
}

// Represents a user's globally watched media entry
export interface UserWatchedMedia {
    user_id: string;
    media_id: string; // e.g., 'tmdb:movie:123' or 'tmdb:tv:456'
    watched_at: string;
}