import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WatchlistCard from './WatchlistCard';
import { Watchlist } from '../../types/watchlist';

interface SortableWatchlistCardProps {
  watchlist: Watchlist;
  onToggleFavorite: (watchlistId: string, isCurrentlyFavorite: boolean) => void;
  onEdit: (watchlistId: string) => void;
  onDelete?: (watchlistId: string) => Promise<void>;
}

const SortableWatchlistCard: React.FC<SortableWatchlistCardProps> = ({
  watchlist,
  onToggleFavorite,
  onEdit,
  onDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: watchlist.id });

  // Note: Inline styles are required here for dnd-kit drag functionality
  // These CSS custom properties are dynamically calculated during drag operations
  const dragStyle: React.CSSProperties = {
    '--transform': CSS.Transform.toString(transform),
    '--transition': transition,
    '--opacity': isDragging ? 0.8 : 1,
    '--z-index': isDragging ? 1000 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      /* Inline styles required for dnd-kit dynamic drag behavior */
      style={dragStyle}
      {...attributes}
      {...listeners}
      className={`sortable-watchlist-card touch-manipulation ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <WatchlistCard
        watchlist={watchlist}
        onToggleFavorite={onToggleFavorite}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
};

export default SortableWatchlistCard;
