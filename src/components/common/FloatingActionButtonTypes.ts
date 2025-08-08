import React from 'react';

export interface Position {
  right?: number;
  bottom?: number;
  left?: number;
  top?: number;
}

export interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  ariaLabel: string;
  position: Position;
  onPositionChange?: (position: Position) => void;
  isDraggable?: boolean;
  onDoubleClick?: () => void;
  onLongPress?: () => void;
  onDragEnd?: () => void;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
}
