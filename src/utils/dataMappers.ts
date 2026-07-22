import { Profile } from '../types/profile';
import { Watchlist, WatchlistRole } from '../types/watchlist';

/**
 * Safely extracts a Profile object from joined Supabase response formats
 */
export function mapRawProfile(raw: unknown): Profile | undefined {
  if (!raw) return undefined;
  
  // Handle joined array format from Supabase
  const target = Array.isArray(raw) ? raw[0] : raw;
  if (!target || typeof target !== 'object') return undefined;

  const item = target as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return undefined;

  return {
    id: item.id,
    display_name: typeof item.display_name === 'string' ? item.display_name : 'Anonymous User',
    avatar_url: typeof item.avatar_url === 'string' ? item.avatar_url : undefined,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : undefined,
  };
}

/**
 * Safely extracts a Watchlist object from joined Supabase member queries
 */
export function mapRawWatchlist(
  m: Record<string, unknown>,
  favoriteIds: Set<string>,
  membersMap: Map<string, Profile[]>
): Watchlist | null {
  const rawWatchlist = Array.isArray(m.watchlist) ? m.watchlist[0] : m.watchlist;
  if (!rawWatchlist || typeof rawWatchlist !== 'object') return null;

  const item = rawWatchlist as Record<string, unknown>;
  if (typeof item.id !== 'string' || !item.id) return null;

  const ownerProfile = mapRawProfile(item.owner);
  const watchlistId = item.id;
  const watchlistMembers = membersMap.get(watchlistId) || [];

  return {
    id: watchlistId,
    owner_id: typeof item.owner_id === 'string' ? item.owner_id : '',
    title: typeof item.title === 'string' ? item.title : 'Untitled Watchlist',
    description: typeof item.description === 'string' ? item.description : null,
    card_color: typeof item.card_color === 'string' ? item.card_color : null,
    is_public: Boolean(item.is_public),
    created_at: typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : null,
    owner: ownerProfile,
    members: watchlistMembers,
    member_role: (typeof m.role === 'string' ? m.role : undefined) as WatchlistRole | undefined,
    is_favorite: favoriteIds.has(watchlistId),
  };
}
