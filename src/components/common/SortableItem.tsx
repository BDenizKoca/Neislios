import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface SortableItemProps {
  id: string;
  children: (props: {
    attributes: DraggableAttributes;
    listeners: ReturnType<typeof useSortable>['listeners'];
    ref: (node: HTMLElement | null) => void;
    className: string;
    setCSSVars: (element: HTMLElement) => void;
  }) => React.ReactNode; // Use render prop pattern
}

export function SortableItem(props: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  // Function to set CSS custom properties
  const setCSSVars = (element: HTMLElement) => {
    if (element) {
      element.style.setProperty('--sortable-transform', CSS.Transform.toString(transform) || 'none');
      element.style.setProperty('--sortable-transition', transition || 'none');
    }
  };

  // Use CSS classes for static styles
  const className = `sortable-item ${isDragging ? 'dragging' : 'not-dragging'}`;

  // Pass down necessary props via render prop
  return props.children({ attributes, listeners, ref: setNodeRef, className, setCSSVars });
}